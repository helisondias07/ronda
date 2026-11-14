import { describe, expect, it } from "vitest";
import { resolveTarget } from "./allowlist";

describe("resolveTarget", () => {
  it("defaults to fixture", () => {
    expect(resolveTarget({})).toEqual({ kind: "fixture" });
  });

  it("requires explicit authorization for a target", () => {
    expect(() => resolveTarget({ baseUrl: "https://example.com" })).toThrow(/fixture/);
  });

  it("accepts literal IPv4 and IPv6 loopback when authorized", () => {
    expect(resolveTarget({ baseUrl: "http://127.0.0.1:5000", authorize: true })).toEqual({
      kind: "authorized-local", url: "http://127.0.0.1:5000",
    });
    expect(resolveTarget({ baseUrl: "http://[::1]:5000", authorize: true })).toEqual({
      kind: "authorized-local", url: "http://[::1]:5000",
    });
  });

  it("refuses DNS names to prevent rebinding", () => {
    expect(() => resolveTarget({ baseUrl: "https://public-rebind.example", authorize: true })).toThrow(/DNS/);
    expect(() => resolveTarget({ baseUrl: "http://localhost:5000", authorize: true })).toThrow(/DNS/);
  });

  it("refuses credentials and non-root paths", () => {
    expect(() => resolveTarget({ baseUrl: "http://user:pass@127.0.0.1:5000", authorize: true })).toThrow(/credenciais/);
    expect(() => resolveTarget({ baseUrl: "http://127.0.0.1:5000/other", authorize: true })).toThrow(/alvo remoto/);
  });

  it("refuses all remote hosts", () => {
    expect(() => resolveTarget({ baseUrl: "https://loja-cliente.example", authorize: true })).toThrow(/DNS/);
  });
});