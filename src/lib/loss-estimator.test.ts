import { describe, expect, it } from "vitest";
import {
  GUARDED_MINUTES,
  INCIDENTS_PER_MONTH,
  LOSS_DEFAULT_REVENUE,
  LOSS_MAX_REVENUE,
  LOSS_MIN_REVENUE,
  clampRevenue,
  computeLossEstimate,
} from "./loss-estimator";

describe("loss-estimator: matemática da calculadora", () => {
  it("calcula o prejuízo de 2h para o faturamento padrão (R$ 120.000/mês)", () => {
    const e = computeLossEstimate(120000);
    // 120000 / (30*24) = 166,67/h · 2h = 333,33
    expect(e.revenuePerHour).toBeCloseTo(166.6667, 3);
    expect(e.lossTwoHours).toBeCloseTo(333.3333, 3);
    // janela guardada: 5,5 min de uma hora → 166,67 * (5.5/60) = 15,28
    expect(e.guardedLoss).toBeCloseTo(15.2778, 3);
    expect(e.avoidedPerIncident).toBeCloseTo(318.0556, 3);
    // 1 incidente/semana → 4,3 no mês
    expect(e.avoidedPerMonth).toBeCloseTo(318.0556 * 4.3, 3);
  });

  it("evitado por incidente é sempre positivo dentro do range", () => {
    for (const revenue of [LOSS_MIN_REVENUE, 50000, 250000, 750000, LOSS_MAX_REVENUE]) {
      const e = computeLossEstimate(revenue);
      expect(e.avoidedPerIncident).toBeGreaterThan(0);
      expect(e.lossTwoHours).toBeGreaterThan(e.guardedLoss);
    }
  });

  it("limita (clamp) o faturamento aos extremos do slider", () => {
    expect(computeLossEstimate(1).revenue).toBe(LOSS_MIN_REVENUE);
    expect(computeLossEstimate(99_999_999).revenue).toBe(LOSS_MAX_REVENUE);
    expect(clampRevenue(-50)).toBe(LOSS_MIN_REVENUE);
  });

  it("entrada inválida (NaN/Infinity) cai no padrão, sem quebrar a UI", () => {
    expect(clampRevenue(Number.NaN)).toBe(LOSS_DEFAULT_REVENUE);
    expect(clampRevenue(Number.POSITIVE_INFINITY)).toBe(LOSS_DEFAULT_REVENUE);
    expect(computeLossEstimate(Number.NaN).revenue).toBe(LOSS_DEFAULT_REVENUE);
  });

  it("constantes do modelo seguem o contrato exibido na landing", () => {
    expect(GUARDED_MINUTES).toBe(5.5);
    expect(INCIDENTS_PER_MONTH).toBeCloseTo(4.3, 5);
    expect(LOSS_MIN_REVENUE).toBe(20000);
    expect(LOSS_MAX_REVENUE).toBe(1000000);
  });

  it("dobra o faturamento, dobra o prejuízo (relação linear, sem taxonomia escondida)", () => {
    const base = computeLossEstimate(100000);
    const dobrou = computeLossEstimate(200000);
    expect(dobrou.lossTwoHours).toBeCloseTo(base.lossTwoHours * 2, 3);
    expect(dobrou.avoidedPerIncident).toBeCloseTo(base.avoidedPerIncident * 2, 3);
  });
});
