import { isIP } from "node:net";
import type { BrowserContext, Page } from "playwright";

export type StorePlatform = "wake" | "nuvemshop";

export type StoreJourneyPaths = {
  startPath?: string;
  categoryPath?: string;
  productPath?: string;
  cartPath?: string;
  checkoutPath?: string;
  postalCode?: string;
};

export type StoreTargetManifest = {
  version: 1;
  store: string;
  platform: StorePlatform;
  primaryOrigin: string;
  allowedSubdomains: string[];
  allowedStaticCdns: string[];
  authorizedBy: string;
  authorizedAt: string;
  stopBeforePayment: true;
  cleanCartOnTeardown: boolean;
  journey?: StoreJourneyPaths;
};

const PAYMENT_HOST_SUFFIXES = [
  "mercadopago.com",
  "mercadopago.com.br",
  "mercadolivre.com",
  "mercadolibre.com",
  "pagonube.com",
  "pagarme.me",
  "pagar.me",
  "stone.com.br",
  "mundipagg.com",
  "cielo.com.br",
  "redecard.com.br",
  "userede.com.br",
  "getnet.com.br",
  "adyen.com",
  "adyenpayments.com",
  "stripe.com",
  "stripecdn.com",
  "braspag.com.br",
  "vindi.com.br",
  "asaas.com",
  "abacatepay.com",
  "appmax.com.br",
  "pagseguro.uol.com.br",
  "pagbank.com.br",
  "paypal.com",
  "shopifycs.com",
  "ebanx.com",
  "iugu.com",
  "yapay.com.br",
];

const FORBIDDEN_PATH_RE =
  /(^|\/)checkout\/(complete|confirmation|confirm|success|thank[-_]?you|order[-_]?placed)(\/|$)|(^|\/)checkout\/v3\/(success|complete|pay)(\/|$)|(^|\/)(admin|wp-admin|fbits-admin|painel)(\/|$)|(^|\/)(tokenize|authorize|capture)(\/|$)|(^|\/)payments?\/(charge|confirm|complete|capture)(\/|$)/i;

const FORBIDDEN_GRAPHQL_RE =
  /\b(checkoutComplete|checkoutPayment\w*|paymentCreate\w*|placeOrder\w*|SubmitForCompletion|completeCheckout|authorizePayment|capturePayment|tokenizeCard|creditCard\w*|pixGenerate\w*|boletoGenerate\w*)\b/i;

const WAKE_SAFE_MUTATIONS_RE =
  /\b(checkoutCreate|checkoutProductAdd|checkoutProductRemove|checkoutClean|checkoutQuantityUpdate|shippingQuotes|checkoutZipcodeUpdate|checkoutPartnerAssociate|checkoutCouponAdd|checkoutCouponRemove|checkoutAddressAssociate)\b/;

const WAKE_SAFE_POST_PATH_RE =
  /^\/(graphql|api\/graphql|sf\/graphql|carrinho(\/.*)?|cart(\/.*)?|frete(\/.*)?|shipping(\/.*)?)$/i;

const NUVEMSHOP_SAFE_POST_PATH_RE =
  /^\/(comprar(\/.*)?|cart\/(add|update|remove|clear)(\/.*)?|ajax\/cart(\/.*)?|shipping(\/.*)?|frete(\/.*)?|cep(\/.*)?)$/i;

const CARD_PAYLOAD_KEY_RE =
  /"(cardNumber|card_number|credit_card|creditCard|cc_number|ccNumber|cvv|cvc|securityCode|encryptedCard|cardToken)"\s*:/i;

const FINALIZE_CONTROL_RE =
  /finalizar\s*(a\s*)?(compra|pedido)?|concluir\s*(a\s*)?(compra|pedido)|pagar(\s+agora)?|confirmar\s*(o\s*)?(pagamento|pedido)|fechar\s*pedido|place\s*order|complete\s*(order|purchase)|pay\s*now|comprar\s*com\s*1[\s-]*clique/i;

const CARD_IFRAME_HINT_RE =
  /card|cart[aã]o|cc-|cvv|cvc|pci|token|payment-fields|mercadopago|adyen|stripe|pagarme|pagar\.me|cielo|rede|pagonube|appmax|braspag/i;

