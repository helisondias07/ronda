import { FIXTURE_JOURNEY, type JourneyStep } from "./wake";

export const MAX_JOURNEY_STEPS = 8;
const FORBIDDEN_CLICK = /finalizar pedido|pagar agora|checkoutcomplete|checkout\/complete|checkout\/confirmation/i;
const FORBIDDEN_ID = /complete|confirmation|pedido-pago/i;
const FORBIDDEN_PATH = /checkout\/(complete|confirmation)|checkoutcomplete/i;
const SAFE_STEP_ID = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

export type LoadedJourney = {
  name: string;
  source: string;
  startPath: string;
  stopBeforePayment: true;
  steps: JourneyStep[];
};

export type JourneyParse =
  | { ok: true; journey: LoadedJourney }
  | { ok: false; message: string };

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function safeStartPath(raw: unknown): string | null {
  if (raw == null || raw === "") return "/home.html";
  if (typeof raw !== "string") return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || /^https?:/i.test(path)) {
    return null;
  }
  if (FORBIDDEN_PATH.test(path)) return null;
  return path;
}

export function defaultJourney(): LoadedJourney {
  return {
    name: "fixture-demo-qa",
    source: "builtin",
    startPath: "/home.html",
    stopBeforePayment: true,
    steps: FIXTURE_JOURNEY,
  };
}

export function parseJourneyFile(raw: unknown, source = "journey.json"): JourneyParse {
  const rec = asRecord(raw);
  if (!rec) return { ok: false, message: "jornada: JSON deve ser um objeto" };
  if (rec.stopBeforePayment === false) {
    return { ok: false, message: "jornada: stopBeforePayment não pode ser false (a Ronda para antes de pagar)" };
  }
  const startPath = safeStartPath(rec.startPath);
  if (!startPath) {
    return { ok: false, message: "jornada: startPath inválido (use caminho local tipo /home.html)" };
  }
  if (!Array.isArray(rec.steps) || rec.steps.length === 0) {
    return { ok: false, message: "jornada: steps vazio" };
  }
  if (rec.steps.length > MAX_JOURNEY_STEPS) {
    return { ok: false, message: `jornada: no máximo ${MAX_JOURNEY_STEPS} etapas` };
  }
  const steps: JourneyStep[] = [];
  const seenIds = new Set<string>();
  for (const item of rec.steps) {
    const step = asRecord(item);
    if (!step) return { ok: false, message: "jornada: etapa inválida" };
    const id = typeof step.id === "string" ? step.id.trim() : "";
    const heading = typeof step.heading === "string" ? step.heading.trim() : "";
    if (!SAFE_STEP_ID.test(id) || !heading || heading.length > 200) {
      return { ok: false, message: "jornada: id precisa ser slug curto e heading precisa ter até 200 caracteres" };
    }
    if (seenIds.has(id.toLowerCase())) return { ok: false, message: `jornada: id duplicado (${id})` };
    seenIds.add(id.toLowerCase());
    if (FORBIDDEN_ID.test(id)) return { ok: false, message: `jornada: id proibido (${id})` };
    if (step.click !== undefined && typeof step.click !== "string") {
      return { ok: false, message: "jornada: click precisa ser texto" };
    }
    const click = typeof step.click === "string" ? step.click.trim() : undefined;
    if (click && click.length > 200) return { ok: false, message: "jornada: rótulo de clique tem limite de 200 caracteres" };
    if (click && FORBIDDEN_CLICK.test(click)) {
      return { ok: false, message: `jornada: clique proibido (${click})` };
    }
    const clickRole = step.clickRole === undefined ? "link" : step.clickRole;
    if (clickRole !== "link" && clickRole !== "button") {
      return { ok: false, message: "jornada: clickRole precisa ser link ou button" };
    }
    if (step.clickRole !== undefined && !click) {
      return { ok: false, message: "jornada: clickRole exige um rótulo click" };
    }
    steps.push({
      id: id as JourneyStep["id"],
      heading,
      click: click || undefined,
      clickRole: click ? clickRole : undefined,
      stop: Boolean(step.stop),
    });
  }
  const stopIndexes = steps.flatMap((step, index) => step.stop ? [index] : []);
  if (stopIndexes.length !== 1 || stopIndexes[0] !== steps.length - 1) {
    return { ok: false, message: "jornada: stop: true deve aparecer uma vez, na última etapa" };
  }
  const name = typeof rec.name === "string" && rec.name.trim() ? rec.name.trim().slice(0, 100) : "jornada-local";
  return {
    ok: true,
    journey: {
      name,
      source,
      startPath,
      stopBeforePayment: true,
      steps,
    },
  };
}
