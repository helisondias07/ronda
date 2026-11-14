import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeScreenshot,
  formatConsoleEntry,
  formatSuggestion,
  normalizeConsoleErrors,
  parseReport,
} from "./viewer-parse";

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

  it("mostra suggestion.text no topo e não esconde objeto desconhecido", () => {
    const parsed = parseReport(
      JSON.stringify({
        suggestion: { text: "Hipótese no topo: currency ausente no tema." },
        steps: [
          {
            id: "produto",
            url: "http://127.0.0.1/produto.html",
            pass: false,
            stopped_before_payment: false,
            suggestion: { text: "texto da etapa produto" },
          },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.suggestionText).toBe("Hipótese no topo: currency ausente no tema.");
    expect(parsed.report.steps[0].suggestion?.hypothesis).toBe("texto da etapa produto");
    const unknown = parseReport(
      JSON.stringify({
        suggestion: { foo: 1, extra: "keep" },
        steps: [{ id: "home", pass: true, stopped_before_payment: false }],
      }),
    );
    expect(unknown.ok).toBe(true);
    if (!unknown.ok) return;
    expect(unknown.report.suggestionText).toMatch(/"foo":1/);
    expect(unknown.report.suggestionText).not.toMatch(/\[object Object\]/);
  });

  it("aceita consoleErrors [{message}] e serializa formato não reconhecido", () => {
    const parsed = parseReport(
      JSON.stringify({
        steps: [{ id: "home", pass: true, stopped_before_payment: false }],
        consoleErrors: [
          { message: "Uncaught TypeError: addToCart is not a function" },
          { code: 12, extra: true },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.consoleErrors[0]).toBe("Uncaught TypeError: addToCart is not a function");
    expect(parsed.report.consoleErrors[1]).toMatch(/"code":12/);
    expect(parsed.report.consoleErrors.join("\n")).not.toMatch(/\[object Object\]/);
  });
});

describe("formatos de suggestion e console", () => {
  it("lê text, hypothesis, string e JSON residual", () => {
    expect(formatSuggestion({ text: "no topo" })).toBe("no topo");
    expect(formatSuggestion({ hypothesis: "hipótese" })).toBe("hipótese");
    expect(formatSuggestion("solto")).toBe("solto");
    expect(formatSuggestion({ unknown: true })).toBe('{"unknown":true}');
  });

  it("normaliza string, {message} e valor solto", () => {
    expect(formatConsoleEntry({ message: "boom" })).toBe("boom");
    expect(normalizeConsoleErrors({ message: "um só" })).toEqual(["um só"]);
    expect(normalizeConsoleErrors(["a", { text: "b" }])).toEqual(["a", "b"]);
    expect(formatConsoleEntry({ stack: "x" })).toBe('{"stack":"x"}');
    expect(formatConsoleEntry({ message: "ok" })).not.toBe("[object Object]");
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
