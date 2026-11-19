import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createIdempotencyStore, handleStripeEvent, webhookMode } from "../../../../lib/webhook-core";

/**
 * POST /api/webhooks/stripe
 * Registra checkout.session.completed com validação de assinatura (live) e
 * idempotência por event id. Sem STRIPE_WEBHOOK_SECRET, roda em modo mock para
 * CI/desenvolvimento — nunca em produção com cobrança real.
 */

const store = createIdempotencyStore();

export async function POST(request: Request): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();

  const mode = webhookMode(secret);
  if (mode === "live") {
    if (!signature) {
      return NextResponse.json({ error: "assinatura ausente" }, { status: 400 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(payload, signature, secret as string);
    } catch {
      return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
    }
    const outcome = handleStripeEvent(
      {
        id: event.id,
        type: event.type,
        data: { object: { metadata: (event.data.object as { metadata?: Record<string, string> }).metadata } },
      },
      store,
    );
    return NextResponse.json({ received: true, mode, outcome });
  }

  // Modo mock (CI/local): payload JSON direto, sem assinatura.
  try {
    const parsed = JSON.parse(payload) as { id?: string; type?: string; data?: { object?: { metadata?: Record<string, string> } } };
    const outcome = handleStripeEvent(
      {
        id: typeof parsed.id === "string" ? parsed.id : "",
        type: typeof parsed.type === "string" ? parsed.type : "",
        data: { object: { metadata: parsed.data?.object?.metadata ?? null } },
      },
      store,
    );
    return NextResponse.json({ received: true, mode, outcome });
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
