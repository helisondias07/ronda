import { describe, expect, it } from "vitest";
import { resolveTarget } from "./allowlist";

describe("resolveTarget", () => {
  it("defaults to fixture", () => {
    expect(resolveTarget({})).toEqual({ kind: "fixture" });
  });

  it("refuses a remote URL without authorization", () => {
    expect(() => resolveTarget({ baseUrl: "https://example.com" })).toThrow(/fixture/);
  });

  it("accepts localhost when authorized", () => {
    expect(
      resolveTarget({ baseUrl: "http://127.0.0.1:5000", authorize: true }),
    ).toEqual({ kind: "authorized-local", url: "http://127.0.0.1:5000" });
  });

  it("refuses client production even with authorize unless allow-host matches", () => {
    expect(() =>
      resolveTarget({ baseUrl: "https://loja-cliente.example", authorize: true }),
    ).toThrow(/produção de cliente/);
  });
});
