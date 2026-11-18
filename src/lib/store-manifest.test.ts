import http from "node:http";
import net from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { closeServer } from "./resource-cleanup";
import { detectScribanError } from "./scriban";
import {
  auditSafeCheckoutDom,
  clickSafeStoreControl,
  evaluateSafeCheckoutRequest,
  installSafeCheckoutGuard,
  isCardIframeDescriptor,
  isForbiddenCheckoutPath,
  isForbiddenFinalizeControl,
  isForbiddenPaymentHost,
  parseStoreManifest,
  teardownSafeCheckoutCart,
  type StoreTargetManifest,
} from "./store-manifest";
import { chromiumProxyLaunchArgs, resolveAndPinPublicIp, startPinnedEgressProxy } from "./pinned-proxy";

const WAKE_MANIFEST_RAW = {
  version: 1 as const,
  store: "fiturban-homolog",
  platform: "wake" as const,
  primaryOrigin: "https://www.fiturban.com.br",
  allowedSubdomains: ["checkout.fiturban.com.br", "*.checkout.fbits.store"],
  allowedStaticCdns: ["*.fbitsstatic.net"],
  authorizedBy: "Helison Dias",
  authorizedAt: "2026-11-18T10:00:00Z",
  stopBeforePayment: true as const,
};

const NUVEM_MANIFEST_RAW = {
  version: 1 as const,
  store: "yamuna-homolog",
  platform: "nuvemshop" as const,
  primaryOrigin: "https://www.yamuna.com.br",
  allowedSubdomains: ["checkout.yamuna.com.br"],
  allowedStaticCdns: ["*.mitiendanube.com", "d2r9epyceweg5n.cloudfront.net"],
  authorizedBy: "Helison Dias",
  authorizedAt: "2026-11-18T10:00:00Z",
  stopBeforePayment: true as const,
};

function mustManifest(raw: unknown): StoreTargetManifest {
  const parsed = parseStoreManifest(raw);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.manifest;
}

