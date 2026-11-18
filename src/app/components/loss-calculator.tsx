"use client";

import { useMemo, useState } from "react";
import {
  LOSS_DEFAULT_REVENUE,
  LOSS_MAX_REVENUE,
  LOSS_MIN_REVENUE,
  LOSS_STEP_REVENUE,
  computeLossEstimate,
} from "../../lib/loss-estimator";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function LossCalculator() {
  const [revenue, setRevenue] = useState(LOSS_DEFAULT_REVENUE);
  const estimate = useMemo(() => computeLossEstimate(revenue), [revenue]);

  return (
    <div className="cg-calc">
      <div className="cg-calc-ctl">
        <label htmlFor="cg-revenue-slider">
          Quanto a sua loja fatura por mês?
          <span className="cg-calc-answer" aria-live="polite">{brl.format(estimate.revenue)}</span>
        </label>
        <input
          id="cg-revenue-slider"
          type="range"
          min={LOSS_MIN_REVENUE}
          max={LOSS_MAX_REVENUE}
          step={LOSS_STEP_REVENUE}
          value={revenue}
          onChange={(event) => setRevenue(Number(event.currentTarget.value))}
          aria-describedby="cg-calc-assumptions"
        />
        <p className="cg-small" id="cg-calc-assumptions">
          Estimativa com hipóteses visíveis: receita dividida em 30 dias × 24 h de horário plano (campanha
          concentra mais) e janela guardada de 5 min 30 s — alerta em 30 s mais a resposta da sua equipe. Sem
          monitor, duas horas de botão quebrado ficam assim:
        </p>
      </div>

      <div className="cg-calc-result">
        <p className="cg-calc-figure">{brl.format(estimate.lossTwoHours)}</p>
        <p className="cg-calc-figure-note">
          queimados em 2 h de checkout quebrado · {brl.format(estimate.revenuePerHour)} por hora
        </p>
        <p className="cg-calc-figure-sub">
          Com o aviso chegando em 30 s, a janela cai para {brl.format(estimate.guardedLoss)} —{" "}
          <strong>{brl.format(estimate.avoidedPerIncident)} evitados por incidente</strong>, cerca de{" "}
          {brl.format(estimate.avoidedPerMonth)} por mês com um incidente por semana.
        </p>
      </div>
    </div>
  );
}
