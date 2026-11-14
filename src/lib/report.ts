import type { Report, Skip } from "./types";
import { suggest } from "./suggestions";

const FIGMA_GAP: Skip = {
  available: false,
  reason: "sem FIGMA_TOKEN nem spec local. Não fingimos comparação com Figma.",
};
const AUTH_GAP: Skip = {
  available: false,
  reason:
    "sem conta de teste no Vault. A Ronda não cria cadastro, não preenche senha e não automatiza CAPTCHA/SMS/social.",
};

export function finalizeReport(report: Report): Report {
  const steps = report.steps.map((step) => {
    const suggestion = suggest(step);
    return suggestion ? { ...step, suggestion } : step;
  });
  const passed = steps.filter((s) => s.pass).length;
  const stopped = Boolean(report.stopped_before_payment && steps.some((s) => s.id === "checkout" && s.pass));
  return {
    ...report,
    steps,
    stopped_before_payment: stopped,
    error: passed === 5 && stopped ? undefined : report.error,
    detects_everything: false,
    links: report.links || [],
    institutional: report.institutional || [],
    figma: report.figma || FIGMA_GAP,
    auth: report.auth || AUTH_GAP,
  };
}

export function isPassing(report: Report): boolean {
  return (
    report.steps.length === 5 &&
    report.steps.every((s) => s.pass) &&
    report.stopped_before_payment === true
  );
}

export function renderHtml(report: Report): string {
  const ok = isPassing(report);
  const rows = report.steps
    .map((s) => {
      const mark = s.pass ? "ok" : "falhou";
      const shot = s.screenshot ? s.screenshot : "sem print";
      const stop = s.stopped_before_payment ? " — parado antes do pagamento" : "";
      const hyp = s.suggestion ? `<p class="hyp">${escapeHtml(s.suggestion.hypothesis)} <em>apply: false</em></p>` : "";
      return `<li><strong>${s.id}</strong> ${mark}${stop}<div class="shot">${escapeHtml(shot)}</div>${hyp}</li>`;
    })
    .join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Laudo Ronda — ${escapeHtml(report.store)}</title>
<style>
body{margin:0;font:18px/1.5 Georgia,serif;background:#e9dcc6;color:#1c1914}
header{background:#2f3d28;color:#f4efe4;padding:1.2rem}
main{max-width:40rem;margin:auto;padding:1.2rem;background:#f7f1e3}
.pill{display:inline-block;border:1px solid currentColor;padding:.15rem .4rem;font:700 .75rem/1 sans-serif}
.ok{color:#2d4a32}.bad{color:#8b1e1e}
.shot{margin:.35rem 0;padding:.5rem;border:1px dashed #d9ccb4;font:14px/1.4 ui-monospace,Consolas,monospace}
.hyp{font-size:.92rem;color:#5c564c}
</style>
</head>
<body>
<header>
<h1>Ronda — laudo de jornada</h1>
<p>${escapeHtml(report.store)} · ${escapeHtml(report.platform)} · ${escapeHtml(report.target)}</p>
<p class="pill ${ok ? "ok" : "bad"}">${ok ? "passou · stopped_before_payment" : "falhou ou incompleto"}</p>
</header>
<main>
<p>Só relata. Não pagou. Não alterou tema. Não garante que detecta tudo.</p>
<ol>${rows}</ol>
<p>Links: ${(report.links || []).length} · institucionais: ${(report.institutional || []).length}</p>
<p>Figma: ${escapeHtml((report.figma && report.figma.reason) || "indisponível")}</p>
<p>Login: ${escapeHtml((report.auth && report.auth.reason) || "indisponível")}</p>
${report.error ? `<pre>${escapeHtml(report.error)}</pre>` : ""}
</main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