describe("StoreTargetManifest & Safe-Checkout rules", () => {
  it("accepts valid Wake and Nuvemshop manifests and rejects unsafe origins or payment gateways", () => {
    const wake = parseStoreManifest(WAKE_MANIFEST_RAW);
    expect(wake.ok).toBe(true);
    const nuvem = parseStoreManifest(NUVEM_MANIFEST_RAW);
    expect(nuvem.ok).toBe(true);

    expect(parseStoreManifest({ ...WAKE_MANIFEST_RAW, stopBeforePayment: false }).ok).toBe(false);
    expect(parseStoreManifest({ ...WAKE_MANIFEST_RAW, primaryOrigin: "http://www.fiturban.com.br" }).ok).toBe(false);
    expect(parseStoreManifest({ ...WAKE_MANIFEST_RAW, primaryOrigin: "https://127.0.0.1" }).ok).toBe(false);
    expect(parseStoreManifest({ ...WAKE_MANIFEST_RAW, primaryOrigin: "https://api.mercadopago.com" }).ok).toBe(false);
    expect(parseStoreManifest({ ...WAKE_MANIFEST_RAW, allowedStaticCdns: ["*.stripe.com"] }).ok).toBe(false);
    expect(parseStoreManifest({ ...WAKE_MANIFEST_RAW, allowedSubdomains: ["*.com.br"] }).ok).toBe(false);
    expect(
      parseStoreManifest({
        ...NUVEM_MANIFEST_RAW,
        journey: { checkoutPath: "/checkout/v3/success/123" },
      }).ok,
    ).toBe(false);
  });

  it("enforces Wake Safe-Checkout: allows storefront/cart/shipping and blocks checkoutComplete & card payloads", () => {
    const manifest = mustManifest(WAKE_MANIFEST_RAW);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.fiturban.com.br/tenis/p",
        method: "GET",
      }),
    ).toEqual({ ok: true, hostRole: "primary" });

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://cdn1.fbitsstatic.net/img/p/tenis.webp",
        method: "GET",
        resourceType: "image",
      }),
    ).toEqual({ ok: true, hostRole: "cdn" });

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://cdn1.fbitsstatic.net/hack",
        method: "POST",
      }).ok,
    ).toBe(false);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.fiturban.com.br/graphql",
        method: "POST",
        postData: JSON.stringify({
          operationName: "checkoutProductAdd",
          query: "mutation checkoutProductAdd($id: Uuid!) { checkoutProductAdd(checkoutId: $id) { checkoutId } }",
        }),
      }).ok,
    ).toBe(true);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.fiturban.com.br/graphql",
        method: "POST",
        postData: JSON.stringify({
          operationName: "shippingQuotes",
          query: "query shippingQuotes { shippingQuotes(cep: \"01310100\") { value } }",
        }),
      }).ok,
    ).toBe(true);

    for (const forbiddenBody of [
      JSON.stringify({ query: "mutation { checkoutComplete(checkoutId: \"1\") { orderId } }" }),
      JSON.stringify({ query: "mutation { checkoutPaymentAssociate { ok } }" }),
      JSON.stringify({ query: "mutation { customUnknownMutation { ok } }" }),
      JSON.stringify({ query: "mutation checkoutProductAdd { ok }", cardNumber: "4111111111111111" }),
    ]) {
      expect(
        evaluateSafeCheckoutRequest({
          manifest,
          requestUrl: "https://www.fiturban.com.br/graphql",
          method: "POST",
          postData: forbiddenBody,
        }).ok,
        forbiddenBody,
      ).toBe(false);
    }

    expect(isForbiddenCheckoutPath("/checkout/confirmation", "wake")).toBe(true);
    expect(isForbiddenCheckoutPath("/checkout/complete", "wake")).toBe(true);
    expect(isForbiddenPaymentHost("js.stripe.com")).toBe(true);
    expect(isForbiddenPaymentHost("api.mercadopago.com")).toBe(true);
  });

  it("enforces Nuvemshop Safe-Checkout: allows /comprar & /checkout/v3/next GET and blocks /checkout/v3/* POST & /checkout/v3/success/", () => {
    const manifest = mustManifest(NUVEM_MANIFEST_RAW);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.yamuna.com.br/comprar",
        method: "POST",
        postData: "product_id=123&quantity=1",
      }).ok,
    ).toBe(true);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.yamuna.com.br/checkout/v3/next/tok_abc",
        method: "GET",
      }).ok,
    ).toBe(true);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.yamuna.com.br/checkout/v3/next/tok_abc",
        method: "POST",
        postData: "step=payment",
      }).ok,
    ).toBe(false);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://www.yamuna.com.br/checkout/v3/success/tok_abc",
        method: "GET",
      }).ok,
    ).toBe(false);

    expect(
      evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: "https://secure.pagonube.com/v1/tokens",
        method: "POST",
      }).ok,
    ).toBe(false);

    expect(isForbiddenFinalizeControl("Finalizar compra")).toBe(true);
    expect(isForbiddenFinalizeControl("Concluir pedido")).toBe(true);
    expect(isForbiddenFinalizeControl("Pagar agora")).toBe(true);
    expect(isForbiddenFinalizeControl("Place Order")).toBe(true);
    expect(isForbiddenFinalizeControl("Adicionar ao carrinho")).toBe(false);
    expect(isCardIframeDescriptor({ src: "https://js.stripe.com/v3/elements-inner-card.html" })).toBe(true);
    expect(isCardIframeDescriptor({ name: "mercadopago-card-number" })).toBe(true);
    expect(isCardIframeDescriptor({ title: "Mapa da loja", src: "https://www.yamuna.com.br/mapa" })).toBe(false);
  });
});

