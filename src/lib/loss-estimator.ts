/**
 * Matemática da calculadora de prejuízo evitado — pura e testável.
 * Hipóteses explícitas (mostradas na UI): receita distribuída em horário plano
 * (30 dias × 24 h) e janela guardada = alerta em 30 s + resposta da equipe em 5 min.
 */

export const LOSS_MIN_REVENUE = 20000;
export const LOSS_MAX_REVENUE = 1000000;
export const LOSS_STEP_REVENUE = 10000;
export const LOSS_DEFAULT_REVENUE = 120000;
export const GUARDED_MINUTES = 5.5;
export const INCIDENTS_PER_MONTH = 4.3;

export type LossEstimate = {
  revenue: number;
  revenuePerHour: number;
  lossTwoHours: number;
  guardedLoss: number;
  avoidedPerIncident: number;
  avoidedPerMonth: number;
};

export function clampRevenue(revenue: number): number {
  if (!Number.isFinite(revenue)) return LOSS_DEFAULT_REVENUE;
  return Math.min(LOSS_MAX_REVENUE, Math.max(LOSS_MIN_REVENUE, Math.round(revenue)));
}

export function computeLossEstimate(rawRevenue: number): LossEstimate {
  const revenue = clampRevenue(rawRevenue);
  const revenuePerHour = revenue / (30 * 24);
  const lossTwoHours = revenuePerHour * 2;
  const guardedLoss = revenuePerHour * (GUARDED_MINUTES / 60);
  const avoidedPerIncident = lossTwoHours - guardedLoss;
  return {
    revenue,
    revenuePerHour,
    lossTwoHours,
    guardedLoss,
    avoidedPerIncident,
    avoidedPerMonth: avoidedPerIncident * INCIDENTS_PER_MONTH,
  };
}
