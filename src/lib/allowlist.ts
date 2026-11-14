import type { Target } from "./types";

const LOCAL = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function resolveTarget(opts: {
  baseUrl?: string;
  authorize?: boolean;
  allowHost?: string;
}): Target {
  if (!opts.baseUrl) return { kind: "fixture" };
  if (!opts.authorize) {
    throw new Error("sem --autorizo-este-ambiente a Ronda só corre o fixture local");
  }
  const url = new URL(opts.baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL do alvo precisa ser http(s)");
  }
  if (LOCAL.has(url.hostname)) {
    return { kind: "authorized-local", url: url.origin };
  }
  const allow = (opts.allowHost || "").toLowerCase();
  if (allow && url.hostname.toLowerCase() === allow) {
    return { kind: "authorized-local", url: url.origin };
  }
  throw new Error(
    "produção de cliente não é alvo do MVP; use fixture, localhost ou RONDA_ALLOW_HOST com autorização",
  );
}
