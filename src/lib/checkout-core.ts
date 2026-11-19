import { PLANS, type Plan } from "./plans";

/**
 * Núcleo puro do checkout hospedado (Stripe Checkout) — sem IO, testável.
 * PCI-DSS por design: nenhum dado de cartão passa pelo nosso servidor; o
 * comprador é redirecionado para a página hospedada do Stripe.
 */

export type CheckoutMode = "live" | "mock";

export type CheckoutEnv = {
  stripeSecretKey?: string;
  webhookSecret?: string;
  baseUrl?: string;
};

export type CheckoutRequestResult =
  | { ok: true; plan: Plan; mode: CheckoutMode; url: string }
  | { ok: false; status: number; error: string };

export const MOCK_CHECKOUT_PATH = "/checkout/simulado";

export function resolveCheckoutMode(env: CheckoutEnv): CheckoutMode {
  return env.stripeSecretKey && env.stripeSecretKey.trim().length > 0 ? "live" : "mock";
}

export function validatePlanForCheckout(planId: unknown): Plan | null {
  if (typeof planId !== "string") return null;
  return PLANS.find((plan) => plan.id === planId) ?? null;
}

function normalizeBaseUrl(raw?: string): string {
  if (!raw) return "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Sessão simulada, determinística, para CI e ambiente sem chaves Stripe. */
export function buildMockCheckoutUrl(env: CheckoutEnv, plan: Plan): string {
  const session = `mock_${plan.id}_${plan.price}00`;
  return `${normalizeBaseUrl(env.baseUrl)}${MOCK_CHECKOUT_PATH}?plan=${encodeURIComponent(plan.id)}&session=${session}`;
}

/** Sucesso/cancelo de uma sessão real do Stripe. */
export function buildStripeCheckoutParams(input: { plan: Plan; baseUrl?: string }): {
  mode: "payment" | "subscription";
  lineItems: Array<{
    price_data: {
      currency: "brl";
      unit_amount: number;
      product_data: { name: string; description: string };
      recurring?: { interval: "month" };
    };
    quantity: 1;
  }>;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
} {
  const { plan } = input;
  const base = normalizeBaseUrl(input.baseUrl);
  return {
    mode: plan.recurring ? "subscription" : "payment",
    lineItems: [
      {
        price_data: {
          currency: "brl",
          unit_amount: plan.price * 100,
          product_data: {
            name: `CheckoutGuard — ${plan.name}`,
            description: plan.tagline,
          },
          ...(plan.recurring ? { recurring: { interval: "month" as const } } : {}),
        },
        quantity: 1,
      },
    ],
    metadata: { planId: plan.id, priceBRL: String(plan.price) },
    successUrl: `${base}${MOCK_CHECKOUT_PATH}?sucesso=1&plan=${encodeURIComponent(plan.id)}`,
    cancelUrl: `${base}/#plano`,
  };
}

/** Orquestra a decisão da rota /api/checkout sem tocar em rede. */
export function planCheckoutResponse(env: CheckoutEnv, rawPlanId: unknown): CheckoutRequestResult {
  const plan = validatePlanForCheckout(rawPlanId);
  if (!plan) {
    return {
      ok: false,
      status: 400,
      error: "plano inválido: use um dos planos comerciais (express, loja ou agencia).",
    };
  }
  const mode = resolveCheckoutMode(env);
  if (mode === "mock") {
    return { ok: true, plan, mode, url: buildMockCheckoutUrl(env, plan) };
  }
  // Modo live: a rota cria a sessão via SDK e devolve a URL real do Stripe.
  return { ok: true, plan, mode, url: "" };
}
