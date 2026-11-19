import { describe, expect, it } from "vitest";
import { PLANS } from "./plans";
import {
  MOCK_CHECKOUT_PATH,
  buildMockCheckoutUrl,
  buildStripeCheckoutParams,
  planCheckoutResponse,
  resolveCheckoutMode,
  validatePlanForCheckout,
} from "./checkout-core";

describe("checkout-core: modo e validação", () => {
  it("sem STRIPE_SECRET_KEY a rota opera em mock (build/CI verdes)", () => {
    expect(resolveCheckoutMode({})).toBe("mock");
    expect(resolveCheckoutMode({ stripeSecretKey: "  " })).toBe("mock");
    expect(resolveCheckoutMode({ stripeSecretKey: "sk_test_x" })).toBe("live");
  });

  it("valida planId contra a fonte única de planos", () => {
    for (const plan of PLANS) {
      expect(validatePlanForCheckout(plan.id)).toBe(plan);
    }
    expect(validatePlanForCheckout("premium")).toBeNull();
    expect(validatePlanForCheckout(97)).toBeNull();
    expect(validatePlanForCheckout(null)).toBeNull();
  });

  it("rejeita corpo inválido com 400 e mensagem clara", () => {
    const bad = planCheckoutResponse({}, "premium");
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.status).toBe(400);
    expect(bad.error).toMatch(/plano inválido/);
  });

  it("modo mock devolve URL de simulação determinística com plano e sessão", () => {
    const result = planCheckoutResponse({ baseUrl: "https://ronda-tawny-xi.vercel.app/" }, "loja");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe("mock");
    expect(result.url).toContain("https://ronda-tawny-xi.vercel.app/checkout/simulado");
    expect(result.url).toContain("plan=loja");
    expect(result.url).toContain("session=mock_loja_14700");
    expect(result.plan.price).toBe(147);
  });
});

describe("checkout-core: sessão real do Stripe", () => {
  it("express é pagamento único; loja e agência são assinatura mensal", () => {
    expect(buildStripeCheckoutParams({ plan: PLANS[0] }).mode).toBe("payment");
    expect(buildStripeCheckoutParams({ plan: PLANS[1] }).mode).toBe("subscription");
    expect(buildStripeCheckoutParams({ plan: PLANS[2] }).mode).toBe("subscription");
  });

  it("line item em BRL com preço do contrato (centavos) e metadados do plano", () => {
    for (const plan of PLANS) {
      const params = buildStripeCheckoutParams({ plan, baseUrl: "https://exemplo.app/" });
      const item = params.lineItems[0];
      expect(item.quantity).toBe(1);
      expect(item.price_data.currency).toBe("brl");
      expect(item.price_data.unit_amount).toBe(plan.price * 100);
      if (plan.recurring) {
        expect(item.price_data.recurring).toEqual({ interval: "month" });
      } else {
        expect(item.price_data.recurring).toBeUndefined();
      }
      expect(params.metadata.planId).toBe(plan.id);
      expect(params.successUrl.startsWith("https://exemplo.app/")).toBe(true);
      expect(params.cancelUrl).toBe("https://exemplo.app/#plano");
    }
  });

  it("nenhum parâmetro de sessão coleta dados de cartão (PCI-DSS por design)", () => {
    const params = buildStripeCheckoutParams({ plan: PLANS[1] });
    const serialized = JSON.stringify(params);
    expect(serialized).not.toMatch(/card|cvv|cvc|credit/i);
    expect(MOCK_CHECKOUT_PATH.startsWith("/checkout/")).toBe(true);
  });
});
