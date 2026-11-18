import dns from "node:dns";
import http from "node:http";
import net from "node:net";
import { closeServer } from "./resource-cleanup";
import { isForbiddenIpAddress } from "./ssrf";
import {
  evaluateSafeCheckoutRequest,
  isForbiddenPaymentHost,
  isHostAllowedByManifest,
  type StoreTargetManifest,
} from "./store-manifest";

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type DnsResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type PinVerdict =
  | { ok: true; ip: string; family: 4 | 6 }
  | { ok: false; reason: "payment-domain-blocked" | "unlisted-host" | "ip-literal-forbidden" | "dns-failed" | "forbidden-ip" };

export const systemDnsResolver: DnsResolver = async (hostname: string) => {
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return records
    .filter((rec): rec is { address: string; family: 4 | 6 } => rec.family === 4 || rec.family === 6)
    .map((rec) => ({ address: rec.address, family: rec.family }));
};

export async function resolveAndPinPublicIp(
  rawHostname: string,
  manifest: StoreTargetManifest,
  resolver: DnsResolver = systemDnsResolver,
): Promise<PinVerdict> {
  const hostname = rawHostname.trim().replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || net.isIP(hostname) !== 0) {
    return { ok: false, reason: "ip-literal-forbidden" };
  }
  if (isForbiddenPaymentHost(hostname)) {
    return { ok: false, reason: "payment-domain-blocked" };
  }
  if (!isHostAllowedByManifest(hostname, manifest)) {
    return { ok: false, reason: "unlisted-host" };
  }

  let records: ResolvedAddress[];
  try {
    records = await resolver(hostname);
  } catch {
    return { ok: false, reason: "dns-failed" };
  }
  if (!records.length) {
    return { ok: false, reason: "dns-failed" };
  }
  // Todos os registros A/AAAA precisam ser públicos; um único registro privado caracteriza tentativa de rebinding/split-DNS.
  for (const record of records) {
    if (isForbiddenIpAddress(record.address)) {
      return { ok: false, reason: "forbidden-ip" };
    }
  }
  return { ok: true, ip: records[0].address, family: records[0].family };
}

export function chromiumProxyLaunchArgs(proxyUrl: string): string[] {
  return [
    `--proxy-server=${proxyUrl}`,
    "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1",
    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
  ];
}

export type ProxyAuditEvent = {
  method: string;
  target: string;
  allowed: boolean;
  pinnedIp?: string;
  reason?: string;
};

export type PinnedEgressProxy = {
  proxyUrl: string;
  port: number;
  events: ProxyAuditEvent[];
  close: () => Promise<void>;
};

