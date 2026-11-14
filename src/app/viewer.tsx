"use client";

import { useMemo, useState } from "react";
import { isPassing, localFileName } from "@/lib/report";
import { describeScreenshot, parseReport, stepLabel } from "@/lib/viewer-parse";
import { dimLabel, formatVisualSummary } from "@/lib/visual-view";
import type { Report } from "@/lib/types";

const EXAMPLE = {
  store: "fixture-demo-qa",
  platform: "wake-mock",
  target: "fixture",
  stopped_before_payment: true,
  suggestion: { text: "Hipótese no topo: função currency ausente no tema — não aplicar patch daqui." },
  consoleErrors: [{ message: "Uncaught TypeError: addToCart is not a function" }],
  detects_everything: false,
  links: [
    { href: "http://127.0.0.1/sobre.html", status: 200, verdict: "ok" },
    { href: "http://127.0.0.1/pagina-ausente.html", status: 404, verdict: "broken" },
    { href: "mailto:contato@demo-qa.example", verdict: "skipped-mailto" },
    { href: "https://example.com", verdict: "skipped-external" },
  ],
  institutional: [
    { slug: "sobre.html", status: 200, pass: true },
    { slug: "politica.html", status: 200, pass: true },
  ],
  figma: { available: false, reason: "sem FIGMA_TOKEN nem spec local. Não fingimos comparação com Figma." },
  auth: {
    available: false,
    reason: "sem conta de teste no Vault. A Ronda não cria cadastro, não preenche senha e não automatiza CAPTCHA/SMS/social.",
  },
  journey: {
    name: "fixture-demo-qa",
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
    { id: "home", url: "http://127.0.0.1/home.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/home.png" },
    { id: "categoria", url: "http://127.0.0.1/categoria.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/categoria.png" },
    {
      id: "produto",
      url: "http://127.0.0.1/produto.html",
      pass: false,
      stopped_before_payment: false,
      screenshot: "ronda-out/produto.png",
      error: '{"status_code":500,"message":"The function `currency` was not found"}',
      suggestion: {
        step: "produto",
        hypothesis:
          "O Storefront devolveu JSON com status_code 500 (erro Scriban). HTTP 200 não prova a página. Hipótese: função ou partial ausente no tema — não aplicar patch daqui.",
        apply: false,
      },
    },
    { id: "carrinho", url: "http://127.0.0.1/carrinho.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/carrinho.png" },
    { id: "checkout", url: "http://127.0.0.1/checkout.html", pass: true, stopped_before_payment: true, screenshot: "ronda-out/checkout.png" },
  ],
};

