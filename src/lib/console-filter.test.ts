import { describe, expect, it } from "vitest";
import { filterConsole } from "./console-filter";

describe("filterConsole", () => {
  it("drops GTM noise and keeps first-party", () => {
    const out = filterConsole(
      [
        "Failed to load https://www.googletagmanager.com/gtm.js",
        "Uncaught TypeError: addToCart is not a function",
      ],
      "127.0.0.1",
    );
    expect(out).toEqual(["Uncaught TypeError: addToCart is not a function"]);
  });

  it("masks email and sk- tokens", () => {
    const out = filterConsole(["fail user@loja.example token sk-abcdefghijk"], "127.0.0.1");
    expect(out[0]).toContain("***@***");
    expect(out[0]).toContain("sk-…");
    expect(out[0]).not.toContain("user@loja.example");
  });
});
