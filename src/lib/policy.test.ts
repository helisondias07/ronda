import { describe, expect, it } from "vitest";
import { assertNotPaid, assertReportOnly, isForbiddenMutation, isPaymentCompletePath } from "./policy";

describe("policy", () => {
  it("blocks checkout complete paths", () => {
    expect(isPaymentCompletePath("/checkout/complete")).toBe(true);
    expect(isPaymentCompletePath("/checkout/confirmation")).toBe(true);
    expect(isPaymentCompletePath("/checkout")).toBe(false);
    expect(isForbiddenMutation("checkoutComplete")).toBe(true);
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
