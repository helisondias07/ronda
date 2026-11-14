"use client";

import { useMemo, useState } from "react";
import { isPassing } from "@/lib/report";
import type { Report } from "@/lib/types";

const EXAMPLE: Report = {
  store: "fixture-demo-qa",
  platform: "wake-mock",
  target: "fixture",
  stopped_before_payment: true,
  consoleErrors: [],
  steps: [
    { id: "home", url: "http://127.0.0.1/home.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/home.png" },
    { id: "categoria", url: "http://127.0.0.1/categoria.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/categoria.png" },
    { id: "produto", url: "http://127.0.0.1/produto.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/produto.png" },
    { id: "carrinho", url: "http://127.0.0.1/carrinho.html", pass: true, stopped_before_payment: false, screenshot: "ronda-out/carrinho.png" },
    { id: "checkout", url: "http://127.0.0.1/checkout.html", pass: true, stopped_before_payment: true, screenshot: "ronda-out/checkout.png" },
  ],
};

function parseReport(raw: string): { ok: true; report: Report } | { ok: false; message: string } {
  try {
    const data = JSON.parse(raw) as Report;
    if (!data || !Array.isArray(data.steps)) {
      return { ok: false, message: "JSON sem a lista de etapas." };
    }
    return { ok: true, report: data };
  } catch {
    return { ok: false, message: "JSON inválido. Cole o report.json gerado no seu computador." };
  }
}

export function Viewer() {
  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingExample, setUsingExample] = useState(false);

  const status = useMemo(() => {
    if (!report) return null;
    if (isPassing(report)) return { className: "pill ok", label: "passou · stopped_before_payment" };
    if (report.steps.some((s) => s.stopped_before_payment)) {
      return { className: "pill stop", label: "parado antes do pagamento" };
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
      <header className="tape">
        <h1>Ronda</h1>
        <p>
          Laudo da jornada de compra. Esta página <strong>não testa loja</strong> e não tem acesso à sua
          vitrine. A ronda roda no seu PC; aqui você só lê o JSON.
        </p>
      </header>
      <main>
        <section className="slip" aria-labelledby="como">
          <h2 id="como">Como funciona de verdade</h2>
          <ol>
            <li>
              No repositório: <code>npm install</code>, <code>npx playwright install chromium</code>,{" "}
              <code>npm test</code>.
            </li>
            <li>
              Jornada no fixture: <code>npm run ronda</code>. Gera <code>ronda-out/report.json</code> e
              prints. Para no “Forma de pagamento”.
            </li>
            <li>Cole o JSON abaixo. Sugestão de correção vem no laudo; aplicar no tema é outro fluxo.</li>
          </ol>
          <p className="muted">
            Sem OpenCode Go, sem chave de LLM, sem Admin Wake, sem pedido. Preview localhost só com{" "}
            <code>--autorizo-este-ambiente</code>.
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
            <p>
              Alvo: {report.target} · plataforma: {report.platform}
            </p>
            <ol className="steps">
              {report.steps.map((step) => (
                <li key={`${step.id}-${step.url}`}>
                  <strong>{step.id}</strong> {step.pass ? "ok" : "falhou"}
                  {step.stopped_before_payment ? " — parado antes do pagamento" : ""}
                  <div className="shot">{step.screenshot || "sem print"}</div>
                  {step.suggestion ? (
                    <p className="hyp">
                      {step.suggestion.hypothesis} <em>apply: false</em>
                    </p>
                  ) : null}
                  {step.error ? <p className="bad">{step.error}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </main>
      <footer>
        <a href="/privacidade">Privacidade</a>
        {" · "}
        Playground: <code>docs/playground-estados.html</code>
      </footer>
    </>
  );
}