function normalizeHost(raw: string): string {
  return raw.trim().replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

export function isForbiddenPaymentHost(rawHost: string): boolean {
  const host = normalizeHost(rawHost);
  if (!host) return true;
  return PAYMENT_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isValidHostPattern(pattern: string): boolean {
  const host = normalizeHost(pattern);
  if (!host || host.length > 253) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  const bare = host.startsWith("*.") ? host.slice(2) : host;
  if (bare.includes("*") || isIP(bare) !== 0) return false;
  const labels = bare.split(".");
  if (labels.length < 2) return false;
  if (host.startsWith("*.") && labels.length < 2) return false;
  // Evita wildcard amplo de TLD como *.com ou *.com.br
  if (host.startsWith("*.") && (labels.length === 2 && labels[0].length <= 3 && labels[1].length <= 2)) {
    return false;
  }
  if (!labels.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return false;
  if (isForbiddenPaymentHost(bare)) return false;
  return true;
}

export function matchesHostPattern(hostname: string, pattern: string): boolean {
  const host = normalizeHost(hostname);
  const pat = normalizeHost(pattern);
  if (!pat.startsWith("*.")) return host === pat;
  const suffix = pat.slice(1); // ".sub.domain.tld"
  return host.endsWith(suffix) && host.length > suffix.length;
}

export function parseStoreManifest(
  raw: unknown,
): { ok: true; manifest: StoreTargetManifest } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Manifesto deve ser um objeto JSON." };
  }
  const rec = raw as Record<string, unknown>;
  if (rec.version !== 1) {
    return { ok: false, message: "Manifesto exige version: 1." };
  }
  if (rec.stopBeforePayment !== true) {
    return { ok: false, message: "Manifesto exige stopBeforePayment: true." };
  }
  const store = typeof rec.store === "string" ? rec.store.trim() : "";
  if (!store || store.length > 80) {
    return { ok: false, message: "Manifesto exige nome/slug de loja válido (store)." };
  }
  if (rec.platform !== "wake" && rec.platform !== "nuvemshop") {
    return { ok: false, message: "Manifesto exige platform 'wake' ou 'nuvemshop'." };
  }
  const authorizedBy = typeof rec.authorizedBy === "string" ? rec.authorizedBy.trim() : "";
  const authorizedAt = typeof rec.authorizedAt === "string" ? rec.authorizedAt.trim() : "";
  if (!authorizedBy || !authorizedAt || !Number.isFinite(Date.parse(authorizedAt))) {
    return { ok: false, message: "Manifesto exige authorizedBy e authorizedAt ISO-8601 válidos." };
  }
  if (typeof rec.primaryOrigin !== "string") {
    return { ok: false, message: "Manifesto exige primaryOrigin HTTPS." };
  }
  let originUrl: URL;
  try {
    originUrl = new URL(rec.primaryOrigin);
  } catch {
    return { ok: false, message: "primaryOrigin inválido." };
  }
  if (
    originUrl.protocol !== "https:" ||
    originUrl.username ||
    originUrl.password ||
    originUrl.pathname !== "/" ||
    originUrl.search ||
    originUrl.hash
  ) {
    return { ok: false, message: "primaryOrigin deve ser HTTPS puro, sem credenciais, caminho ou query." };
  }
  if (!isValidHostPattern(originUrl.hostname)) {
    return {
      ok: false,
      message: "primaryOrigin rejeitado: proibido IP literal, localhost ou domínio de gateway de pagamento.",
    };
  }

  const parsePatterns = (field: unknown, label: string): { ok: true; list: string[] } | { ok: false; message: string } => {
    if (field === undefined) return { ok: true, list: [] };
    if (!Array.isArray(field) || field.length > 25) {
      return { ok: false, message: `${label} deve ser uma lista de até 25 padrões de host.` };
    }
    const out: string[] = [];
    for (const item of field) {
      if (typeof item !== "string" || !isValidHostPattern(item)) {
        return { ok: false, message: `Padrão inválido ou proibido em ${label}: ${String(item)}` };
      }
      out.push(normalizeHost(item));
    }
    return { ok: true, list: out };
  };

  const subs = parsePatterns(rec.allowedSubdomains, "allowedSubdomains");
  if (!subs.ok) return subs;
  const cdns = parsePatterns(rec.allowedStaticCdns, "allowedStaticCdns");
  if (!cdns.ok) return cdns;

  let journey: StoreJourneyPaths | undefined;
  if (rec.journey !== undefined) {
    if (!rec.journey || typeof rec.journey !== "object" || Array.isArray(rec.journey)) {
      return { ok: false, message: "journey do manifesto inválido." };
    }
    const j = rec.journey as Record<string, unknown>;
    journey = {};
    for (const key of ["startPath", "categoryPath", "productPath", "cartPath", "checkoutPath"] as const) {
      if (j[key] !== undefined) {
        if (typeof j[key] !== "string" || !(j[key] as string).startsWith("/") || isForbiddenCheckoutPath(j[key] as string, rec.platform)) {
          return { ok: false, message: `Caminho inválido ou proibido em journey.${key}.` };
        }
        journey[key] = j[key] as string;
      }
    }
    if (j.postalCode !== undefined) {
      if (typeof j.postalCode !== "string" || !/^\d{5}-?\d{3}$/.test(j.postalCode)) {
        return { ok: false, message: "journey.postalCode deve ser um CEP brasileiro válido." };
      }
      journey.postalCode = j.postalCode;
    }
  }

  return {
    ok: true,
    manifest: {
      version: 1,
      store,
      platform: rec.platform,
      primaryOrigin: originUrl.origin,
      allowedSubdomains: subs.list,
      allowedStaticCdns: cdns.list,
      authorizedBy,
      authorizedAt,
      stopBeforePayment: true,
      cleanCartOnTeardown: rec.cleanCartOnTeardown !== false,
      ...(journey ? { journey } : {}),
    },
  };
}

export function classifyManifestHost(
  hostname: string,
  manifest: StoreTargetManifest,
): "primary" | "subdomain" | "cdn" | null {
  const host = normalizeHost(hostname);
  if (!host || isForbiddenPaymentHost(host)) return null;
  const primaryHost = normalizeHost(new URL(manifest.primaryOrigin).hostname);
  if (host === primaryHost) return "primary";
  if (manifest.allowedSubdomains.some((pat) => matchesHostPattern(host, pat))) return "subdomain";
  if (manifest.allowedStaticCdns.some((pat) => matchesHostPattern(host, pat))) return "cdn";
  return null;
}

export function isHostAllowedByManifest(hostname: string, manifest: StoreTargetManifest): boolean {
  return classifyManifestHost(hostname, manifest) !== null;
}

export function isForbiddenCheckoutPath(pathname: string, platform?: StorePlatform): boolean {
  if (FORBIDDEN_PATH_RE.test(pathname)) return true;
  if (platform === "nuvemshop" && /\/checkout\/v3\/success(\/|$)/i.test(pathname)) return true;
  return false;
}

export function isForbiddenFinalizeControl(label: string): boolean {
  return FINALIZE_CONTROL_RE.test(label.trim());
}

export function isCardIframeDescriptor(attrs: {
  src?: string | null;
  name?: string | null;
  title?: string | null;
  id?: string | null;
}): boolean {
  if (attrs.src) {
    try {
      const url = new URL(attrs.src, "https://placeholder.invalid");
      if (url.hostname !== "placeholder.invalid" && isForbiddenPaymentHost(url.hostname)) return true;
      if (CARD_IFRAME_HINT_RE.test(url.pathname)) return true;
    } catch {
      /* ignore malformed src */
    }
  }
  const combined = [attrs.name, attrs.title, attrs.id].filter(Boolean).join(" ");
  return CARD_IFRAME_HINT_RE.test(combined);
}

function containsForbiddenPayload(postData: string): string | null {
  if (CARD_PAYLOAD_KEY_RE.test(postData)) return "card-payload-blocked";
  if (FORBIDDEN_GRAPHQL_RE.test(postData)) return "payment-mutation-blocked";
  return null;
}

function isSafeWakePost(pathname: string, postData: string): { ok: true } | { ok: false; reason: string } {
  if (!WAKE_SAFE_POST_PATH_RE.test(pathname)) {
    return { ok: false, reason: "wake-post-path-blocked" };
  }
  const badPayload = containsForbiddenPayload(postData);
  if (badPayload) return { ok: false, reason: badPayload };
  if (/graphql/i.test(pathname)) {
    const trimmed = postData.trim();
    if (!trimmed) return { ok: false, reason: "wake-empty-graphql-blocked" };
    // Se houver palavra reservada mutation, exige explicitamente apenas mutações de carrinho/frete autorizadas.
    if (/\bmutation\b/i.test(trimmed) && !WAKE_SAFE_MUTATIONS_RE.test(trimmed)) {
      return { ok: false, reason: "wake-unlisted-mutation-blocked" };
    }
  }
  return { ok: true };
}

function isSafeNuvemshopPost(pathname: string, postData: string): { ok: true } | { ok: false; reason: string } {
  if (/^\/checkout(\/|$)/i.test(pathname)) {
    return { ok: false, reason: "nuvemshop-checkout-post-blocked" };
  }
  if (!NUVEMSHOP_SAFE_POST_PATH_RE.test(pathname)) {
    return { ok: false, reason: "nuvemshop-post-path-blocked" };
  }
  const badPayload = containsForbiddenPayload(postData);
  if (badPayload) return { ok: false, reason: badPayload };
  return { ok: true };
}

export type SafeRequestVerdict =
  | { ok: true; hostRole: "primary" | "subdomain" | "cdn" }
  | { ok: false; reason: string };

export function evaluateSafeCheckoutRequest(input: {
  manifest: StoreTargetManifest;
  requestUrl: string;
  method: string;
  resourceType?: string;
  postData?: string | null;
  /** Usado apenas em suítes locais Vitest/Playwright para mapear uma origem local efêmera ao manifesto. */
  testLocalOriginMap?: Record<string, string>;
}): SafeRequestVerdict {
  let url: URL;
  try {
    url = new URL(input.requestUrl);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "credentials-forbidden" };
  }
  let effectiveUrl = url;
  if (input.testLocalOriginMap && input.testLocalOriginMap[url.origin]) {
    effectiveUrl = new URL(`${input.testLocalOriginMap[url.origin]}${url.pathname}${url.search}`);
  } else if (url.protocol !== "https:") {
    return { ok: false, reason: "https-required" };
  }

  if (isForbiddenPaymentHost(effectiveUrl.hostname)) {
    return { ok: false, reason: "payment-domain-blocked" };
  }
  const hostRole = classifyManifestHost(effectiveUrl.hostname, input.manifest);
  if (!hostRole) {
    return { ok: false, reason: "unlisted-host" };
  }
  if (isForbiddenCheckoutPath(effectiveUrl.pathname, input.manifest.platform)) {
    return { ok: false, reason: "forbidden-checkout-path" };
  }

  const method = input.method.toUpperCase();
  if (hostRole === "cdn") {
    if ((method !== "GET" && method !== "HEAD") || input.resourceType === "document") {
      return { ok: false, reason: "cdn-only-static-get" };
    }
    return { ok: true, hostRole };
  }

  if (method === "GET" || method === "HEAD") {
    return { ok: true, hostRole };
  }

  if (method !== "POST") {
    return { ok: false, reason: "method-not-allowed" };
  }

  const postData = input.postData || "";
  if (input.manifest.platform === "wake") {
    const wakeCheck = isSafeWakePost(effectiveUrl.pathname, postData);
    return wakeCheck.ok ? { ok: true, hostRole } : wakeCheck;
  }
  const nuvemCheck = isSafeNuvemshopPost(effectiveUrl.pathname, postData);
  return nuvemCheck.ok ? { ok: true, hostRole } : nuvemCheck;
}

