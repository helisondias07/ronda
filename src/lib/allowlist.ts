import type { Target } from "./types";

const LOOPBACK = new Set(["127.0.0.1", "[::1]"]);

export function resolveTarget(opts: { baseUrl?: string; authorize?: boolean }): Target {
  if (!opts.baseUrl) return { kind: "fixture" };
  if (!opts.authorize) {
    throw new Error("sem --autorizo-este-ambiente a Ronda só roda o fixture local");
  }
  let url: URL;
  try {
    url = new URL(opts.baseUrl);
  } catch {
    throw new Error("URL do alvo inválida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL do alvo precisa ser http(s)");
  }
  if (url.username || url.password) {
    throw new Error("URL do alvo não pode conter credenciais");
  }
  if (LOOPBACK.has(url.hostname) && url.pathname === "/" && !url.search && !url.hash) {
    return { kind: "authorized-local", url: url.origin };
  }
  throw new Error("alvo remoto e nomes DNS estão bloqueados; use fixture ou loopback literal 127.0.0.1 / [::1]");
}
