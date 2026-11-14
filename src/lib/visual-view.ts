import type { VisualCompare } from "./types";

const UNAVAILABLE = "indisponível";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function box(raw: unknown): { path?: string; width?: number; height?: number } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  return {
    path: typeof rec.path === "string" ? rec.path : undefined,
    width: isFiniteNumber(rec.width) ? rec.width : undefined,
    height: isFiniteNumber(rec.height) ? rec.height : undefined,
  };
}

export function dimLabel(value: unknown): string {
  return isFiniteNumber(value) ? String(value) : UNAVAILABLE;
}

export function asVisual(raw: unknown): VisualCompare {
  const rec = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const viewport = box(rec.viewport);
  const reference = box(rec.reference);
  const actual = box(rec.actual);
  const missing: string[] = [];
  if (!rec.reference || typeof rec.reference !== "object" || Array.isArray(rec.reference)) {
    missing.push("reference");
  }
  if (!isFiniteNumber(reference.width)) missing.push("reference.width");
  if (!isFiniteNumber(reference.height)) missing.push("reference.height");
  if (!isFiniteNumber(actual.width)) missing.push("actual.width");
  if (!isFiniteNumber(actual.height)) missing.push("actual.height");
  if (!isFiniteNumber(viewport.width)) missing.push("viewport.width");
  if (!isFiniteNumber(viewport.height)) missing.push("viewport.height");
  const step = typeof rec.step === "string" && rec.step ? rec.step : "etapa-nao-identificada";
  if (typeof rec.step !== "string" || !rec.step) missing.push("step");
  const hypothesis =
    typeof rec.hypothesis === "string" && rec.hypothesis
      ? rec.hypothesis
      : "campo hypothesis indisponível neste JSON";
  return {
    source: "user-png",
    figma: false,
    step,
    viewport: { width: viewport.width, height: viewport.height },
    reference,
    actual,
    mismatchRatio: isFiniteNumber(rec.mismatchRatio) ? rec.mismatchRatio : undefined,
    diffPixels: isFiniteNumber(rec.diffPixels) ? rec.diffPixels : undefined,
    diffPath: typeof rec.diffPath === "string" ? rec.diffPath : undefined,
    pass: Boolean(rec.pass),
    hypothesis,
    apply: false,
    missing: missing.length ? missing : undefined,
  };
}

export function formatVisualSummary(v: VisualCompare): string {
  const verdict = v.pass ? "ok" : "diferiu";
  const ratio =
    v.mismatchRatio != null && Number.isFinite(v.mismatchRatio)
      ? ` (${(v.mismatchRatio * 100).toFixed(2)}%)`
      : "";
  return `${v.step} · viewport ${dimLabel(v.viewport.width)}×${dimLabel(v.viewport.height)} · captura ${dimLabel(v.actual.width)}×${dimLabel(v.actual.height)} · ref ${dimLabel(v.reference.width)}×${dimLabel(v.reference.height)} — ${verdict}${ratio}`;
}
