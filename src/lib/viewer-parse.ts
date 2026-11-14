import { finalizeReport } from "./report";
import type { Report, StepId, StepResult } from "./types";

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return String(value);
  try {
    const json = JSON.stringify(value);
    if (json && json !== "{}") return json;
  } catch {
    /* cyclic or similar */
  }
  return Object.prototype.toString.call(value);
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return undefined;
}

/** Lê suggestion.text / hypothesis / string; objetos desconhecidos viram JSON, nunca [object Object]. */
export function formatSuggestion(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return stringifyUnknown(value);
  if (typeof value === "object") {
    const known = pickString(value as Record<string, unknown>, ["text", "hypothesis", "message"]);
    return known || stringifyUnknown(value);
  }
  return stringifyUnknown(value);
}

export function formatConsoleEntry(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return String(value);
  if (typeof value === "object") {
    const known = pickString(value as Record<string, unknown>, ["message", "text", "error", "msg"]);
    return known || stringifyUnknown(value);
  }
  return stringifyUnknown(value);
}

export function normalizeConsoleErrors(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(formatConsoleEntry);
  return [formatConsoleEntry(value)];
}

function asStep(raw: unknown): StepResult {
  const rec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pasted = formatSuggestion(rec.suggestion);
  const id = (typeof rec.id === "string" ? rec.id : "home") as StepId;
  return {
    id,
    url: typeof rec.url === "string" ? rec.url : "",
    pass: Boolean(rec.pass),
    screenshot: typeof rec.screenshot === "string" ? rec.screenshot : undefined,
    stopped_before_payment: Boolean(rec.stopped_before_payment),
    error: typeof rec.error === "string" ? rec.error : rec.error != null ? stringifyUnknown(rec.error) : undefined,
    suggestion: pasted ? { step: id, hypothesis: pasted, apply: false } : undefined,
  };
}

export function parseReport(raw: string): { ok: true; report: Report } | { ok: false; message: string } {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || !Array.isArray(data.steps) || data.steps.length === 0) {
      return { ok: false, message: "JSON sem a lista de etapas. Cole o report.json gerado no seu PC." };
    }
    const rawSteps = data.steps as unknown[];
    const steps = rawSteps.map(asStep);
    const finalized = finalizeReport({
      store: typeof data.store === "string" && data.store ? data.store : "laudo colado",
      platform: data.platform === "wake" ? "wake" : "wake-mock",
      target: data.target === "authorized-local" ? "authorized-local" : "fixture",
      steps,
      stopped_before_payment: Boolean(data.stopped_before_payment),
      consoleErrors: normalizeConsoleErrors(data.consoleErrors),
      error: typeof data.error === "string" ? data.error : undefined,
      detects_everything: false,
      links: Array.isArray(data.links) ? (data.links as Report["links"]) : [],
      institutional: Array.isArray(data.institutional)
        ? (data.institutional as Report["institutional"])
        : [],
      figma: (data.figma as Report["figma"]) || {
        available: false,
        reason: "sem FIGMA_TOKEN nem spec local. Não fingimos comparação com Figma.",
      },
      auth: (data.auth as Report["auth"]) || {
        available: false,
        reason:
          "sem conta de teste no Vault. A Ronda não cria cadastro, não preenche senha e não automatiza CAPTCHA/SMS/social.",
      },
    });
    const stepsWithPasted = finalized.steps.map((step, i) => {
      const pasted = formatSuggestion(
        rawSteps[i] && typeof rawSteps[i] === "object"
          ? (rawSteps[i] as { suggestion?: unknown }).suggestion
          : undefined,
      );
      if (!pasted) return step;
      return { ...step, suggestion: { step: step.id, hypothesis: pasted, apply: false as const } };
    });
    return {
      ok: true,
      report: {
        ...finalized,
        steps: stepsWithPasted,
        suggestionText: formatSuggestion(data.suggestion),
      },
    };
  } catch {
    return { ok: false, message: "JSON inválido. Cole o report.json gerado no seu computador." };
  }
}

export function describeScreenshot(value?: string): {
  kind: "missing" | "local" | "embedded";
  label: string;
  src?: string;
} {
  if (!value) {
    return { kind: "missing", label: "print faltando — não há foto neste visor" };
  }
  if (value.startsWith("data:image/")) {
    return { kind: "embedded", label: "print embutido no JSON", src: value };
  }
  if (/^https?:\/\//i.test(value) || value.startsWith("file:")) {
    return { kind: "local", label: "print remoto ignorado — este visor não busca URL" };
  }
  const file = value.replace(/\\/g, "/").split("/").pop() || value;
  return {
    kind: "local",
    label: `${file} — arquivo no seu PC; este site não publica a foto`,
  };
}
