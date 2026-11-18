import { parseStoreManifest } from "./store-manifest";
import type { Target } from "./types";

export function resolveTarget(opts: {
  baseUrl?: string;
  manifest?: unknown;
}): Extract<Target, { kind: "fixture" | "authorized-manifest" }> {
  if (!opts.baseUrl && opts.manifest === undefined) {
    return { kind: "fixture" };
  }
  if (opts.manifest === undefined) {
    throw new Error(
      "por seguranca, a execucao sem --manifest esta limitada ao fixture local; --base-url solto esta desativado",
    );
  }
  const parsed = parseStoreManifest(opts.manifest);
  if (!parsed.ok) {
    throw new Error(`política: manifesto inválido — ${parsed.message}`);
  }
  if (opts.baseUrl) {
    let candidateOrigin: string;
    try {
      const u = new URL(opts.baseUrl);
      if (u.username || u.password || u.pathname !== "/" || u.search || u.hash) {
        throw new Error("base-url deve conter apenas o origin HTTPS raiz");
      }
      candidateOrigin = u.origin;
    } catch {
      throw new Error("política: --base-url inválido para o manifesto autorizado");
    }
    if (candidateOrigin !== parsed.manifest.primaryOrigin) {
      throw new Error("política: --base-url diverge do primaryOrigin do manifesto autorizado");
    }
  }
  return {
    kind: "authorized-manifest",
    url: parsed.manifest.primaryOrigin,
    manifest: parsed.manifest,
  };
}
