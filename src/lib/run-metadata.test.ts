import { describe, expect, it } from "vitest";
import { renderHtml } from "./report";
import { parseReport } from "./viewer-parse";

const run = {
  id: "cda8cc3a-516a-4c52-96df-60bf77c001b9",
  startedAt: "2026-11-14T12:00:00.000Z",
  finishedAt: "2026-11-14T12:00:05.000Z",
  durationMs: 5000,
  fixtureSha256: "a".repeat(64),
};

describe("procedência local da execução", () => {
  it("preserves valid metadata in the JSON viewer", () => {
    const parsed = parseReport(JSON.stringify({
      run,
      steps: [{ id: "home", pass: true, stopped_before_payment: false }],
    }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.report.run).toEqual(run);
  });

  it("ignores invalid metadata without rejecting an otherwise readable report", () => {
    const parsed = parseReport(JSON.stringify({
      run: { ...run, durationMs: -1 },
      steps: [{ id: "home", pass: true, stopped_before_payment: false }],
    }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.report.run).toBeUndefined();
  });

  it("preserves valid fixture fingerprints and ignores malformed values", () => {
    const valid = parseReport(JSON.stringify({ run, steps: [{ id: "home", pass: true, stopped_before_payment: false }] }));
    expect(valid.ok && valid.report.run?.fixtureSha256).toBe(run.fixtureSha256);
    const invalid = parseReport(JSON.stringify({ run: { ...run, fixtureSha256: "../secret" }, steps: [{ id: "home", pass: true, stopped_before_payment: false }] }));
    expect(invalid.ok && invalid.report.run?.fixtureSha256).toBeUndefined();
  });

  it("shows only the run id, UTC times, and duration in generated HTML", () => {
    const html = renderHtml({
      store: "fixture-demo-qa",
      platform: "wake-mock",
      target: "fixture",
      steps: [{ id: "home", url: "fixture", pass: true, stopped_before_payment: false }],
      stopped_before_payment: false,
      consoleErrors: [],
      detects_everything: false,
      links: [],
      institutional: [],
      figma: { available: false, reason: "skip" },
      auth: { available: false, reason: "skip" },
      run,
    });
    expect(html).toContain(run.id);
    expect(html).toContain(`${run.startedAt} UTC`);
    expect(html).toContain(`${run.finishedAt} UTC`);
    expect(html).toContain("5000 ms");
    expect(html).toContain(run.fixtureSha256);
  });
});
