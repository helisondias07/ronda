import { describe, expect, it } from "vitest";
import { finalizeReport, isPassing, renderHtml } from "./report";
import type { Report, StepResult } from "./types";

function step(partial: Partial<StepResult> & Pick<StepResult, "id">): StepResult {
  return {
    url: "http://127.0.0.1/x",
    pass: true,
    stopped_before_payment: partial.id === "checkout",
    ...partial,
  };
}

describe("report", () => {
  it("passes the default 5-step fixture when checkout stops", () => {
    const report: Report = {
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: true,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "teste" },
      auth: { available: false, reason: "teste" },
      steps: [
        step({ id: "home" }),
        step({ id: "categoria" }),
        step({ id: "produto" }),
        step({ id: "carrinho" }),
        step({ id: "checkout", stopped_before_payment: true }),
      ],
    };
    expect(isPassing(finalizeReport(report))).toBe(true);
  });

  it("passes a shorter configurable journey that still stops before payment", () => {
    const report: Report = {
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: true,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "teste" },
      auth: { available: false, reason: "teste" },
      journey: {
        name: "curta",
        source: "journey.json",
        startPath: "/home.html",
        stepIds: ["home", "checkout"],
        stopBeforePayment: true,
      },
      steps: [step({ id: "home" }), step({ id: "checkout", stopped_before_payment: true })],
    };
    const done = finalizeReport(report);
    expect(isPassing(done)).toBe(true);
    expect(done.steps).toHaveLength(2);
    expect(renderHtml(done)).toMatch(/Jornada: curta/);
    expect(renderHtml(done)).toMatch(/home → checkout/);
  });

  it("attaches a suggestion without apply", () => {
    const report: Report = {
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: false,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "teste" },
      auth: { available: false, reason: "teste" },
      steps: [
        step({
          id: "produto",
          pass: false,
          error: '{"status_code":500,"message":"The function `currency` was not found"}',
        }),
      ],
    };
    const done = finalizeReport(report);
    expect(done.steps[0].suggestion?.apply).toBe(false);
    expect(done.steps[0].suggestion?.kind).toBe("hypothesis");
    expect(done.steps[0].suggestion?.hypothesis).toMatch(/Scriban/);
    expect(isPassing(done)).toBe(false);
  });

  it("renders HTML without claiming a paid order", () => {
    const html = renderHtml({
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: true,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "sem Figma neste teste" },
      auth: { available: false, reason: "sem login neste teste" },
      steps: [step({ id: "checkout", screenshot: "out/checkout.png" })],
    });
    expect(html).toMatch(/parado antes do pagamento/);
    expect(html).toMatch(/não altera a loja/);
    expect(html).toMatch(/hipótese/i);
    expect(html).not.toMatch(/pedido concluído/);
    expect(html).not.toMatch(/comparação com Figma/);
  });

  it("renderiza o PNG de diff com src relativo, não caminho absoluto", () => {
    const html = renderHtml({
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: true,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "sem Figma neste teste" },
      auth: { available: false, reason: "sem login neste teste" },
      steps: [step({ id: "home" })],
      visual: [
        {
          source: "user-png",
          figma: false,
          step: "home",
          viewport: { width: 8, height: 8 },
          reference: { path: "C:\\tmp\\ref.png", width: 8, height: 8 },
          actual: { path: "C:\\tmp\\actual.png", width: 8, height: 8 },
          mismatchRatio: 0.5,
          diffPixels: 32,
          diffPath: "C:\\Users\\HelisonDias\\Repositorios\\ronda\\ronda-out\\diff-home.png",
          pass: false,
          hypothesis: "pixels diferentes",
          apply: false,
        },
      ],
    });
    expect(html).toMatch(/<img class="diff" src="diff-home.png"/);
    expect(html).not.toMatch(/src="C:\\Users/);
    expect(html).toMatch(/figma: false/);
  });

  it("renderiza visual parcial sem reference.width como indisponível", () => {
    const html = renderHtml({
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: true,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "sem Figma neste teste" },
      auth: { available: false, reason: "sem login neste teste" },
      steps: [step({ id: "home" })],
      visual: [
        {
          source: "user-png",
          figma: false,
          step: "home",
          viewport: {},
          reference: {},
          actual: {},
          pass: false,
          hypothesis: "JSON incompleto",
          apply: false,
          missing: ["reference.width"],
        },
      ],
    });
    expect(html).toMatch(/indisponível/);
    expect(html).toMatch(/Campo ausente: reference\.width/);
  });

  it("inclui alertas HTML básicos no relatório sem alegar auditoria completa", () => {
    const html = renderHtml({
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      stopped_before_payment: true,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "indisponível" },
      auth: { available: false, reason: "indisponível" },
      steps: [step({ id: "home" })],
      pages: [{
        url: "http://127.0.0.1/home.html", status: 200, title: "Home", h1: "Loja", pass: true,
        accessibility: { scope: "static-html-heuristic", findings: ["Imagem 1: falta atributo alt."] },
      }],
    });
    expect(html).toMatch(/Checagem HTML básica \(heurística parcial\)/);
    expect(html).toMatch(/Imagem 1: falta atributo alt/);
    expect(html).not.toMatch(/WCAG completa/i);
  });
});
