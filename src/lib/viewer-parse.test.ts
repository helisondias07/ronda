import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeScreenshot, parseReport } from "./viewer-parse";

describe("parseReport", () => {
  it("accepts incomplete JSON and fills suggestion plus console", () => {
    const raw = JSON.stringify({
      steps: [
        {
          id: "produto",
          url: "http://127.0.0.1/produto.html",
          pass: false,
          stopped_before_payment: false,
          error: '{"status_code":500,"message":"The function `currency` was not found"}',
        },
      ],
      consoleErrors: ["Uncaught TypeError: addToCart is not a function"],
    });
    const parsed = parseReport(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.detects_everything).toBe(false);
    expect(parsed.report.consoleErrors).toEqual([
      "Uncaught TypeError: addToCart is not a function",
    ]);
    expect(parsed.report.steps[0].suggestion?.apply).toBe(false);
    expect(parsed.report.steps[0].suggestion?.hypothesis).toMatch(/Scriban/);
  });

  it("rejects empty object", () => {
    const parsed = parseReport("{}");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/etapas/);
  });
});

describe("describeScreenshot", () => {
  it("does not treat a disk path as a hosted image", () => {
    const local = describeScreenshot("C:\\\\Users\\\\me\\\\ronda-out\\\\checkout.png");
    expect(local.kind).toBe("local");
    expect(local.src).toBeUndefined();
    expect(local.label).toMatch(/checkout\.png/);
    expect(describeScreenshot(undefined).kind).toBe("missing");
    expect(describeScreenshot("data:image/png;base64,aaa").kind).toBe("embedded");
    expect(describeScreenshot("https://example.com/print.png").label).toMatch(/não busca URL/);
  });
});

describe("playground publicado", () => {
  it("copia o HTML para public/", () => {
    const file = join(process.cwd(), "public", "playground-estados.html");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toMatch(/playground/i);
  });
});