export function startPinnedEgressProxy(opts: {
  manifest: StoreTargetManifest;
  resolver?: DnsResolver;
  /** Exclusivo para suítes automatizadas de proxy sem TLS externo; nunca ativado na CLI. */
  allowHttpForTest?: boolean;
  /** Exclusivo para testes de túnel TCP local: redireciona o socket pinado para um servidor mock local após validar o IP público retornado pelo resolver. */
  connectOverrideForTest?: (pinned: { ip: string; family: 4 | 6; port: number; hostname: string }) => { host: string; port: number };
}): Promise<PinnedEgressProxy> {
  const resolver = opts.resolver || systemDnsResolver;
  const events: ProxyAuditEvent[] = [];

  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const rawUrl = req.url || "";
      if (!opts.allowHttpForTest) {
        events.push({ method: req.method || "GET", target: rawUrl, allowed: false, reason: "https-connect-only" });
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        res.end("CheckoutGuard proxy: plain HTTP forbidden; use HTTPS CONNECT.");
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        events.push({ method: req.method || "GET", target: rawUrl, allowed: false, reason: "invalid-url" });
        res.writeHead(400).end("invalid url");
        return;
      }

      const httpsEquivalent = `https://${parsed.hostname}${parsed.pathname}${parsed.search}`;
      const bodyChunks: Buffer[] = [];
      for await (const chunk of req) {
        bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const postData = bodyChunks.length ? Buffer.concat(bodyChunks).toString("utf8") : "";

      const safeCheck = evaluateSafeCheckoutRequest({
        manifest: opts.manifest,
        requestUrl: httpsEquivalent,
        method: req.method || "GET",
        postData,
      });
      if (!safeCheck.ok) {
        events.push({ method: req.method || "GET", target: rawUrl, allowed: false, reason: safeCheck.reason });
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Blocked by Safe-Checkout: ${safeCheck.reason}`);
        return;
      }

      const pin = await resolveAndPinPublicIp(parsed.hostname, opts.manifest, resolver);
      if (!pin.ok) {
        events.push({ method: req.method || "GET", target: rawUrl, allowed: false, reason: pin.reason });
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Blocked by DNS/IP pinning: ${pin.reason}`);
        return;
      }

      const targetPort = parsed.port ? Number(parsed.port) : 80;
      const endpoint = opts.connectOverrideForTest
        ? opts.connectOverrideForTest({ ip: pin.ip, family: pin.family, port: targetPort, hostname: parsed.hostname })
        : { host: pin.ip, port: targetPort };

      events.push({ method: req.method || "GET", target: rawUrl, allowed: true, pinnedIp: pin.ip });

      const upstream = http.request(
        {
          host: endpoint.host,
          port: endpoint.port,
          method: req.method,
          path: `${parsed.pathname}${parsed.search}`,
          headers: {
            ...req.headers,
            host: parsed.host,
            connection: "close",
          },
          timeout: 8_000,
        },
        (upRes) => {
          const status = upRes.statusCode || 502;
          if (status >= 300 && status < 400) {
            events.push({ method: "REDIRECT", target: upRes.headers.location || rawUrl, allowed: false, reason: "redirect-blocked" });
            res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
            res.end("Redirect blocked by CheckoutGuard pinned proxy");
            upRes.resume();
            return;
          }
          res.writeHead(status, upRes.headers);
          upRes.pipe(res);
        },
      );
      upstream.on("error", () => {
        if (!res.headersSent) res.writeHead(502).end("upstream connection error");
      });
      if (bodyChunks.length) upstream.write(Buffer.concat(bodyChunks));
      upstream.end();
    });

    server.on("connect", async (req, clientSocket, head) => {
      const authority = req.url || "";
      const sep = authority.lastIndexOf(":");
      const hostname = sep > 0 ? authority.slice(0, sep) : authority;
      const port = sep > 0 ? Number(authority.slice(sep + 1)) : 443;

      if (port !== 443 && !opts.connectOverrideForTest) {
        events.push({ method: "CONNECT", target: authority, allowed: false, reason: "non-443-port-blocked" });
        clientSocket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        clientSocket.destroy();
        return;
      }

      const pin = await resolveAndPinPublicIp(hostname, opts.manifest, resolver);
      if (!pin.ok) {
        events.push({ method: "CONNECT", target: authority, allowed: false, reason: pin.reason });
        clientSocket.write(`HTTP/1.1 403 Forbidden\r\nX-CheckoutGuard-Block: ${pin.reason}\r\nConnection: close\r\n\r\n`);
        clientSocket.destroy();
        return;
      }

      const endpoint = opts.connectOverrideForTest
        ? opts.connectOverrideForTest({ ip: pin.ip, family: pin.family, port, hostname })
        : { host: pin.ip, port };

      events.push({ method: "CONNECT", target: authority, allowed: true, pinnedIp: pin.ip });

      const upstreamSocket = net.connect({ host: endpoint.host, port: endpoint.port }, () => {
        clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length > 0) upstreamSocket.write(head);
        upstreamSocket.pipe(clientSocket);
        clientSocket.pipe(upstreamSocket);
      });
      upstreamSocket.setTimeout(15_000, () => upstreamSocket.destroy());
      (clientSocket as net.Socket).setTimeout?.(15_000, () => clientSocket.destroy());
      upstreamSocket.on("error", () => {
        if (!clientSocket.destroyed) {
          clientSocket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
          clientSocket.destroy();
        }
      });
      clientSocket.on("error", () => upstreamSocket.destroy());
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        proxyUrl: `http://127.0.0.1:${port}`,
        port,
        events,
        close: () => closeServer(server),
      });
    });
  });
}
