import type { CheckoutMode } from "./checkout-core";

/**
 * Idempotência e triagem de eventos do webhook Stripe — puros e testáveis.
 * O armazenamento é por instância (Map em memória): suficiente para o runner
 * Hobby atual; migração futura para tabela persistente quando o painel multi-
 * tenant existir.
 */

export type StripeLikeEvent = {
  id: string;
  type: string;
  data: { object: { metadata?: Record<string, string> | null } };
};

export type EventOutcome =
  | { status: "processed"; planId: string }
  | { status: "duplicate" }
  | { status: "ignored"; reason: string };

export type IdempotencyStore = {
  has(eventId: string): boolean;
  mark(eventId: string): void;
};

export function createIdempotencyStore(): IdempotencyStore {
  const seen = new Set<string>();
  return {
    has: (eventId) => seen.has(eventId),
    mark: (eventId) => {
      seen.add(eventId);
    },
  };
}

export function extractPlanId(event: StripeLikeEvent): string | null {
  const metadata = event.data?.object?.metadata;
  const planId = metadata?.planId;
  return typeof planId === "string" && planId ? planId : null;
}

/**
 * Trata checkout.session.completed com idempotência. Nenhum outro tipo de
 * evento altera estado; erros de dados não derrubam o webhook (200 + ignored).
 */
export function handleStripeEvent(event: StripeLikeEvent, store: IdempotencyStore): EventOutcome {
  if (!event || typeof event.id !== "string" || !event.id) {
    return { status: "ignored", reason: "evento sem id" };
  }
  if (event.type !== "checkout.session.completed") {
    return { status: "ignored", reason: `tipo não tratado: ${String(event.type)}` };
  }
  if (store.has(event.id)) {
    return { status: "duplicate" };
  }
  const planId = extractPlanId(event);
  if (!planId) {
    // marca mesmo sem plano para não reprocessar eventos malformados em loop
    store.mark(event.id);
    return { status: "ignored", reason: "sessão sem planId nos metadados" };
  }
  store.mark(event.id);
  return { status: "processed", planId };
}

/** Modo mock: sem STRIPE_WEBHOOK_SECRET, o webhook aceita payload assinatura-free para CI. */
export function webhookMode(webhookSecret: string | undefined): CheckoutMode {
  return webhookSecret && webhookSecret.trim().length > 0 ? "live" : "mock";
}
