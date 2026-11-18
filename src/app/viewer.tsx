"use client";

import { useMemo, useState } from "react";
import { isPassing, localFileName } from "@/lib/report";
import { describeScreenshot, parseReport, stepLabel } from "@/lib/viewer-parse";
import { dimLabel, formatVisualSummary } from "@/lib/visual-view";
import type { Report } from "@/lib/types";

function demoSvgDataUri(stepNum: string, title: string, verdict: string, tone: "ok" | "falha" | "parar", detail: string): string {
  const badgeColor = tone === "ok" ? "#1F5C45" : tone === "parar" ? "#1F4E79" : "#8B1E1E";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#F7F4EC"/>
    <rect x="0" y="0" width="640" height="42" fill="#1C1C1A"/>
    <text x="18" y="26" fill="#E6E1D6" font-family="monospace" font-size="13">EXEMPLO DE FIXTURE CONTROLADO · ETAPA ${stepNum}</text>
    <rect x="24" y="64" width="592" height="268" fill="#FFFFFF" stroke="#C9C2B3" stroke-width="2"/>
    <text x="44" y="106" fill="#1C1C1A" font-family="sans-serif" font-size="22" font-weight="600">${title}</text>
    <rect x="44" y="122" width="250" height="28" fill="${badgeColor}"/>
    <text x="54" y="141" fill="#FFFFFF" font-family="monospace" font-size="13">${verdict}</text>
    <line x1="44" y1="172" x2="592" y2="172" stroke="#E6E1D6" stroke-width="2"/>
    <text x="44" y="204" fill="#5A564E" font-family="monospace" font-size="13">${detail}</text>
    <text x="44" y="308" fill="#5A564E" font-family="sans-serif" font-size="12">CheckoutGuard · captura demonstrativa offline (sem acesso a loja real neste visor)</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMO_SCRIBAN_FAIL = {
  store: "fixture-demo-wake-scriban",
  platform: "wake-mock",
  target: "fixture",
  stopped_before_payment: true,
  suggestion: {
    text: "Hipótese no topo: etapa 03 (produto) devolveu JSON status_code 500 em HTTP 200 (erro Scriban no tema) — não aplicar patch automático.",
  },
  consoleErrors: [{ message: "Uncaught TypeError: addToCart is not a function (produto.html:42)" }],
  detects_everything: false,
  run: {
    id: "demo-scriban-500-wake",
    startedAt: "2026-11-18T10:00:00.000Z",
    finishedAt: "2026-11-18T10:00:04.280Z",
    durationMs: 4280,
    fixtureSha256: "8f4b2e19c3d0a7e6f5123498ab76cd01ef23456789abcdef0123456789abcdef",
    cartCleaned: true,
  },
  links: [
    { href: "http://127.0.0.1/sobre.html", status: 200, verdict: "ok" },
    { href: "http://127.0.0.1/guia-tamanhos-ausente.html", status: 404, verdict: "broken" },
    { href: "mailto:contato@demo-qa.example", verdict: "skipped-mailto" },
    { href: "https://example.com", verdict: "skipped-external" },
  ],
  institutional: [
    { slug: "sobre.html", status: 200, pass: true },
    { slug: "politica.html", status: 200, pass: true },
  ],
  figma: { available: false, reason: "sem PNG exportado pelo cliente nesta demonstração. Não fingimos comparação com Figma." },
  auth: {
    available: false,
    reason: "jornada visitante (guest checkout). O CheckoutGuard não cria cadastro, não preenche senha e não resolve CAPTCHA.",
  },
  journey: {
    name: "fixture-demo-wake",
    source: "builtin",
    startPath: "/home.html",
    stepIds: ["home", "categoria", "produto", "carrinho", "checkout"],
    actions: [
      { id: "home", heading: "Loja Demo QA", stop: false },
      { id: "categoria", heading: "Tênis", click: "Ver categoria Tênis", clickRole: "link", stop: false },
      { id: "produto", heading: "Tênis Demo QA", click: "Ver produto", clickRole: "link", stop: false },
      { id: "carrinho", heading: "Carrinho", click: "Adicionar ao carrinho", clickRole: "button", stop: false },
      { id: "checkout", heading: "Forma de pagamento", click: "Ir ao checkout", clickRole: "link", stop: true },
    ],
    stopBeforePayment: true,
  },
  steps: [
    {
      id: "home",
      url: "http://127.0.0.1/home.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("01", "01 · Home (Vitrine)", "PASSOU · HTTP 200", "ok", "h1: Loja Demo QA · 0 erros de console"),
    },
    {
      id: "categoria",
      url: "http://127.0.0.1/categoria.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("02", "02 · Categoria Tênis", "PASSOU · HTTP 200", "ok", "12 vitrines renderizadas · link PDP visível"),
    },
    {
      id: "produto",
      url: "http://127.0.0.1/produto.html",
      pass: false,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("03", "03 · Produto (PDP)", "FALHOU · SCRIBAN 500 EM HTTP 200", "falha", 'Corpo JSON: {"status_code":500,"message":"currency not found"}'),
      error: '{"status_code":500,"message":"The function currency was not found"}',
      suggestion: {
        step: "produto",
        hypothesis:
          "O Storefront respondeu HTTP 200 com JSON status_code 500 (erro Scriban). Monitor comum de uptime não enxerga esta queda. Revisar partial de preço no tema — apply: false.",
        apply: false,
      },
    },
    {
      id: "carrinho",
      url: "http://127.0.0.1/carrinho.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("04", "04 · Carrinho", "PASSOU · 1 ITEM", "ok", "Subtotal e frete simulados · controle Ir ao checkout íntegro"),
    },
    {
      id: "checkout",
      url: "http://127.0.0.1/checkout.html",
      pass: true,
      stopped_before_payment: true,
      screenshot: demoSvgDataUri("05", "05 · Checkout (Parada Segura)", "PARADO ANTES DE PAGAR", "parar", "checkoutComplete bloqueado · cartão vazio · carrinho limpo no fim"),
    },
  ],
};

const DEMO_PASSING = {
  store: "fixture-demo-safe-checkout-ok",
  platform: "wake-mock",
  target: "fixture",
  stopped_before_payment: true,
  consoleErrors: [],
  detects_everything: false,
  run: {
    id: "demo-safe-checkout-5-of-5",
    startedAt: "2026-11-18T10:05:00.000Z",
    finishedAt: "2026-11-18T10:05:03.610Z",
    durationMs: 3610,
    fixtureSha256: "8f4b2e19c3d0a7e6f5123498ab76cd01ef23456789abcdef0123456789abcdef",
    cartCleaned: true,
  },
  links: [
    { href: "http://127.0.0.1/sobre.html", status: 200, verdict: "ok" },
    { href: "http://127.0.0.1/politica.html", status: 200, verdict: "ok" },
  ],
  institutional: [
    { slug: "sobre.html", status: 200, pass: true },
    { slug: "politica.html", status: 200, pass: true },
  ],
  figma: { available: false, reason: "sem PNG exportado pelo cliente nesta execução." },
  auth: { available: false, reason: "jornada visitante sem login." },
  journey: {
    name: "fixture-demo-safe-checkout",
    source: "builtin",
    startPath: "/home.html",
    stepIds: ["home", "categoria", "produto", "carrinho", "checkout"],
    stopBeforePayment: true,
  },
  steps: [
    {
      id: "home",
      url: "http://127.0.0.1/home.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("01", "01 · Home (Vitrine)", "PASSOU · HTTP 200", "ok", "h1: Loja Demo QA · sem erros"),
    },
    {
      id: "categoria",
      url: "http://127.0.0.1/categoria.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("02", "02 · Categoria Tênis", "PASSOU · HTTP 200", "ok", "Grade carregada · link PDP íntegro"),
    },
    {
      id: "produto",
      url: "http://127.0.0.1/produto.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("03", "03 · Produto (PDP)", "PASSOU · HTTP 200", "ok", "Preço renderizado · botão Adicionar ao carrinho ativo"),
    },
    {
      id: "carrinho",
      url: "http://127.0.0.1/carrinho.html",
      pass: true,
      stopped_before_payment: false,
      screenshot: demoSvgDataUri("04", "04 · Carrinho", "PASSOU · 1 ITEM", "ok", "Frete calculado · transição limpa ao checkout"),
    },
    {
      id: "checkout",
      url: "http://127.0.0.1/checkout.html",
      pass: true,
      stopped_before_payment: true,
      screenshot: demoSvgDataUri("05", "05 · Checkout (Parada Segura)", "PASSOU · PARADO ANTES DE PAGAR", "parar", "Nenhum cartão preenchido · pedido não concluído"),
    },
  ],
};

const MAX_REPORT_BYTES = 5 * 1024 * 1024;

export type ViewerProps = {
  embedded?: boolean;
  defaultDemo?: "scriban" | "passing" | "none";
};

function buildInitialState(defaultDemo: "scriban" | "passing" | "none"): {
  raw: string;
  report: Report | null;
  usingExample: boolean;
} {
  if (defaultDemo === "none") return { raw: "", report: null, usingExample: false };
  const payload = defaultDemo === "passing" ? DEMO_PASSING : DEMO_SCRIBAN_FAIL;
  const text = JSON.stringify(payload, null, 2);
  const parsed = parseReport(text);
  return parsed.ok
    ? { raw: text, report: parsed.report, usingExample: true }
    : { raw: "", report: null, usingExample: false };
}

export function Viewer({ embedded = false, defaultDemo = "scriban" }: ViewerProps) {
  const initial = useMemo(() => buildInitialState(defaultDemo), [defaultDemo]);
  const [raw, setRaw] = useState(initial.raw);
  const [report, setReport] = useState<Report | null>(initial.report);
  const [error, setError] = useState<string | null>(null);
  const [usingExample, setUsingExample] = useState(initial.usingExample);
  const [fileBusy, setFileBusy] = useState(false);

  const status = useMemo(() => {
    if (!report) return null;
    if (isPassing(report)) return { className: "pill ok", label: "passou · parado antes de pagar" };
    const failedStep = report.steps.find((s) => !s.pass);
    if (failedStep) {
      return { className: "pill bad", label: `falhou no passo ${stepLabel(failedStep)}` };
    }
    if (report.steps.some((s) => s.stopped_before_payment)) {
      return { className: "pill parar", label: "parado antes do pagamento" };
    }
    return { className: "pill bad", label: "falhou ou incompleto" };
  }, [report]);

  function load(text: string, example: boolean) {
    const parsed = parseReport(text);
    if (!parsed.ok) {
      setReport(null);
      setError(parsed.message);
      setUsingExample(false);
      return;
    }
    setError(null);
    setReport(parsed.report);
    setUsingExample(example);
  }

  function loadPreset(preset: typeof DEMO_SCRIBAN_FAIL | typeof DEMO_PASSING) {
    const text = JSON.stringify(preset, null, 2);
    setRaw(text);
    load(text, true);
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (file.size > MAX_REPORT_BYTES) {
      setError("O laudo excede 5 MB. Escolha um arquivo menor.");
      return;
    }
    setFileBusy(true);
    try {
      const text = await file.text();
      const parsed = parseReport(text);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      setRaw(text);
      setReport(parsed.report);
      setUsingExample(false);
      setError(null);
    } catch {
      setError("Não foi possível ler este arquivo. Tente outro laudo JSON.");
    } finally {
      setFileBusy(false);
    }
  }

  const content = (
    <>
      <section className="slip" aria-labelledby="visor-controles">
        <h2 id="visor-controles">Visor Interativo de Laudo (1 clique · sem login)</h2>
        <p className="muted">
          Alterne entre dois cenários reais do fixture controlado ou abra um <code>report.json</code> gerado pela CLI /
          GitHub Actions no seu computador. Nada sai do seu navegador (processamento 100% local, sem upload para
          servidor).
        </p>
        <div className="btn-row" role="group" aria-label="Demonstrações prontas do laudo">
          <button type="button" onClick={() => loadPreset(DEMO_SCRIBAN_FAIL)}>
            Demo 1: Falha Scriban 500 na PDP (Wake)
          </button>
          <button type="button" className="secondary" onClick={() => loadPreset(DEMO_PASSING)}>
            Demo 2: ronda 5/5 aprovada (Safe-Checkout)
          </button>
        </div>

        <details style={{ marginTop: "0.9rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 500, minHeight: "44px", display: "flex", alignItems: "center" }}>
            Importar arquivo report.json local (até 5 MB) ou colar JSON manualmente
          </summary>
          <label htmlFor="report-file">Selecionar report.json do computador (até 5 MB)</label>
          <input
            id="report-file"
            type="file"
            accept="application/json,.json"
            disabled={fileBusy}
            onChange={(event) => {
              void loadFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {fileBusy ? <p role="status">Lendo laudo local…</p> : null}
          <label htmlFor="json">Conteúdo do report.json</label>
          <textarea
            id="json"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            aria-describedby="json-hint"
          />
          <p id="json-hint" className="muted">
            O conteúdo colado ou selecionado permanece somente na memória desta aba.
          </p>
          <div className="btn-row">
            <button type="button" onClick={() => load(raw, false)}>
              Ler JSON colado
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setRaw("");
                setReport(null);
                setError(null);
                setUsingExample(false);
              }}
            >
              Limpar visor
            </button>
          </div>
        </details>
      </section>

      {!report && !error ? (
        <section className="slip" aria-live="polite">
          <p className="muted">Nenhuma execução carregada. Use um dos botões de demonstração acima ou importe seu report.json.</p>
        </section>
      ) : null}

      {error ? (
        <section className="slip" role="alert">
          <p className="bad">{error}</p>
        </section>
      ) : null}

      {report ? (
        <section className="slip" aria-labelledby="resultado">
          <h2 id="resultado">
            LAUDO · {report.store}{" "}
            {status ? <span className={status.className}>{status.label}</span> : null}
          </h2>
          {usingExample ? (
            <p className="sinal-bar">
              Demonstração baseada em fixture controlado — não representa execução ao vivo contra loja de terceiros.
            </p>
          ) : null}
          {report.suggestionText ? (
            <p className="hyp">
              <strong>Diagnóstico principal:</strong> {report.suggestionText} <em>(apply: false)</em>
            </p>
          ) : null}
          <p>
            <strong>Escopo:</strong> alvo <code>{report.target}</code> · plataforma <code>{report.platform}</code>
            {report.journey
              ? ` · sequência ${report.journey.stepIds.join(" → ")} · parada obrigatória antes do pagamento`
              : ""}
          </p>
          {report.run ? (
            <p className="muted mono">
              execução {report.run.id} · início {report.run.startedAt} · duração {report.run.durationMs} ms
              {report.run.fixtureSha256 ? (
                <>
                  {" "}
                  · sha256 fixture <code>{report.run.fixtureSha256.slice(0, 12)}</code>
                </>
              ) : null}
              {report.run.cartCleaned ? " · carrinho limpo no teardown" : ""}
            </p>
          ) : null}

          {report.journey?.actions?.length ? (
            <details>
              <summary>Ver ações auditadas da jornada</summary>
              <p>
                Rota inicial: <code>{report.journey.startPath}</code>
              </p>
              <ol className="plain">
                {report.journey.actions.map((action) => (
                  <li key={action.id}>
                    <strong>{action.heading}</strong>
                    {action.click ? ` · clique ${action.clickRole || "link"}: “${action.click}”` : " · leitura inicial"}
                    {action.stop ? " · ponto de parada antes do pagamento" : ""}
                  </li>
                ))}
              </ol>
              {report.journey.actionWarnings?.map((warning) => (
                <p className="bad" key={warning}>
                  {warning}
                </p>
              ))}
            </details>
          ) : null}

          <ol className="steps">
            {report.steps.map((step, i) => {
              const shot = describeScreenshot(step.screenshot);
              return (
                <li key={`${step.id}-${step.url}-${i}`}>
                  <span className="n" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="evidencia">
                    <div>
                      <strong>{stepLabel(step)}</strong>{" "}
                      <span className={step.pass ? "pill ok" : "pill bad"}>
                        {step.pass ? "passou" : "falhou"}
                      </span>
                      {step.stopped_before_payment ? (
                        <>
                          {" "}
                          <span className="pill parar">parado antes de pagar</span>
                        </>
                      ) : null}
                      {step.formatWarning ? <p className="bad">{step.formatWarning}</p> : null}
                      <div className="shot">
                        {shot.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="shot-img"
                            src={shot.src}
                            alt={`Captura da etapa ${String(i + 1).padStart(2, "0")} ${stepLabel(step)}: ${step.pass ? "aprovada" : "com falha"}`}
                          />
                        ) : (
                          shot.label
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mono" style={{ margin: "0 0 0.35rem" }}>
                        URL: {step.url || "não informada"}
                      </p>
                      {step.shotEvidence ? (
                        <p className="muted mono">
                          print {step.shotEvidence.width || "?"}×{step.shotEvidence.height || "?"} · sha256{" "}
                          {step.shotEvidence.sha256.slice(0, 12)} · {step.shotEvidence.note}
                        </p>
                      ) : null}
                      {step.error ? (
                        <pre className="console" aria-label={`Erro capturado na etapa ${stepLabel(step)}`}>
                          {step.error}
                        </pre>
                      ) : null}
                      <p className="hyp">
                        {step.suggestion ? (
                          <>
                            <strong>Hipótese (sem patch):</strong> {step.suggestion.hypothesis}{" "}
                            <em>apply: false</em>
                          </>
                        ) : step.formatWarning ? (
                          "Etapa sem identificador padrão; mantida sem inferência automática."
                        ) : (
                          "Etapa concluída sem alerta de regressão neste passo."
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {report.pages?.length ? (
            <>
              <h3>Checagem HTML por página (heurística estática)</h3>
              <ol className="plain">
                {report.pages.map((pg) => (
                  <li key={pg.url}>
                    <code>{pg.url}</code> — {pg.pass ? "ok" : "falhou"} {pg.status ? `(HTTP ${pg.status})` : ""} ·{" "}
                    {pg.h1 ? `h1: ${pg.h1}` : "sem h1"}
                    {pg.accessibility ? (
                      <div className="muted">
                        Sinais básicos HTML: {pg.accessibility.findings.length} alerta
                        {pg.accessibility.findings.length === 1 ? " potencial." : "s potenciais."}
                        {pg.accessibility.findings.length ? (
                          <ul className="plain">
                            {pg.accessibility.findings.map((finding, idx) => (
                              <li key={`${pg.url}-a11y-${idx}`}>{finding}</li>
                            ))}
                          </ul>
                        ) : (
                          " Nenhum alerta nestas verificações estáticas."
                        )}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <div className="grid-2" style={{ marginTop: "0.75rem" }}>
            <div>
              <h3>Institucionais & Links GET</h3>
              {report.institutional?.length ? (
                <ul className="plain">
                  {report.institutional.map((page) => (
                    <li key={page.slug}>
                      <code>{page.slug}</code> — {page.pass ? "ok" : "falhou"}{" "}
                      {page.status ? `(HTTP ${page.status})` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {report.links?.length ? (
                <ul className="plain">
                  {report.links.map((link) => (
                    <li key={`${link.verdict}-${link.href}`}>
                      <code>{link.href}</code> — <strong>{link.verdict}</strong>
                      {link.status ? ` (${link.status})` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nenhum link registrado neste JSON.</p>
              )}
            </div>

            <div>
              <h3>Console JS (first-party mascarado)</h3>
              {report.consoleErrors?.length ? (
                <pre className="console">{report.consoleErrors.join("\n")}</pre>
              ) : (
                <p className="muted">Nenhum erro first-party capturado nesta execução.</p>
              )}
            </div>
          </div>

          {report.visual?.length ? (
            <>
              <h3>Comparação com PNG de referência local</h3>
              <ol className="plain">
                {report.visual.map((v, i) => (
                  <li key={`${v.step}-${v.reference.path || "sem-ref"}-${i}`}>
                    {formatVisualSummary(v)}
                    {v.missing?.length ? (
                      <p className="muted">Campo ausente: {v.missing.join(", ")} — indisponível</p>
                    ) : null}
                    <p className="hyp">
                      {v.hypothesis} <em>figma: false · apply: false</em>
                    </p>
                    {(() => {
                      const diff = describeScreenshot(v.diffPath);
                      if (diff.src) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="diff"
                            src={diff.src}
                            alt={`diff ${v.step} ${dimLabel(v.viewport.width)}x${dimLabel(v.viewport.height)}`}
                          />
                        );
                      }
                      if (!v.diffPath) return null;
                      return (
                        <p className="muted">
                          Diff gravado localmente: <code>{localFileName(v.diffPath)}</code>. Abra{" "}
                          <code>ronda-out/report.html</code> no computador para inspecionar a imagem.
                        </p>
                      );
                    })()}
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <p className="hyp" style={{ marginTop: "0.75rem" }}>
            <strong>Escopo não coberto neste laudo:</strong> Figma ({report.figma?.reason}) · Autenticação (
            {report.auth?.reason})
          </p>
          <p className="muted mono">
            detects_everything: false · apply: false · este laudo apenas documenta evidências e não altera a loja.
          </p>
        </section>
      ) : null}
    </>
  );

  if (embedded) return content;

  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="capa">
        <div className="capa-inner">
          <div className="topbar">
            <span className="brand-stamp">CHECKOUTGUARD · VISOR DE LAUDO LOCAL</span>
            <nav className="topnav" aria-label="Navegação principal">
              <a href="/">Apresentação & Planos B2B</a>
              <a href="/visor" aria-current="page">
                Visor Interativo
              </a>
              <a href="/privacidade">Privacidade (LGPD)</a>
            </nav>
          </div>
          <h1>Visor de Laudo — CheckoutGuard</h1>
          <p>
            Laudo da loja, com prova. A gente não mexe no site e para antes de pagar. Este visor roda{" "}
            <strong>100% no seu navegador</strong>: inspecione as demonstrações abaixo em 1 clique ou abra um{" "}
            <code>report.json</code> gerado pela CLI / GitHub Actions.
          </p>
        </div>
      </header>
      <main id="conteudo">{content}</main>
      <footer>
        <a href="/">Página inicial & Planos</a> · <a href="/privacidade">Privacidade (LGPD)</a> ·{" "}
        <a href="/playground-estados.html">estados visuais do laudo</a> · Este visor não executa crawl remoto e não
        altera lojas.
      </footer>
    </>
  );
}