export function Viewer() {
  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingExample, setUsingExample] = useState(false);

  const status = useMemo(() => {
    if (!report) return null;
    if (isPassing(report)) return { className: "pill ok", label: "passou · parado antes de pagar" };
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

  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="capa">
        <h1>Ronda</h1>
        <p>
          Laudo da loja, com prova. A gente não mexe no site. Esta página <strong>não testa loja</strong> —
          só lê o JSON gerado no seu PC. Nome de marca provisório; não é registro.
        </p>
      </header>
      <main id="conteudo">
        <section className="slip" aria-labelledby="como">
          <h2 id="como">Como funciona de verdade</h2>
          <ol>
            <li>
              No repositório: <code>npm install</code>, <code>npx playwright install chromium</code>,{" "}
              <code>npm test</code>.
            </li>
            <li>
              A jornada roda apenas no fixture controlado: <code>npm run ronda</code>. Configurações diferentes de
              clique, rótulo, página ou etapa são bloqueadas. Cada clique permitido tem rota e destino revisados.
              Gera <code>ronda-out/report.json</code> e prints; termina na etapa de pagamento fictícia sem enviar pedido.
            </li>
            <li>Cole o JSON abaixo. Sugestão de correção vem no laudo; aplicar no tema é outro fluxo.</li>
          </ol>
          <p className="muted">
            Sem OpenCode Go, sem chave de LLM, sem Admin Wake, sem pedido. Esta página <strong>não
            busca URL</strong>. Por segurança, <code>--base-url</code> está desativado: o CLI aceita somente o fixture
            local controlado. Não afirmamos proteção geral de rede nem cobrimos sites reais.
          </p>
          <p>
            <strong>Já funciona:</strong> jornada demo fixa do fixture (controles e destinos permitidos revisados);
            institucionais da allowlist; GET same-origin com teto 80 no CLI, apenas no fixture;
            console first-party mascarado; título/h1 e sinais HTML básicos de acessibilidade (heurística parcial,
            não é auditoria WCAG); laudo JSON/HTML. <strong>Ainda não:</strong> Figma, login, loja
            de cliente, Nuvemshop, correção do tema, cobrança. Hospedagem: Vercel Hobby — uso pessoal ou não comercial (
            <a href="https://vercel.com/legal/terms">Termos §4</a>
            ).
          </p>
        </section>

        <section className="slip" aria-labelledby="colar">
          <h2 id="colar">Laudo</h2>
          <label htmlFor="json">report.json</label>
          <textarea
            id="json"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            aria-describedby="json-hint"
          />
          <p id="json-hint" className="muted">
            Exemplo abaixo é o fixture Demo QA, não uma loja real.
          </p>
          <button type="button" onClick={() => load(raw, false)}>
            Ler laudo
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const text = JSON.stringify(EXAMPLE, null, 2);
              setRaw(text);
              load(text, true);
            }}
          >
            Ver exemplo do fixture
          </button>
        </section>

        {!report && !error ? (
          <section className="slip" aria-live="polite">
            <p className="muted">Nenhum laudo ainda.</p>
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
              {report.store}{" "}
              {status ? <span className={status.className}>{status.label}</span> : null}
            </h2>
            {usingExample ? <p className="muted">Dados de exemplo do fixture. Não é execução ao vivo.</p> : null}
            {report.suggestionText ? (
              <p className="hyp">
                <strong>Sugestão</strong> {report.suggestionText} <em>apply: false</em>
              </p>
            ) : null}
            <p>
              Alvo: {report.target} · plataforma: {report.platform}
              {report.journey
                ? ` · jornada ${report.journey.name} (${report.journey.stepIds.join(" → ")}) · para antes de pagar`
                : ""}
            </p>
            {report.journey?.actions?.length ? (
              <details>
                <summary>Ver configuração registrada da jornada</summary>
                <p>Início: <code>{report.journey.startPath}</code></p>
                <ol>
                  {report.journey.actions.map((action) => (
                    <li key={action.id}>
                      <strong>{action.heading}</strong>
                      {action.click ? ` · clique ${action.clickRole || "link"}: “${action.click}”` : " · sem clique"}
                      {action.stop ? " · ponto de parada antes do pagamento" : ""}
                    </li>
                  ))}
                </ol>
                {report.journey.actionWarnings?.map((warning) => <p className="bad" key={warning}>{warning}</p>)}
              </details>
            ) : null}
            <ol className="steps">
              {report.steps.map((step, i) => (
                <li key={`${step.id}-${step.url}-${i}`}>
                  <span className="n" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{stepLabel(step)}</strong> {step.pass ? "ok" : "falhou"}
                    {step.stopped_before_payment ? (
                      <span className="parar"> — parado antes do pagamento</span>
                    ) : null}
                    {step.formatWarning ? <p className="bad">{step.formatWarning}</p> : null}
                    <div className="shot">
                      {(() => {
                        const shot = describeScreenshot(step.screenshot);
                        if (shot.src) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="shot-img" src={shot.src} alt={`Print da etapa ${stepLabel(step)} (embutido no JSON)`} />
                          );
                        }
                        return shot.label;
                      })()}
                    </div>
                    {step.shotEvidence ? (
                      <p className="muted mono">
                        print {step.shotEvidence.width || "?"}×{step.shotEvidence.height || "?"} · sha256{" "}
                        {step.shotEvidence.sha256.slice(0, 12)} · {step.shotEvidence.note}
                      </p>
                    ) : null}
                    <p className="hyp">
                      {step.suggestion ? (
                        <>
                          Hipótese (não é patch): {step.suggestion.hypothesis}{" "}
                          <em>apply: false</em>
                        </>
                      ) : step.formatWarning ? (
                        "Não inventamos o nome da etapa a partir de um formato não reconhecido."
                      ) : (
                        "Sem hipótese neste passo (etapa passou ou o JSON não trouxe suggestion)."
                      )}
                    </p>
                    {step.error ? <p className="bad">{step.error}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
            {report.pages?.length ? (
              <>
                <h2>Páginas (auditoria GET, fixture/autorizado)</h2>
                <ol className="plain">
                  {report.pages.map((pg) => (
                    <li key={pg.url}>
                      {pg.url} — {pg.pass ? "ok" : "falhou"} {pg.status ? `(${pg.status})` : ""}{" "}
                      {pg.h1 ? `h1: ${pg.h1}` : "sem h1"}
                      {pg.accessibility ? (
                        <div className="muted">
                          Checagem HTML básica (heurística parcial): {pg.accessibility.findings.length} alerta
                          {pg.accessibility.findings.length === 1 ? " potencial." : "s potenciais."}
                          {pg.accessibility.findings.length ? (
                            <ul>
                              {pg.accessibility.findings.map((finding, i) => <li key={`${pg.url}-a11y-${i}`}>{finding}</li>)}
                            </ul>
                          ) : " Nenhum sinal foi encontrado nestas checagens."}
                        </div>
                      ) : null}
                      {pg.suggestion ? (
                        <p className="hyp">
                          Hipótese (não é patch): {pg.suggestion.hypothesis} <em>apply: false</em>
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {report.institutional?.length ? (
              <>
                <h2>Institucionais</h2>
                <ol className="plain">
                  {report.institutional.map((page) => (
                    <li key={page.slug}>
                      {page.slug} {page.pass ? "ok" : "falhou"} {page.status ? `(${page.status})` : ""}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {report.links?.length ? (
              <>
                <h2>Links (GET, same-origin)</h2>
                <ol className="plain">
                  {report.links.map((link) => (
                    <li key={`${link.verdict}-${link.href}`}>
                      {link.href} — {link.verdict}
                      {link.status ? ` ${link.status}` : ""}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            <h2>Console (first-party)</h2>
            {report.consoleErrors?.length ? (
              <pre className="console">{report.consoleErrors.join("\n")}</pre>
            ) : (
              <p className="muted">Nenhum erro first-party neste JSON.</p>
            )}
            {report.visual?.length ? (
              <>
                <h2>PNG de referência (local)</h2>
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
                            Diff no disco: {localFileName(v.diffPath)}. Abra{" "}
                            <span className="mono">ronda-out/report.html</span> no PC para ver o PNG.
                            Este Hobby não lê o arquivo e não envia a imagem.
                          </p>
                        );
                      })()}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            <p className="hyp">Figma: {report.figma?.reason}</p>
            <p className="hyp">Login: {report.auth?.reason}</p>
            <p className="muted">
              detects_everything: false. Sugestão = hipótese, apply: false. Figma não comparado. Este visor
              não audita loja e não abre Playwright.
            </p>
          </section>
        ) : null}
      </main>
      <footer>
        <a href="/privacidade">Privacidade</a>
        {" · "}
        <a href="/playground-estados.html">Playground de estados</a>
      </footer>
    </>
  );
}
