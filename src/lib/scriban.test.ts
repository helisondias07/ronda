import { describe, expect, it } from "vitest";
import { detectScribanError } from "./scriban";

describe("detectScribanError", () => {
  it("flags JSON 500 even when HTTP would be 200", () => {
    const body = JSON.stringify({
      status_code: 500,
      message: "The function `currency` was not found",
    });
    expect(detectScribanError(body)).toEqual({
      ok: false,
      message: "The function `currency` was not found",
    });
  });

  it("accepts real HTML", () => {
    expect(detectScribanError("<html><h1>Loja Demo QA</h1></html>").ok).toBe(true);
  });
});
