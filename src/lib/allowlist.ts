import type { Target } from "./types";

export function resolveTarget(opts: { baseUrl?: string }): Extract<Target, { kind: "fixture" }> {
  if (opts.baseUrl) {
    throw new Error("por seguranca, a execucao esta limitada ao fixture local; --base-url esta desativado");
  }
  return { kind: "fixture" };
}
