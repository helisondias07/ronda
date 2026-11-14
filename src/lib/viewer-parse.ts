import { finalizeReport } from "./report";
import type { Report } from "./types";

export function parseReport(raw: string): { ok: true; report: Report } | { ok: false; message: string } {
  try {
    const data = JSON.parse(raw) as Partial<Report>;
    if (!data || !Array.isArray(data.steps) || data.steps.length === 0) {
      return { ok: false, message: "JSON sem a lista de etapas. Cole o report.json gerado no seu PC." };
    }
    return { ok: true, report: finalizeReport({
      store: data.store || "laudo colado",
      platform: data.platform || "wake-mock",
      target: data.target || "fixture",
      steps: data.steps,
      stopped_before_payment: Boolean(data.stopped_before_payment),
      consoleErrors: data.consoleErrors || [],
      error: data.error,
      detects_everything: false,
      links: data.links || [],
      institutional: data.institutional || [],
      figma: data.figma || { available: false, reason: "sem FIGMA_TOKEN nem spec local. Não fingimos comparação com Figma." },
      auth: data.auth || {
        available: false,
        reason: "sem conta de teste no Vault. A Ronda não cria cadastro, não preenche senha e não automatiza CAPTCHA/SMS/social.",
      },
    }) };
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
