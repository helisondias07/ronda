import { finalizeReport } from "./report";
import type { JourneyAction, PageFacts, Report, StepId, StepResult } from "./types";
import { asVisual } from "./visual-view";

export const KNOWN_STEP_IDS: StepId[] = ["home", "categoria", "produto", "carrinho", "checkout"];
const UNLABELED_STEP_ID = "etapa-nao-identificada";

export function stepLabel(step: Pick<StepResult, "id" | "formatWarning">): string {
  if (!step.id || step.id === UNLABELED_STEP_ID) return "etapa não identificada";
  return step.id;
}

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

function asRun(value: unknown): Report["run"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const run = value as Record<string, unknown>;
  const id = typeof run.id === "string" && run.id.length <= 128 ? run.id : undefined;
  const startedAt = typeof run.startedAt === "string" ? run.startedAt : undefined;
  const finishedAt = typeof run.finishedAt === "string" ? run.finishedAt : undefined;
  const durationMs = typeof run.durationMs === "number" ? run.durationMs : NaN;
  const fixtureSha256 = typeof run.fixtureSha256 === "string" && /^[a-f0-9]{64}$/.test(run.fixtureSha256)
    ? run.fixtureSha256
    : undefined;
  const cartCleaned = typeof run.cartCleaned === "boolean" ? run.cartCleaned : undefined;
  if (!id || !startedAt || !finishedAt || !Number.isFinite(Date.parse(startedAt)) || !Number.isFinite(Date.parse(finishedAt)) || !Number.isFinite(durationMs) || durationMs < 0) {
    return undefined;
  }
  return {
    id,
    startedAt,
    finishedAt,
    durationMs,
    ...(fixtureSha256 ? { fixtureSha256 } : {}),
    ...(cartCleaned !== undefined ? { cartCleaned } : {}),
  };
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

function asJourney(raw: unknown): Report["journey"] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  if (rec.stopBeforePayment === false) return undefined;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  const source = typeof rec.source === "string" ? rec.source.trim() : "pasted";
  const startPath = typeof rec.startPath === "string" ? rec.startPath.trim() : "";
  const stepIds = Array.isArray(rec.stepIds)
    ? rec.stepIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  if (!name || stepIds.length === 0) return undefined;
  const rawActions = Array.isArray(rec.actions) ? rec.actions : undefined;
  const actions = rawActions?.flatMap((item): JourneyAction[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const action = item as Record<string, unknown>;
    if (typeof action.id !== "string" || !action.id.trim()) return [];
    return [{
      id: action.id,
      heading: typeof action.heading === "string" ? action.heading : "etapa não identificada",
      click: typeof action.click === "string" ? action.click : undefined,
      clickRole: typeof action.clickRole === "string" ? action.clickRole : undefined,
      stop: action.stop === true,
    }];
  });
  const invalidActions = rawActions ? rawActions.length - (actions?.length || 0) : 0;
  return {
    name,
    source: source || "pasted",
    startPath: startPath || "/",
    stepIds,
    actions,
    actionWarnings: invalidActions ? [`${invalidActions} ação(ões) da jornada não foram reconhecidas.`] : undefined,
    stopBeforePayment: true,
  };
}

function asPageFacts(raw: unknown): PageFacts | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.url !== "string") return undefined;
  const accessibility = rec.accessibility && typeof rec.accessibility === "object" && !Array.isArray(rec.accessibility)
    ? (rec.accessibility as Record<string, unknown>)
    : undefined;
  const suggestionText = formatSuggestion(rec.suggestion);
  return {
    url: rec.url,
    status: typeof rec.status === "number" ? rec.status : undefined,
    title: typeof rec.title === "string" ? rec.title : "",
    h1: typeof rec.h1 === "string" ? rec.h1 : "",
    pass: rec.pass === true,
    suggestion: suggestionText ? { step: "pagina", hypothesis: suggestionText, apply: false } : undefined,
    accessibility:
      accessibility?.scope === "static-html-heuristic" && Array.isArray(accessibility.findings)
        ? {
            scope: "static-html-heuristic",
            findings: accessibility.findings.filter((entry): entry is string => typeof entry === "string"),
          }
        : undefined,
  };
}

function asStep(raw: unknown): StepResult {
  const rec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pasted = formatSuggestion(rec.suggestion);
  const rawId = typeof rec.id === "string" ? rec.id.trim() : "";
  let id: string;
  let formatWarning: string | undefined;
  if (!rawId) {
    id = UNLABELED_STEP_ID;
    formatWarning = "formato não reconhecido: etapa sem id";
  } else {
    id = rawId;
  }
  return {
    id,
    url: typeof rec.url === "string" ? rec.url : "",
    pass: Boolean(rec.pass),
    screenshot: typeof rec.screenshot === "string" ? rec.screenshot : undefined,
    shotEvidence:
      rec.shotEvidence && typeof rec.shotEvidence === "object"
        ? (rec.shotEvidence as StepResult["shotEvidence"])
        : undefined,
    stopped_before_payment: Boolean(rec.stopped_before_payment),
    error: typeof rec.error === "string" ? rec.error : rec.error != null ? stringifyUnknown(rec.error) : undefined,
    suggestion: pasted ? { step: id, hypothesis: pasted, apply: false } : undefined,
    formatWarning,
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
      platform:
        data.platform === "wake" || data.platform === "nuvemshop" || data.platform === "shopify" || data.platform === "vtex"
          ? data.platform
          : "wake-mock",
      target:
        data.target === "authorized-local" || data.target === "authorized-manifest"
          ? data.target
          : "fixture",
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
          "sem conta de teste no Vault. O CheckoutGuard não cria cadastro, não preenche senha e não automatiza CAPTCHA/SMS/social.",
      },
      pages: Array.isArray(data.pages) ? data.pages.map(asPageFacts).filter((page): page is PageFacts => Boolean(page)) : [],
      visual: Array.isArray(data.visual) ? data.visual.map(asVisual) : [],
      journey: asJourney(data.journey),
      run: asRun(data.run),
      isolation: {
        hostedFetch: false,
        methods:
          data.isolation && typeof data.isolation === "object" && (data.isolation as { methods?: unknown }).methods === "SAFE-CHECKOUT"
            ? "SAFE-CHECKOUT"
            : "GET",
        figmaFaked: false,
        payment: false,
      },
    });
    const stepsWithPasted = finalized.steps.map((step, i) => {
      const pasted = formatSuggestion(
        rawSteps[i] && typeof rawSteps[i] === "object"
          ? (rawSteps[i] as { suggestion?: unknown }).suggestion
          : undefined,
      );
      if (pasted) {
        return { ...step, suggestion: { step: step.id, hypothesis: pasted, apply: false as const } };
      }
      if (step.formatWarning) {
        return { ...step, suggestion: undefined };
      }
      return step;
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
