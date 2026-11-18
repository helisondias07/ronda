import { describe, expect, it } from "vitest";
import { resolveTarget } from "./allowlist";

const VALID_MANIFEST = {
  version: 1,
  store: "loja-piloto",
  platform: "wake",
  primaryOrigin: "https://www.lojapiloto.com.br",
  allowedSubdomains: ["checkout.lojapiloto.com.br"],
  allowedStaticCdns: ["*.fbitsstatic.net"],
  authorizedBy: "Agência Piloto",
  authorizedAt: "2026-11-18T10:00:00Z",
  stopBeforePayment: true,
};

describe("resolveTarget", () => {
  it("defaults to fixture", () => {
    expect(resolveTarget({})).toEqual({ kind: "fixture" });
  });

  it("refuses arbitrary targets without a validated StoreTargetManifest", () => {
    expect(() => resolveTarget({ baseUrl: "https://example.com" })).toThrow(/fixture/);
    for (const baseUrl of [
      "http://127.0.0.1:5000",
      "http://[::1]:5000",
      "http://localhost:5000",
      "https://loja-cliente.example",
    ]) {
      expect(() => resolveTarget({ baseUrl })).toThrow(/fixture local/);
    }
  });

  it("unlocks authorized-manifest only when StoreTargetManifest is valid and matches --base-url", () => {
    const target = resolveTarget({
      baseUrl: "https://www.lojapiloto.com.br",
      manifest: VALID_MANIFEST,
    });
    expect(target.kind).toBe("authorized-manifest");
    if (target.kind === "authorized-manifest") {
      expect(target.url).toBe("https://www.lojapiloto.com.br");
      expect(target.manifest.platform).toBe("wake");
    }

    expect(() =>
      resolveTarget({
        baseUrl: "https://outra-loja.com.br",
        manifest: VALID_MANIFEST,
      }),
    ).toThrow(/diverge/);
  });
});
