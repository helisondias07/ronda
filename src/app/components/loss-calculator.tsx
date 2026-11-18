"use client";

import { useMemo, useState } from "react";

const MIN_REVENUE = 20000;
const MAX_REVENUE = 1000000;
const STEP_REVENUE = 10000;
const DEFAULT_REVENUE = 120000;

/** Janela estimada com alerta em 30s + resposta da equipe em 5 min. */
const GUARDED_MINUTES = 5.5;
const INCIDENT_WEEKS = 4.3;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function LossCalculator() {
  const [revenue, setRevenue] = useState(DEFAULT_REVENUE);

  const result = useMemo(() => {
    const hourly = revenue / (30 * 24);
    const lossTwoHours = hourly * 2;
    const guardedLoss = hourly * (GUARDED_MINUTES / 60);
    const avoidedPerIncident = lossTwoHours - guardedLoss;
    return {
      hourly,
      lossTwoHours,
      guardedLoss,
      avoidedPerIncident,
      avoidedPerMonth: avoidedPerIncident * INCIDENT_WEEKS,
    };
  }, [revenue]);

  return (
    <div className="cg-calc">
      <div className="cg-calc-controls">
        <label htmlFor="cg-revenue-slider">
          Faturamento mensal da loja: <strong>{brl.format(revenue)}</strong>
        </label>
        <input
          id="cg-revenue-slider"
          type="range"
          min={MIN_REVENUE}
          max={MAX_REVENUE}
          step={STEP_REVENUE}
          value={revenue}
          onChange={(event) => setRevenue(Number(event.currentTarget.value))}
          aria-describedby="cg-calc-hint"
        />
        <p id="cg-calc-hint" className="cg-calc-hint">
          Estimativa educativa: receita distribuída em horário plano (30 dias × 24 h), sem considerar pico de
          campanha. “Com CheckoutGuard” considera alerta em ~30s + resposta da equipe em 5 min — o tempo de correção
          depende de cada loja. Em campanha de Meta Ads, o tráfego pago continua entrando na página quebrada até
          alguém perceber.
        </p>
      </div>

      <div className="cg-calc-grid">
        <div className="cg-calc-card is-bad">
          <span className="cg-calc-label">2 h de checkout quebrado sem monitor</span>
          <span className="cg-calc-value">{brl.format(result.lossTwoHours)}</span>
          <span className="cg-calc-sub">≈ {brl.format(result.hourly)} de receita por hora</span>
        </div>
        <div className="cg-calc-card is-ok">
          <span className="cg-calc-label">Janela com CheckoutGuard (alerta em 30s)</span>
          <span className="cg-calc-value">{brl.format(result.guardedLoss)}</span>
          <span className="cg-calc-sub">detecção + reteste antes de virar prejuízo</span>
        </div>
        <div className="cg-calc-card is-hero">
          <span className="cg-calc-label">Prejuízo evitado por incidente</span>
          <span className="cg-calc-value">{brl.format(result.avoidedPerIncident)}</span>
          <span className="cg-calc-sub">≈ {brl.format(result.avoidedPerMonth)} / mês com 1 incidente por semana</span>
        </div>
      </div>
    </div>
  );
}
