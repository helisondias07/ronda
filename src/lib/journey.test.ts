import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultJourney, parseJourneyFile } from "./journey";

describe("parseJourneyFile", () => {
  it("aceita o journey.json do fixture demo", () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "fixture", "journey.json"), "utf8"));
    const parsed = parseJourneyFile(raw, "fixture/journey.json");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.journey.steps).toHaveLength(5);
    expect(parsed.journey.steps.at(-1)?.stop).toBe(true);
    expect(parsed.journey.stopBeforePayment).toBe(true);
    expect(defaultJourney().steps.map((s) => s.id)).toEqual(parsed.journey.steps.map((s) => s.id));
  });

  it("recusa pagamento, clique de pedido e startPath remoto", () => {
    expect(parseJourneyFile({ stopBeforePayment: false, steps: [{ id: "home", heading: "x", stop: true }] }).ok).toBe(
      false,
    );
    expect(
      parseJourneyFile({
        steps: [{ id: "checkout", heading: "Pagar", click: "Finalizar pedido", stop: true }],
      }).ok,
    ).toBe(false);
    expect(
      parseJourneyFile({
        startPath: "https://loja.example/home.html",
        steps: [{ id: "home", heading: "x", stop: true }],
      }).ok,
    ).toBe(false);
    expect(parseJourneyFile({ steps: [{ id: "home", heading: "x" }] }).ok).toBe(false);
  });

  it("recusa ids que escapariam da pasta de evidências e etapas duplicadas", () => {
    expect(parseJourneyFile({ steps: [{ id: "../../outside", heading: "x", stop: true }] }).ok).toBe(false);
    expect(parseJourneyFile({ steps: [{ id: "..\\..\\outside", heading: "x", stop: true }] }).ok).toBe(false);
    expect(parseJourneyFile({ steps: [
      { id: "home", heading: "x" },
      { id: "HOME", heading: "y", stop: true },
    ] }).ok).toBe(false);
  });

  it("aceita jornada curta de duas etapas com stop", () => {
    const parsed = parseJourneyFile({
      name: "curta",
      steps: [
        { id: "home", heading: "Loja Demo QA" },
        { id: "checkout", heading: "Forma de pagamento", click: "Ir ao checkout", stop: true },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.journey.steps).toHaveLength(2);
  });
});