export type DomSafetySummary = {
  cardInputsChecked: number;
  cardInputsFilled: number;
  detectedCardIframes: number;
  detectedFinalizeControls: number;
};

export async function auditSafeCheckoutDom(page: Page): Promise<DomSafetySummary> {
  const raw = await page.evaluate(() => {
    const cardInputs = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input[autocomplete^="cc-"], input[name*="card" i], input[name*="cartao" i], input[name*="cvv" i], input[name*="cvc" i], input[id*="card" i], input[id*="cvv" i]',
      ),
    );
    const filled = cardInputs.filter((el) => (el.value || "").trim().length > 0).length;
    const iframes = Array.from(document.querySelectorAll("iframe")).map((el) => ({
      src: el.getAttribute("src"),
      name: el.getAttribute("name"),
      title: el.getAttribute("title"),
      id: el.getAttribute("id"),
    }));
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>('button, a, input[type="submit"], input[type="button"], [role="button"]'),
    ).map((el) => {
      if (el instanceof HTMLInputElement) return el.value || el.getAttribute("aria-label") || "";
      return el.innerText || el.textContent || el.getAttribute("aria-label") || "";
    });
    return { cardInputsChecked: cardInputs.length, cardInputsFilled: filled, iframes, controls };
  });

  if (raw.cardInputsFilled > 0) {
    throw new Error("política Safe-Checkout: campo de cartão apareceu preenchido — execução abortada");
  }
  const detectedCardIframes = raw.iframes.filter(isCardIframeDescriptor).length;
  const detectedFinalizeControls = raw.controls.filter(isForbiddenFinalizeControl).length;
  return {
    cardInputsChecked: raw.cardInputsChecked,
    cardInputsFilled: raw.cardInputsFilled,
    detectedCardIframes,
    detectedFinalizeControls,
  };
}

