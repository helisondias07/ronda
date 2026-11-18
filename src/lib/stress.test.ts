import { describe, expect, it } from "vitest";
import { LIMITS } from "./limits";
import { assertNotPaid, isAllowedBrowserRequest, isPaymentCompletePath } from "./policy";
import { checkPlanned, planLinks } from "./scan";
import {
  evaluateSafeCheckoutRequest,
  parseStoreManifest,
  type StoreTargetManifest,
} from "./store-manifest";
import { describeScreenshot, parseReport } from "./viewer-parse";

/* ------------------------------------------------------------------ */
/* Fábricas locais                                                     */
/* ------------------------------------------------------------------ */

type FakeResponse = { status: number; location?: string };

function fakeFetch(routes: Record<string, FakeResponse>) {
  return async (url: string): Promise<{
    status: number;
    headers: { get(name: string): string | null };
  }> => {
    const hit = routes[url];
    if (!hit) throw new Error(`no fake route for ${url}`);
    return {
      status: hit.status,
      headers: { get: (name: string) => (name.toLowerCase() === "location" ? hit.location ?? null : null) },
    };
  };
}

function validManifestRaw(): Record<string, unknown> {
  return {
    version: 1,
    store: "loja-exemplo",
    platform: "wake",
    primaryOrigin: "https://www.lojaexemplo.com.br",
    allowedSubdomains: ["cdn.lojaexemplo.com.br"],
    allowedStaticCdns: ["*.storage.googleapis.com"],
    authorizedBy: "Equipe Loja Exemplo",
    authorizedAt: "2026-11-18T10:00:00.000Z",
    stopBeforePayment: true,
    cleanCartOnTeardown: true,
  };
}

function manifestOrThrow(raw: Record<string, unknown> = validManifestRaw()): StoreTargetManifest {
  const parsed = parseStoreManifest(raw);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.manifest;
}

const SAFE_LOCAL_MAP = { "https://local.test": "https://www.lojaexemplo.com.br" };

/* ------------------------------------------------------------------ */
/* 1. Redirecionamentos — estresse do plano de links                    */
/* ------------------------------------------------------------------ */

