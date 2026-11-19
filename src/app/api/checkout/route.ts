import { NextResponse } from "next/server";
import Stripe from "stripe";
import { buildStripeCheckoutParams, planCheckoutResponse, resolveCheckoutMode } from "../../../lib/checkout-core";

/**
 * POST /api/checkout { planId }
 * Cria sessão de Stripe Checkout hospedada (PCI-DSS: nenhum dado de cartão
 * passa por este servidor — o comprador segue para a página segura do Stripe).
 * Sem STRIPE_SECRET_KEY, responde em modo mock com URL de simulação (CI/local).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: envie JSON { planId }." }, { status: 400 });
  }

  const planId = (body as { planId?: unknown } | null)?.planId;
  const env = {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  };
  const planned = planCheckoutResponse(env, planId);
  if (!planned.ok) {
    return NextResponse.json({ error: planned.error }, { status: planned.status });
  }

  if (planned.mode === "mock") {
    return NextResponse.json({ mode: "mock", planId: planned.plan.id, url: planned.url });
  }

  try {
    const stripe = new Stripe(env.stripeSecretKey as string);
    const params = buildStripeCheckoutParams({ plan: planned.plan, baseUrl: env.baseUrl });
    const session = await stripe.checkout.sessions.create({
      mode: params.mode,
      line_items: params.lineItems,
      metadata: params.metadata,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    if (!session.url) {
      throw new Error("sessão sem URL de redirecionamento");
    }
    return NextResponse.json({ mode: "live", planId: planned.plan.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha ao criar sessão no Stripe";
    return NextResponse.json(
      { error: `checkout indisponível: ${message}. Use o e-mail de contratação.`, fallback: "mailto" },
      { status: 502 },
    );
  }
}

export const dynamic = "force-dynamic";
