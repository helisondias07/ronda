"use client";

import { useEffect, useState } from "react";

/**
 * Simulação visual de uma ronda ao vivo: Home → Produto → Frete CEP → Checkout,
 * com erro 500 Scriban camuflado em HTTP 200 e notificação WhatsApp chegando em ~30s.
 * Estados da máquina (loop):
 *  0 Home ativa · 1 Produto ativa · 2 erro Scriban revelado · 3 Frete CEP ok
 *  4 Checkout parado antes de pagar · 5 WhatsApp chega · 6 estado final (pausa)
 */
const PHASE_MS = 1500;
const FINAL_PHASE = 6;

const STEPS = [
  { id: "home", label: "Home", ok: "vitrine renderizada · HTTP 200" },
  { id: "produto", label: "Produto (PDP)", ok: "preço e botão Comprar carregados" },
  { id: "frete", label: "Frete CEP", ok: "cotação simulada · sem pagamento" },
  { id: "checkout", label: "Checkout", ok: "parada segura · stopped_before_payment: true" },
] as const;

export function FlowSimulation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(FINAL_PHASE);
      return;
    }
    const timer = window.setInterval(() => {
      setPhase((current) => (current >= FINAL_PHASE ? 0 : current + 1));
    }, PHASE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const errorRevealed = phase >= 2;
  const freteDone = phase >= 3;
  const checkoutDone = phase >= 4;
  const whatsappArrived = phase >= 5;

  const stepState = (index: number): "idle" | "active" | "error" | "done" => {
    if (index === 1) return errorRevealed ? "error" : phase === 1 ? "active" : phase > 1 ? "error" : "idle";
    if (index === 2) return freteDone ? "done" : phase === 3 ? "active" : "idle";
    if (index === 3) return checkoutDone ? "done" : phase === 4 ? "active" : "idle";
    return phase === 0 ? "active" : "done";
  };

  return (
    <div className="cg-flow" role="img" aria-label="Simulação de ronda: a etapa Produto devolve HTTP 200 com erro 500 Scriban escondido no corpo, e um alerta chega no WhatsApp da loja cerca de 30 segundos depois.">
      <div className="cg-flow-head">
        <span className="cg-flow-dot" aria-hidden="true" />
        <span className="cg-flow-title">ronda ao vivo · loja-exemplo.com.br (Wake)</span>
        <span className="cg-flow-timer">T+30s</span>
      </div>

      <ol className="cg-flow-steps" aria-hidden="true">
        {STEPS.map((step, index) => {
          const state = stepState(index);
          return (
            <li key={step.id} className={`cg-flow-step is-${state}`}>
              <span className="cg-flow-step-label">{String(index + 1).padStart(2, "0")} · {step.label}</span>
              <span className="cg-flow-step-note">
                {state === "error"
                  ? 'HTTP 200 · corpo {"status_code":500} — erro Scriban camuflado'
                  : state === "idle"
                    ? "aguardando…"
                    : step.ok}
              </span>
            </li>
          );
        })}
      </ol>

      <div className={`cg-phone ${whatsappArrived ? "is-visible" : ""}`} aria-hidden="true">
        <div className="cg-phone-head">
          <span className="cg-phone-app">WhatsApp · Alertas CheckoutGuard</span>
          <span className="cg-phone-time">14:32</span>
        </div>
        <div className="cg-phone-body">
          <p className="cg-phone-msg">
            🚨 <strong>Quebra confirmada na PDP “Tênis Runner”.</strong> Botão Comprar quebrado: erro Scriban 500
            dentro de um HTTP 200 — ping comum não enxerga.
          </p>
          <p className="cg-phone-msg">
            ✅ Reteste automático confirmou em 30s.
            <br />
            🛑 Nenhum pedido criado · carrinho limpo no teardown · etapa 03/05.
          </p>
        </div>
        <p className="cg-phone-note">
          Simulação visual: o alerta real chega no WhatsApp da loja ~30s após a quebra ser confirmada pelo reteste.
        </p>
      </div>

      <div className="cg-flow-foot" aria-hidden="true">
        <span className={`cg-chip ${errorRevealed ? "is-bad" : ""}`}>reteste em 30s</span>
        <span className={`cg-chip ${checkoutDone ? "is-ok" : ""}`}>0 pedidos fantasmas</span>
        <span className={`cg-chip ${checkoutDone ? "is-ok" : ""}`}>carrinho limpo no fim</span>
        <button
          type="button"
          className="cg-flow-replay"
          onClick={() => setPhase(0)}
        >
          ↻ reproduzir simulação
        </button>
      </div>
    </div>
  );
}
