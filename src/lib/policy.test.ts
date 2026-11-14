import { describe, expect, it } from "vitest";
import { assertNotPaid, assertReportOnly, isAllowedBrowserRequest, isForbiddenMutation, isPaymentCompletePath } from "./policy";

describe("policy", () => {
  it("blocks checkout complete paths", () => {
    expect(isPaymentCompletePath("/checkout/complete")).toBe(true);
    expect(isPaymentCompletePath("/checkout/confirmation")).toBe(true);
    expect(isPaymentCompletePath("/checkout")).toBe(false);
    expect(isForbiddenMutation("checkoutComplete")).toBe(true);
  });

  it("browser only allows same-origin GETs and blocks order completion", () => {
    const origin = "http://127.0.0.1:4173";
    expect(isAllowedBrowserRequest({ requestUrl: `${origin}/home.html`, origin, method: "GET" })).toBe(true);
    expect(isAllowedBrowserRequest({ requestUrl: "http://169.254.169.254/latest", origin, method: "GET" })).toBe(false);
    expect(isAllowedBrowserRequest({ requestUrl: `${origin}/checkout/complete`, origin, method: "GET" })).toBe(false);
    expect(isAllowedBrowserRequest({ requestUrl: `${origin}/api/cart`, origin, method: "POST" })).toBe(false);
  });

  it("rejects non-HTTP schemes, different origins and redirected destinations", () => {
    const origin = "http://127.0.0.1:4173";
    for (const requestUrl of [
      "file:///etc/passwd",
      "data:text/html,example",
      "http://127.0.0.1:4174/private",
      "http://[::1]:4173/home.html",
      "http://[fc00::1]:4173/private",
      "http://[fe80::1]:4173/private",
      "http://[::ffff:127.0.0.1]:4173/private",
      "http://[::ffff:169.254.169.254]:4173/private",
      "http://169.254.169.254/latest/meta-data",
      "http://public-rebind.example:4173/private",
      "https://outside.invalid/after-redirect",
    ]) {
      expect(isAllowedBrowserRequest({ requestUrl, origin, method: "GET" }), requestUrl).toBe(false);
    }
  });

  it("throws if card was filled", () => {
    expect(() =>
      assertNotPaid({ pathname: "/checkout", cardValue: "4111", mutations: [] }),
    ).toThrow(/cartão/);
  });

  it("throws if theme was written", () => {
    expect(() => assertReportOnly(true)).toThrow(/só relata/);
    expect(() => assertReportOnly(false)).not.toThrow();
  });
});
