import type { Report, Skip } from "./types";
import { suggest } from "./suggestions";
import { dimLabel } from "./visual-view";

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
  const stopped = Boolean(
    report.stopped_before_payment && steps.some((s) => s.stopped_before_payment && s.pass),
  );
  return {
    ...report,
    steps,
    stopped_before_payment: stopped,
    error: passed === steps.length && steps.length > 0 && stopped ? undefined : report.error,
    journey: report.journey,
    detects_everything: false,
    links: report.links || [],
    institutional: report.institutional || [],
    figma: report.figma || FIGMA_GAP,
    auth: report.auth || AUTH_GAP,
    pages: report.pages || [],
    isolation: report.isolation || {
      hostedFetch: false,
      methods: "GET",
      figmaFaked: false,
      payment: false,
    },
    visual: report.visual || [],
  };
}

export function isPassing(report: Report): boolean {
  return (
    report.steps.length > 0 &&
    report.steps.every((s) => s.pass) &&
    report.stopped_before_payment === true &&
    report.steps.some((s) => s.stopped_before_payment)
  );
}

export function localFileName(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/").pop() || filePath;
}

export function renderHtml(report: Report): string {
  const ok = isPassing(report);
  const rows = report.steps
    .map((s, i) => {
      const mark = s.pass ? "ok" : "falhou";
      const shot = s.screenshot ? s.screenshot : "print faltando";
      const stop = s.stopped_before_payment ? " — parado antes do pagamento" : "";
      const shotMeta = s.shotEvidence
        ? ` ${s.shotEvidence.width || "?"}×${s.shotEvidence.height || "?"} sha256:${s.shotEvidence.sha256.slice(0, 12)}`
        : "";
      const hyp = s.suggestion
        ? `<p class="hyp">Hipótese (não é patch): ${escapeHtml(s.suggestion.hypothesis)} <em>apply: false</em></p>`
        : "";
      const n = String(i + 1).padStart(2, "0");
      return `<li><span class="n">${n}</span><div><strong>${s.id}</strong> ${mark}${stop}<div class="shot">${escapeHtml(shot)}${escapeHtml(shotMeta)}</div>${hyp}</div></li>`;
    })
    .join("");
  const pageRows = (report.pages || []).map((page) => {
    const findings = page.accessibility?.findings || [];
    const alertLabel = findings.length === 1 ? "1 alerta potencial" : `${findings.length} alertas potenciais`;
    const a11y = page.accessibility
      ? `<p class="hyp">Checagem HTML básica (heurística parcial): ${alertLabel}.</p>${findings.length ? `<ul>${findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul>` : "<p>Nenhum sinal encontrado nestas checagens.</p>"}`
      : "";
    return `<section><h2>Página · ${escapeHtml(page.url)}</h2><p>${page.pass ? "respondeu" : "revisar"} · HTTP ${page.status ?? "indisponível"} · title: ${escapeHtml(page.title)} · h1: ${escapeHtml(page.h1 || "ausente")}</p>${a11y}</section>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Laudo — ${escapeHtml(report.store)}</title>
<style>
body{margin:0;font:18px/1.5 "IBM Plex Sans",system-ui,sans-serif;background:#e6e1d6;color:#1c1c1a}
header{background:#1c1c1a;color:#f7f4ec;padding:1.2rem}
main{max-width:40rem;margin:auto;padding:1.2rem;background:#f7f4ec}
.pill{display:inline-block;border:1px solid currentColor;padding:.15rem .4rem}
.ok{color:#1f5c45}.bad{color:#8b1e1e}.parar{color:#1f4e79}
.n{font:500 1.3rem/1 "IBM Plex Mono",ui-monospace,monospace;margin-right:.4rem}
ol{padding:0;list-style:none} li{display:grid;grid-template-columns:2.5rem 1fr;margin:.6rem 0}
.shot{margin:.35rem 0;padding:.5rem;border:1px dashed #c9c2b3;font:14px/1.4 "IBM Plex Mono",ui-monospace,monospace}
.hyp{font-size:.92rem;color:#5a564e}
img.diff{display:block;max-width:100%;height:auto;margin:.6rem 0;border:1px solid #c9c2b3;background:#fff}
@media print{body,header,main{background:#fff;color:#000}}
</style>
</head>
<body>
<header>
<h1>Laudo · ${escapeHtml(report.store)}</h1>
<p>${escapeHtml(report.platform)} · ${escapeHtml(report.target)}</p>
<p class="pill ${ok ? "ok" : "bad"}">${ok ? "passou · parado antes de pagar" : "falhou ou incompleto"}</p>
</header>
<main>
<p>Este laudo não altera a loja. Não pagou. Não garante que detecta tudo. Sugestão = hipótese, apply: false. Figma não foi comparado.</p>
${report.journey ? `<p>Jornada: ${escapeHtml(report.journey.name)} · ${escapeHtml(report.journey.source)} · ${escapeHtml(report.journey.stepIds.join(" → "))} · para antes de pagar</p>` : ""}
${report.run ? `<p>Execução local · id ${escapeHtml(report.run.id)} · início ${escapeHtml(report.run.startedAt)} UTC · fim ${escapeHtml(report.run.finishedAt)} UTC · ${report.run.durationMs} ms</p>` : ""}
<ol>${rows}</ol>
${(report.visual || [])
  .map((v) => {
    const name = v.diffPath ? localFileName(v.diffPath) : "";
    const vp = `${dimLabel(v.viewport?.width)}x${dimLabel(v.viewport?.height)}`;
    const missing = v.missing?.length
      ? `<p class="hyp">Campo ausente: ${escapeHtml(v.missing.join(", "))} — indisponível</p>`
      : "";
    const img = name
      ? `<img class="diff" src="${escapeHtml(name)}" alt="diff ${escapeHtml(v.step)} ${escapeHtml(vp)}">`
      : "<p>sem PNG de diff neste passo</p>";
    return `<section><h2>PNG local · ${escapeHtml(v.step)}</h2><p>${escapeHtml(dimLabel(v.viewport?.width))}×${escapeHtml(dimLabel(v.viewport?.height))} · figma: false · apply: false</p>${missing}${img}<p class="hyp">${escapeHtml(v.hypothesis || "indisponível")}</p></section>`;
  })
  .join("")}
<p>Links: ${(report.links || []).length} · institucionais: ${(report.institutional || []).length}</p>
${pageRows}
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