export async function clickSafeStoreControl(
  page: Page,
  control: { role: "link" | "button"; name: string },
  manifest: StoreTargetManifest,
): Promise<void> {
  if (isForbiddenFinalizeControl(control.name)) {
    throw new Error(`política Safe-Checkout: controle de finalização bloqueado ("${control.name}")`);
  }
  const locator = page.getByRole(control.role, { name: control.name, exact: true }).first();
  if ((await locator.count()) === 0) {
    throw new Error(`controle não encontrado na etapa: "${control.name}"`);
  }
  const href = await locator.getAttribute("href");
  if (href) {
    const resolved = new URL(href, page.url());
    if (isForbiddenPaymentHost(resolved.hostname) || isForbiddenCheckoutPath(resolved.pathname, manifest.platform)) {
      throw new Error(`política Safe-Checkout: link aponta para rota de pagamento bloqueada (${resolved.pathname})`);
    }
  }
  await locator.click();
}

export type SafeGuardTelemetry = {
  blockedRequests: Array<{ method: string; url: string; reason: string }>;
  blockedWebSockets: string[];
};

export async function installSafeCheckoutGuard(
  context: BrowserContext,
  manifest: StoreTargetManifest,
  opts?: { testLocalOriginMap?: Record<string, string> },
): Promise<SafeGuardTelemetry> {
  const telemetry: SafeGuardTelemetry = {
    blockedRequests: [],
    blockedWebSockets: [],
  };

  await context.routeWebSocket(() => true, (ws) => {
    telemetry.blockedWebSockets.push(ws.url());
    ws.close();
  });

  await context.route("**/*", async (route) => {
    const req = route.request();
    const verdict = evaluateSafeCheckoutRequest({
      manifest,
      requestUrl: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      postData: req.postData(),
      testLocalOriginMap: opts?.testLocalOriginMap,
    });
    if (!verdict.ok) {
      telemetry.blockedRequests.push({ method: req.method(), url: req.url(), reason: verdict.reason });
      await route.abort("blockedbyclient");
      return;
    }
    const response = await route.fetch({ maxRedirects: 0 });
    if (response.status() >= 300 && response.status() < 400) {
      const location = response.headers()["location"];
      if (!location) {
        await route.fulfill({ response });
        return;
      }
      const nextUrl = new URL(location, req.url()).href;
      const redirectVerdict = evaluateSafeCheckoutRequest({
        manifest,
        requestUrl: nextUrl,
        method: "GET",
        resourceType: req.resourceType(),
        testLocalOriginMap: opts?.testLocalOriginMap,
      });
      if (!redirectVerdict.ok) {
        telemetry.blockedRequests.push({
          method: "REDIRECT",
          url: nextUrl,
          reason: `redirect-${redirectVerdict.reason}`,
        });
        await route.fulfill({
          status: 502,
          contentType: "text/plain; charset=utf-8",
          body: `Safe-Checkout blocked redirect: ${redirectVerdict.reason}`,
        });
        return;
      }
    }
    await route.fulfill({ response });
  });

  return telemetry;
}

