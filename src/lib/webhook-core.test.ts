import { describe, expect, it } from "vitest";
import { createIdempotencyStore, extractPlanId, handleStripeEvent, webhookMode, type StripeLikeEvent } from "./webhook-core";

const completed = (id: string, planId = "loja"): StripeLikeEvent => ({
  id,
  type: "checkout.session.completed",
  data: { object: { metadata: { planId, priceBRL: "147" } } },
});

describe("webhook-core: modo", () => {
  it("sem STRIPE_WEBHOOK_SECRET roda em mock; com secret exige assinatura (live)", () => {
    expect(webhookMode(undefined)).toBe("mock");
    expect(webhookMode("")).toBe("mock");
    expect(webhookMode("whsec_x")).toBe("live");
  });
});

describe("webhook-core: idempotência e triagem", () => {
  it("processa checkout.session.completed uma única vez por event id", () => {
    const store = createIdempotencyStore();
    const first = handleStripeEvent(completed("evt_1"), store);
    expect(first).toEqual({ status: "processed", planId: "loja" });
    const second = handleStripeEvent(completed("evt_1"), store);
    expect(second).toEqual({ status: "duplicate" });
    const third = handleStripeEvent(completed("evt_1"), store);
    expect(third).toEqual({ status: "duplicate" });
  });

  it("eventos repetidos com ids diferentes ainda processam (reenvio legítimo do Stripe)", () => {
    const store = createIdempotencyStore();
    expect(handleStripeEvent(completed("evt_a"), store).status).toBe("processed");
    expect(handleStripeEvent(completed("evt_b"), store).status).toBe("processed");
  });

  it("ignora tipos não tratados sem marcar o store", () => {
    const store = createIdempotencyStore();
    const outcome = handleStripeEvent({ ...completed("evt_2"), type: "payment_intent.succeeded" }, store);
    expect(outcome.status).toBe("ignored");
    // o mesmo id, agora como completed, ainda pode processar
    expect(handleStripeEvent(completed("evt_2"), store).status).toBe("processed");
  });

  it("sessão sem planId é ignorada e marcada (reenvio cai em duplicate, sem loop)", () => {
    const store = createIdempotencyStore();
    const broken = { ...completed("evt_3"), data: { object: { metadata: null } } };
    expect(handleStripeEvent(broken, store)).toEqual({ status: "ignored", reason: "sessão sem planId nos metadados" });
    expect(handleStripeEvent(broken, store)).toEqual({ status: "duplicate" });
  });

  it("evento sem id não quebra o webhook", () => {
    const store = createIdempotencyStore();
    const outcome = handleStripeEvent({ id: "", type: "checkout.session.completed", data: { object: { metadata: { planId: "loja" } } } }, store);
    expect(outcome.status).toBe("ignored");
  });

  it("extrai planId dos metadados com tolerância a formatos ausentes", () => {
    expect(extractPlanId(completed("x", "agencia"))).toBe("agencia");
    expect(extractPlanId({ id: "x", type: "t", data: { object: { metadata: {} } } })).toBeNull();
    expect(extractPlanId({ id: "x", type: "t", data: { object: { metadata: null } } })).toBeNull();
  });
});