describe("PinnedEgressProxy (DNS/IP pinning & anti-rebinding)", () => {
  it("pins public IPs, blocks private/IMDS/CGNAT/IPv6-mapped IPs, and stops DNS rebinding on 2nd hop", async () => {
    const manifest = mustManifest(WAKE_MANIFEST_RAW);
    let lookupCount = 0;
    const rebindingResolver = async () => {
      lookupCount += 1;
      // 1ª resolução devolve IP público válido; 2ª tenta rebinding para IMDS 169.254.169.254
      return lookupCount === 1
        ? [{ address: "93.184.216.34", family: 4 as const }]
        : [{ address: "169.254.169.254", family: 4 as const }];
    };

    const first = await resolveAndPinPublicIp("www.fiturban.com.br", manifest, rebindingResolver);
    expect(first).toEqual({ ok: true, ip: "93.184.216.34", family: 4 });

    const second = await resolveAndPinPublicIp("www.fiturban.com.br", manifest, rebindingResolver);
    expect(second).toEqual({ ok: false, reason: "forbidden-ip" });

    // Split-DNS / múltiplos registros misturando IP público e loopback deve falhar imediatamente
    const hybrid = await resolveAndPinPublicIp("www.fiturban.com.br", manifest, async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    expect(hybrid).toEqual({ ok: false, reason: "forbidden-ip" });

    expect(chromiumProxyLaunchArgs("http://127.0.0.1:9999")).toContain(
      "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1",
    );
  });

  it("tunnels authorized CONNECT to pinned socket while rejecting plain HTTP, payment hosts, and rebinding", async () => {
    const manifest = mustManifest(WAKE_MANIFEST_RAW);
    const echoServer = net.createServer((socket) => {
      socket.once("data", (chunk) => {
        socket.write(`PINNED-ECHO:${chunk.toString("utf8")}`);
        socket.end();
      });
    });
    await new Promise<void>((r) => echoServer.listen(0, "127.0.0.1", r));
    const echoPort = (echoServer.address() as net.AddressInfo).port;

    let flipToPrivate = false;
    const pinnedTargetsSeen: string[] = [];
    const proxy = await startPinnedEgressProxy({
      manifest,
      resolver: async () =>
        flipToPrivate
          ? [{ address: "::ffff:127.0.0.1", family: 6 }]
          : [{ address: "93.184.216.34", family: 4 }],
      connectOverrideForTest: (pinned) => {
        pinnedTargetsSeen.push(`${pinned.hostname}->${pinned.ip}:${pinned.port}`);
        return { host: "127.0.0.1", port: echoPort };
      },
    });

    try {
      // 1. Plain HTTP deve ser recusado por padrão
      const plainRes = await new Promise<number>((resolve, reject) => {
        const req = http.request(
          {
            host: "127.0.0.1",
            port: proxy.port,
            method: "GET",
            path: "http://www.fiturban.com.br/",
          },
          (res) => {
            res.resume();
            resolve(res.statusCode || 0);
          },
        );
        req.on("error", reject);
        req.end();
      });
      expect(plainRes).toBe(403);

      // 2. CONNECT autorizado com IP público pinado funciona ponta a ponta
      const tunnelPayload = await new Promise<string>((resolve, reject) => {
        const req = http.request({
          host: "127.0.0.1",
          port: proxy.port,
          method: "CONNECT",
          path: "www.fiturban.com.br:443",
        });
        req.on("connect", (res, socket) => {
          expect(res.statusCode).toBe(200);
          let out = "";
          socket.on("data", (d) => (out += d.toString("utf8")));
          socket.on("end", () => resolve(out));
          socket.write("HELLO-TLS");
        });
        req.on("error", reject);
        req.end();
      });
      expect(tunnelPayload).toBe("PINNED-ECHO:HELLO-TLS");
      expect(pinnedTargetsSeen).toEqual(["www.fiturban.com.br->93.184.216.34:443"]);

      // 3. CONNECT para gateway de pagamento é bloqueado
      const paymentStatus = await new Promise<number>((resolve, reject) => {
        const req = http.request({
          host: "127.0.0.1",
          port: proxy.port,
          method: "CONNECT",
          path: "api.mercadopago.com:443",
        });
        req.on("connect", (res, socket) => {
          socket.destroy();
          resolve(res.statusCode || 0);
        });
        req.on("error", reject);
        req.end();
      });
      expect(paymentStatus).toBe(403);

      // 4. DNS Rebinding na 2ª conexão (IP vira ::ffff:127.0.0.1) é bloqueado
      flipToPrivate = true;
      const rebindStatus = await new Promise<number>((resolve, reject) => {
        const req = http.request({
          host: "127.0.0.1",
          port: proxy.port,
          method: "CONNECT",
          path: "www.fiturban.com.br:443",
        });
        req.on("connect", (res, socket) => {
          socket.destroy();
          resolve(res.statusCode || 0);
        });
        req.on("error", reject);
        req.end();
      });
      expect(rebindStatus).toBe(403);
    } finally {
      await proxy.close();
      await new Promise<void>((r) => echoServer.close(() => r()));
    }
  });
});

describe("Playwright E2E Safe-Checkout Adapters (Wake & Nuvemshop)", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  it("runs Wake/Fbits SSR journey through PDP, cart, shipping quote, stops before payment, blocks checkoutComplete/Stripe iframe, detects Scriban 500, and cleans cart", async () => {
    const manifest = mustManifest(WAKE_MANIFEST_RAW);
    let cartItems = 0;
    let completedOrders = 0;

    const wakeServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      const body = Buffer.concat(chunks).toString("utf8");

      if (req.method === "POST" && url.pathname === "/graphql") {
        if (body.includes("checkoutComplete")) {
          completedOrders += 1;
          res.writeHead(200, { "content-type": "application/json" }).end('{"data":{"checkoutComplete":{"orderId":"999"}}}');
          return;
        }
        if (body.includes("checkoutProductAdd")) {
          cartItems += 1;
          res.writeHead(200, { "content-type": "application/json" }).end('{"data":{"checkoutProductAdd":{"checkoutId":"chk-1"}}}');
          return;
        }
        if (body.includes("shippingQuotes")) {
          res.writeHead(200, { "content-type": "application/json" }).end('{"data":{"shippingQuotes":[{"name":"SEDEX","value":19.9}]}}');
          return;
        }
        if (body.includes("checkoutClean")) {
          cartItems = 0;
          res.writeHead(200, { "content-type": "application/json" }).end('{"data":{"checkoutClean":{"checkoutId":"chk-1"}}}');
          return;
        }
      }

      if (url.pathname === "/erro-scriban") {
        // Armadilha clássica Wake: HTTP 200 devolvendo erro 500 Scriban em JSON
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end('{"status_code":500,"message":"The function currency was not found"}');
        return;
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      if (url.pathname === "/") {
        res.end('<!doctype html><html><body><h1>Vitrine Wake</h1><a href="/tenis/p">Ver Tênis</a></body></html>');
      } else if (url.pathname === "/tenis/p") {
        res.end(`<!doctype html><html><body>
          <h1>Tênis Performance</h1>
          <button type="button" onclick="fetch('/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName:'checkoutProductAdd',query:'mutation checkoutProductAdd { checkoutProductAdd { checkoutId } }'})}).then(()=>fetch('/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName:'shippingQuotes',query:'query shippingQuotes { shippingQuotes { value } }'})})).then(()=>{window.location.href='/carrinho'})">Adicionar ao carrinho</button>
        </body></html>`);
      } else if (url.pathname === "/carrinho") {
        res.end('<!doctype html><html><body><h1>Seu Carrinho</h1><a href="/checkout">Ir para o checkout</a></body></html>');
      } else if (url.pathname === "/checkout") {
        res.end(`<!doctype html><html><body>
          <h1>Identificação e Pagamento</h1>
          <input name="cc-number" autocomplete="cc-number" value="" />
          <iframe title="Campos do cartão" src="https://js.stripe.com/v3/elements-inner-card.html"></iframe>
          <button type="button" onclick="fetch('/graphql',{method:'POST',body:JSON.stringify({query:'mutation { checkoutComplete { orderId } }'})})">Finalizar compra</button>
        </body></html>`);
      } else {
        res.end("ok");
      }
    });

    await new Promise<void>((r) => wakeServer.listen(0, "127.0.0.1", r));
    const localOrigin = `http://127.0.0.1:${(wakeServer.address() as net.AddressInfo).port}`;

    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      const telemetry = await installSafeCheckoutGuard(context, manifest, {
        testLocalOriginMap: { [localOrigin]: manifest.primaryOrigin },
      });
      await context.addCookies([{ name: "fbits_cart", value: "session-1", url: localOrigin }]);
      const page = await context.newPage();

      await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded" });
      await clickSafeStoreControl(page, { role: "link", name: "Ver Tênis" }, manifest);
      await page.waitForURL(`${localOrigin}/tenis/p`);

      await clickSafeStoreControl(page, { role: "button", name: "Adicionar ao carrinho" }, manifest);
      await page.waitForURL(`${localOrigin}/carrinho`);
      expect(cartItems).toBe(1);

      await clickSafeStoreControl(page, { role: "link", name: "Ir para o checkout" }, manifest);
      await page.waitForURL(`${localOrigin}/checkout`);

      // Confere bloqueio de clique no botão Finalizar compra
      await expect(clickSafeStoreControl(page, { role: "button", name: "Finalizar compra" }, manifest)).rejects.toThrow(
        /Safe-Checkout/,
      );

      // Mesmo se o JS da página disparar checkoutComplete diretamente, o guard de rede bloqueia
      const blockedMutation = await page.evaluate(async () => {
        try {
          await fetch("/graphql", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ query: "mutation { checkoutComplete { orderId } }" }),
          });
          return false;
        } catch {
          return true;
        }
      });
      expect(blockedMutation).toBe(true);
      expect(completedOrders).toBe(0);

      const domSafety = await auditSafeCheckoutDom(page);
      expect(domSafety.cardInputsFilled).toBe(0);
      expect(domSafety.detectedCardIframes).toBe(1);
      expect(domSafety.detectedFinalizeControls).toBe(1);
      expect(telemetry.blockedRequests.some((r) => r.url.includes("js.stripe.com"))).toBe(true);
      expect(telemetry.blockedRequests.some((r) => r.reason === "payment-mutation-blocked")).toBe(true);

      // Confere detecção de erro 500 Scriban camuflado em HTTP 200
      await page.goto(`${localOrigin}/erro-scriban`, { waitUntil: "domcontentloaded" });
      const scriban = detectScribanError(await page.innerText("body"));
      expect(scriban.ok).toBe(false);

      // Teardown limpa carrinho no servidor e apaga cookies
      await page.goto(`${localOrigin}/`, { waitUntil: "domcontentloaded" });
      const teardown = await teardownSafeCheckoutCart({
        context,
        page,
        manifest,
        effectiveOrigin: localOrigin,
      });
      expect(teardown.cleaned).toBe(true);
      expect(cartItems).toBe(0);
      expect(await context.cookies()).toHaveLength(0);
    } finally {
      await context.close();
      await closeServer(wakeServer);
    }
  });

  it("runs Nuvemshop journey through /comprar and /checkout/v3/next GET while blocking /checkout/v3/* POST, /checkout/v3/success/ and cleaning cart", async () => {
    const manifest = mustManifest(NUVEM_MANIFEST_RAW);
    let cartItems = 0;
    let checkoutPosts = 0;
    let successHits = 0;

    const nuvemServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "POST" && url.pathname === "/comprar") {
        cartItems += 1;
        res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
        return;
      }
      if (req.method === "POST" && url.pathname === "/cart/clear") {
        cartItems = 0;
        res.writeHead(200, { "content-type": "application/json" }).end('{"cleared":true}');
        return;
      }
      if (req.method === "POST" && url.pathname.startsWith("/checkout/v3/")) {
        checkoutPosts += 1;
        res.writeHead(200).end("paid");
        return;
      }
      if (url.pathname.startsWith("/checkout/v3/success")) {
        successHits += 1;
        res.writeHead(200).end("order success");
        return;
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      if (url.pathname === "/produtos/serum") {
        res.end(`<!doctype html><html><body>
          <h1>Sérum Facial</h1>
          <button type="button" onclick="fetch('/comprar',{method:'POST',body:'id=1'}).then(()=>{window.location.href='/checkout/v3/next/sess_1'})">Adicionar ao carrinho</button>
        </body></html>`);
      } else if (url.pathname === "/checkout/v3/next/sess_1") {
        res.end(`<!doctype html><html><body>
          <h1>Checkout Nuvemshop</h1>
          <iframe name="pagonube-card" src="https://secure.pagonube.com/card.html"></iframe>
          <a href="/checkout/v3/success/sess_1">Pagar agora</a>
        </body></html>`);
      } else {
        res.end("<!doctype html><html><body><h1>Home Nuvemshop</h1></body></html>");
      }
    });

    await new Promise<void>((r) => nuvemServer.listen(0, "127.0.0.1", r));
    const localOrigin = `http://127.0.0.1:${(nuvemServer.address() as net.AddressInfo).port}`;

    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      const telemetry = await installSafeCheckoutGuard(context, manifest, {
        testLocalOriginMap: { [localOrigin]: manifest.primaryOrigin },
      });
      const page = await context.newPage();

      await page.goto(`${localOrigin}/produtos/serum`, { waitUntil: "domcontentloaded" });
      await clickSafeStoreControl(page, { role: "button", name: "Adicionar ao carrinho" }, manifest);
      await page.waitForURL(`${localOrigin}/checkout/v3/next/sess_1`);
      expect(cartItems).toBe(1);

      // Botão/link "Pagar agora" para /checkout/v3/success é bloqueado
      await expect(clickSafeStoreControl(page, { role: "link", name: "Pagar agora" }, manifest)).rejects.toThrow(
        /Safe-Checkout/,
      );

      // Tentativa direta de POST em /checkout/v3/next é bloqueada na rede
      const postBlocked = await page.evaluate(async () => {
        try {
          await fetch("/checkout/v3/next/sess_1", { method: "POST", body: "pay=1" });
          return false;
        } catch {
          return true;
        }
      });
      expect(postBlocked).toBe(true);
      expect(checkoutPosts).toBe(0);
      expect(successHits).toBe(0);
      expect(telemetry.blockedRequests.some((r) => r.url.includes("pagonube.com"))).toBe(true);

      await teardownSafeCheckoutCart({ context, page, manifest, effectiveOrigin: localOrigin });
      expect(cartItems).toBe(0);
    } finally {
      await context.close();
      await closeServer(nuvemServer);
    }
  });
});