export async function teardownSafeCheckoutCart(input: {
  context: BrowserContext;
  page?: Page;
  manifest: StoreTargetManifest;
  effectiveOrigin?: string;
}): Promise<{ cleaned: boolean; platform: StorePlatform; detail: string }> {
  const { context, page, manifest } = input;
  const baseOrigin = input.effectiveOrigin || manifest.primaryOrigin;
  let detail = "cookies-cleared";

  if (manifest.cleanCartOnTeardown && page && !page.isClosed()) {
    try {
      if (manifest.platform === "wake") {
        await page.evaluate(async (origin) => {
          try {
            await fetch(`${origin}/graphql`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                operationName: "checkoutClean",
                query: "mutation checkoutClean { checkoutClean { checkoutId } }",
              }),
            });
          } catch {
            /* best effort cart clear */
          }
          try {
            window.localStorage.clear();
            window.sessionStorage.clear();
          } catch {
            /* storage unavailable */
          }
        }, baseOrigin);
        detail = "wake-checkoutClean+cookies-cleared";
      } else {
        await page.evaluate(async (origin) => {
          try {
            await fetch(`${origin}/cart/clear`, { method: "POST" });
          } catch {
            /* best effort cart clear */
          }
          try {
            window.localStorage.clear();
            window.sessionStorage.clear();
          } catch {
            /* storage unavailable */
          }
        }, baseOrigin);
        detail = "nuvemshop-cart-clear+cookies-cleared";
      }
    } catch {
      detail = "cookies-cleared-fallback";
    }
  }

  await context.clearCookies();
  return { cleaned: true, platform: manifest.platform, detail };
}
