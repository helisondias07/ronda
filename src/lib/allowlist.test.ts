import { describe, expect, it } from "vitest";
import { resolveTarget } from "./allowlist";

describe("resolveTarget", () => {
  it("defaults to fixture", () => {
    expect(resolveTarget({})).toEqual({ kind: "fixture" });
  });

  it("refuses arbitrary targets even when a loopback authorization flag is present", () => {
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
});
