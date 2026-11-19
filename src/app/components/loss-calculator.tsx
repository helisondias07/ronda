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
      <div>
        <label htmlFor="cg-revenue-slider">Faturamento mensal da loja</label>
        <output className="cg-calc-value" htmlFor="cg-revenue-slider">
          {brl.format(estimate.revenue)}
        </output>
        <input
          id="cg-revenue-slider"
          type="range"
          min={LOSS_MIN_REVENUE}
          max={LOSS_MAX_REVENUE}
          step={LOSS_STEP_REVENUE}
          value={revenue}
          onChange={(event) => setRevenue(Number(event.currentTarget.value))}
          aria-describedby="cg-calc-legend"
        />
        <p className="cg-calc-legend" id="cg-calc-legend">
          receita dividida em 30 dias × 24 h de horário plano; campanha concentra mais. Janela guardada de
          5 min 30 s — alerta em 30 s mais a resposta da equipe.
        </p>
      </div>

      <div>
        <p className="cg-calc-out-label">perda estimada · 2 horas fora</p>
        <p className="cg-calc-figure">{brl.format(estimate.lossTwoHours)}</p>
        <p className="cg-calc-unit">{brl.format(estimate.revenuePerHour)} por hora · estimativa, não promessa</p>
        <p className="cg-calc-sub">
          Com o aviso chegando em 30 s, a janela cai para {brl.format(estimate.guardedLoss)} —{" "}
          <strong>{brl.format(estimate.avoidedPerIncident)} evitados por incidente</strong>, cerca de{" "}
          {brl.format(estimate.avoidedPerMonth)} por mês com um incidente por semana.
        </p>
      </div>
    </div>
  );
}
