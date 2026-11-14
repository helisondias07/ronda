import { describe, expect, it } from "vitest";
import { checkoutHints, FIXTURE_JOURNEY } from "./wake";

describe("wake adapter", () => {
  it("has five fixture steps and stops at payment", () => {
    expect(FIXTURE_JOURNEY.map((s) => s.id)).toEqual([
      "home",
      "categoria",
      "produto",
      "carrinho",
      "checkout",
    ]);
    expect(FIXTURE_JOURNEY.at(-1)?.stop).toBe(true);
  });

  it("reads checkout routes from pages.json without treating complete as success", () => {
    const hints = checkoutHints({
      pages: [
        { urlMatch: "checkout" },
        { urlMatch: "checkout/complete" },
        { urlMatch: "checkout/confirmation" },
      ],
    });
    expect(hints.checkout).toBe(true);
    expect(hints.completeForbidden).toBe(true);
  });
});