describe("stress: redirecionamentos no check de links", () => {
  const A = "http://127.0.0.1/a";
  const B = "http://127.0.0.1/b";
  const C = "http://127.0.0.1/c";
  const D = "http://127.0.0.1/d";

  it("marca broken em loop infinito A → B → A", async () => {
    const [out] = await checkPlanned(
      [{ href: A, verdict: "ok" }],
      fakeFetch({ [A]: { status: 302, location: B }, [B]: { status: 302, location: A } }),
    );
    expect(out.verdict).toBe("broken");
  });

  it("marca broken quando a cadeia excede maxRedirects (3 redirects, limite 2)", async () => {
    const [out] = await checkPlanned(
      [{ href: A, verdict: "ok" }],
      fakeFetch({
        [A]: { status: 301, location: B },
        [B]: { status: 301, location: C },
        [C]: { status: 301, location: D },
      }),
    );
    expect(out.verdict).toBe("broken");
  });

  it("aceita exatamente maxRedirects seguidos de 200", async () => {
    const [out] = await checkPlanned(
      [{ href: A, verdict: "ok" }],
      fakeFetch({
        [A]: { status: 301, location: B },
        [B]: { status: 302, location: C },
        [C]: { status: 200 },
      }),
    );
    expect(out.verdict).toBe("ok");
    expect(out.status).toBe(200);
  });

  it("bloqueia redirect que aponta para IP privado (SSRF)", async () => {
    const [out] = await checkPlanned(
      [{ href: A, verdict: "ok" }],
      fakeFetch({ [A]: { status: 302, location: "http://169.254.169.254/latest/meta-data" } }),
    );
    expect(out.verdict).toBe("skipped-ssrf");
  });

  it("bloqueia redirect que escapa para origem externa", async () => {
    const [out] = await checkPlanned(
      [{ href: A, verdict: "ok" }],
      fakeFetch({ [A]: { status: 302, location: "https://evil.example/steal" } }),
    );
    expect(out.verdict).toBe("skipped-external");
  });

  it("marca broken em 3xx sem header location", async () => {
    const [out] = await checkPlanned(
      [{ href: A, verdict: "ok" }],
      fakeFetch({ [A]: { status: 302 } }),
    );
    expect(out.verdict).toBe("broken");
  });

  it("limita a bateria em maxLinks + marca o restante como limited", () => {
    const hrefs = Array.from({ length: LIMITS.maxLinks + 25 }, (_, i) => `http://127.0.0.1/x${i}`);
    const planned = planLinks(hrefs, "http://127.0.0.1", true);
    const limited = planned.filter((link) => link.verdict === "limited");
    expect(planned.length).toBe(LIMITS.maxLinks + 1);
    expect(limited.length).toBe(1);
    expect(limited[0].href).toBe(`http://127.0.0.1/x${LIMITS.maxLinks}`);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Payload do visor — limites e entradas hostis                      */
/* ------------------------------------------------------------------ */

describe("stress: parseReport com payloads extremos", () => {
  it("processa 20.000 etapas sem quebrar e mantém stopped_before_payment", () => {
    const steps = Array.from({ length: 20000 }, (_, i) => ({
      id: "home",
      url: `http://127.0.0.1/p${i}.html`,
      pass: true,
      stopped_before_payment: i === 19999,
    }));
    const parsed = parseReport(JSON.stringify({ steps, stopped_before_payment: true }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.steps.length).toBe(20000);
    expect(parsed.report.steps[19999].stopped_before_payment).toBe(true);
  });

  it("rejeita JSON gigante inválido (5 MB) com mensagem amigável", () => {
    const giant = "x".repeat(5 * 1024 * 1024);
    const parsed = parseReport(giant);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/JSON inválido/i);
  });

  it("normaliza 10.000 erros de console sem perder entradas", () => {
    const consoleErrors = Array.from({ length: 10000 }, (_, i) => `Uncaught TypeError: fn${i} is not a function`);
    const parsed = parseReport(JSON.stringify({ steps: [{ id: "home", pass: true }], consoleErrors }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.consoleErrors.length).toBe(10000);
    expect(parsed.report.consoleErrors[9999]).toContain("fn9999");
  });

  it("stringifica objeto de erro profundamente aninhado sem [object Object]", () => {
    let deep: Record<string, unknown> = { leaf: "scriban" };
    for (let i = 0; i < 60; i += 1) deep = { nested: deep };
    const parsed = parseReport(
      JSON.stringify({ steps: [{ id: "produto", pass: false, error: deep }] }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.report.steps[0].error).not.toContain("[object Object]");
    expect(parsed.report.steps[0].error).toContain("scriban");
  });

  it("mantém verdict de screenshot para caminhos e data URIs hostis", () => {
    const embedded = describeScreenshot("data:image/svg+xml;base64,AAAA");
    expect(embedded.kind).toBe("embedded");
    const remote = describeScreenshot("https://cdn.evil.example/print.png");
    expect(remote.kind).toBe("local");
    expect(remote.src).toBeUndefined();
    const windowsPath = describeScreenshot("C:\\Users\\me\\ronda-out\\checkout.png");
    expect(windowsPath.kind).toBe("local");
    expect(windowsPath.label).toContain("checkout.png");
  });

  it("recusa payload com steps vazio e steps não-lista", () => {
    expect(parseReport('{"steps": []}').ok).toBe(false);
    expect(parseReport('{"steps": "nope"}').ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 3. stopped_before_payment — bateria de política                     */
/* ------------------------------------------------------------------ */

describe("stress: trava stopped_before_payment", () => {
  const manifest = manifestOrThrow();

  it("rejeita manifesto sem stopBeforePayment: true (falsy, string, ausente)", () => {
    for (const value of [false, undefined, "true", 1, null]) {
      const raw = validManifestRaw();
      raw.stopBeforePayment = value;
      expect(parseStoreManifest(raw).ok).toBe(false);
    }
  });

  it("bloqueia bateria de requisições de pagamento e hosts proibidos", () => {
    const forbidden: Array<[string, string, string, string | null]> = [
      ["https://www.lojaexemplo.com.br/graphql", "POST", "mutation checkoutComplete { checkoutComplete { id } }", "payment-mutation-blocked"],
      ["https://www.lojaexemplo.com.br/graphql", "POST", "mutation CHECKOUTCOMPLETE { x }", "payment-mutation-blocked"],
      ["https://www.lojaexemplo.com.br/graphql", "POST", '{"cardNumber":"4111111111111111","cvv":"123"}', "card-payload-blocked"],
      ["https://www.lojaexemplo.com.br/graphql", "POST", '{"query":"mutation placeOrder($x: Int)"}', "payment-mutation-blocked"],
      ["https://www.lojaexemplo.com.br/checkout/complete", "GET", "", "forbidden-checkout-path"],
      ["https://www.lojaexemplo.com.br/checkout/confirmation?order=1", "GET", "", "forbidden-checkout-path"],
      ["https://www.lojaexemplo.com.br/checkout/v3/success/", "GET", "", "forbidden-checkout-path"],
      ["https://www.lojaexemplo.com.br/admin/orders", "GET", "", "forbidden-checkout-path"],
      ["https://www.lojaexemplo.com.br/payments/charge", "GET", "", "forbidden-checkout-path"],
      ["https://mercadopago.com.br/checkout", "GET", "", "payment-domain-blocked"],
      ["https://sandbox.mercadopago.com.br/pay", "GET", "", "payment-domain-blocked"],
      ["https://assets.storage.googleapis.com/banner.png", "POST", "", "cdn-only-static-get"],
      ["https://evil.example/product", "GET", "", "unlisted-host"],
      ["http://www.lojaexemplo.com.br/product", "GET", "", "https-required"],
      ["https://user:pass@www.lojaexemplo.com.br/product", "GET", "", "credentials-forbidden"],
      ["https://www.lojaexemplo.com.br/cart", "PUT", "", "method-not-allowed"],
    ];
    for (const [requestUrl, method, postData, reason] of forbidden) {
      const verdict = evaluateSafeCheckoutRequest({ manifest, requestUrl, method, postData, testLocalOriginMap: SAFE_LOCAL_MAP });
      expect(verdict.ok).toBe(false);
      if (verdict.ok) return;
      expect(verdict.reason).toBe(reason);
    }
  });

  it("permite a jornada segura completa (vitrine, carrinho, frete, parada)", () => {
    const allowed: Array<[string, string, string | null]> = [
      ["https://www.lojaexemplo.com.br/", "GET", null],
      ["https://www.lojaexemplo.com.br/produto/tenis-runner", "GET", null],
      ["https://www.lojaexemplo.com.br/graphql", "POST", '{"operationName":"checkoutCreate","query":"mutation checkoutCreate { checkoutCreate { id } }"}'],
      ["https://www.lojaexemplo.com.br/graphql", "POST", '{"operationName":"shippingQuotes","query":"mutation shippingQuotes { shippingQuotes { price } }"}'],
      ["https://www.lojaexemplo.com.br/carrinho", "GET", null],
    ];
    for (const [requestUrl, method, postData] of allowed) {
      const verdict = evaluateSafeCheckoutRequest({ manifest, requestUrl, method, postData, testLocalOriginMap: SAFE_LOCAL_MAP });
      expect(verdict.ok).toBe(true);
    }
  });

  it("nuvemshop: bloqueia POST em /checkout/v3/* e libera /comprar e /cart/add", () => {
    const nuvem = manifestOrThrow({ ...validManifestRaw(), platform: "nuvemshop" });
    const blocked = evaluateSafeCheckoutRequest({
      manifest: nuvem,
      requestUrl: "https://www.lojaexemplo.com.br/checkout/v3/next/",
      method: "POST",
      postData: "{}",
      testLocalOriginMap: SAFE_LOCAL_MAP,
    });
    expect(blocked.ok).toBe(false);

    const cartAdd = evaluateSafeCheckoutRequest({
      manifest: nuvem,
      requestUrl: "https://www.lojaexemplo.com.br/comprar",
      method: "POST",
      postData: '{"variant_id":1,"qty":1}',
      testLocalOriginMap: SAFE_LOCAL_MAP,
    });
    expect(cartAdd.ok).toBe(true);
  });

  it("assertNotPaid recusa caminho concluído, cartão preenchido e mutation proibida", () => {
    expect(() =>
      assertNotPaid({ pathname: "/checkout/confirmation", cardValue: "", mutations: [] }),
    ).toThrow(/antes de pagar/);
    expect(() =>
      assertNotPaid({ pathname: "/produto", cardValue: "4111111111111111", mutations: [] }),
    ).toThrow(/não paga/);
    expect(() =>
      assertNotPaid({ pathname: "/produto", cardValue: "", mutations: ["checkoutCreate", "checkoutComplete"] }),
    ).toThrow(/checkoutComplete/);
    expect(() =>
      assertNotPaid({ pathname: "/produto", cardValue: "  ", mutations: ["checkoutCreate"] }),
    ).not.toThrow();
  });

  it("isAllowedBrowserRequest só aceita GET same-origin fora de rota de conclusão", () => {
    const origin = "https://www.lojaexemplo.com.br";
    expect(isAllowedBrowserRequest({ requestUrl: `${origin}/produto`, origin, method: "GET" })).toBe(true);
    expect(isAllowedBrowserRequest({ requestUrl: `${origin}/produto`, origin, method: "POST" })).toBe(false);
    expect(isAllowedBrowserRequest({ requestUrl: `${origin}/checkout/complete`, origin, method: "GET" })).toBe(false);
    expect(isAllowedBrowserRequest({ requestUrl: "https://evil.example/x", origin, method: "GET" })).toBe(false);
    expect(isPaymentCompletePath("/Checkout/Complete")).toBe(true);
  });

  it("manifesto rejeita origem IP, localhost, gateway de pagamento e listas oversize", () => {
    const ipOrigin = validManifestRaw();
    ipOrigin.primaryOrigin = "https://192.168.0.10/";
    expect(parseStoreManifest(ipOrigin).ok).toBe(false);

    const localhost = validManifestRaw();
    localhost.primaryOrigin = "https://localhost:3000/";
    expect(parseStoreManifest(localhost).ok).toBe(false);

    const gateway = validManifestRaw();
    gateway.primaryOrigin = "https://mercadopago.com.br/";
    expect(parseStoreManifest(gateway).ok).toBe(false);

    const oversize = validManifestRaw();
    oversize.allowedSubdomains = Array.from({ length: 26 }, (_, i) => `s${i}.lojaexemplo.com.br`);
    expect(parseStoreManifest(oversize).ok).toBe(false);
  });
});
