/**
 * Ronda CLI:
 * - Modo padrão: jornada home→checkout no fixture controlado.
 * - Modo autorizado (--manifest <json> --base-url <https://...>): proxy anti-SSRF com IP pinado + Safe-Checkout (Wake/Nuvemshop).
 * Nunca preenche cartão, nunca chama checkoutComplete, nunca grava tema.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import { resolveTarget } from "../lib/allowlist";
import { assertNotPaid, assertReportOnly, isAllowedBrowserRequest, isPaymentCompletePath } from "../lib/policy";
import { detectScribanError } from "../lib/scriban";
import { filterConsole } from "../lib/console-filter";
import { finalizeReport, isPassing, renderHtml } from "../lib/report";
import { defaultJourney, parseJourneyFile, type LoadedJourney } from "../lib/journey";
import { checkInstitutional, checkPlanned, extractHrefs, planLinks } from "../lib/scan";
import { INSTITUTIONAL_SLUGS, LIMITS } from "../lib/limits";
import { authSkip, figmaSkip } from "../lib/gaps";
import { describeShotFile } from "../lib/evidence";
import { auditHtml } from "../lib/page-audit";
import { comparePngFiles, parseViewport } from "../lib/visual-png";
import { clickFixtureAction, isBuiltInFixtureJourney } from "../lib/fixture-click";
import { closeBrowser, closeServer } from "../lib/resource-cleanup";
import { fixtureFingerprint } from "../lib/fixture-fingerprint";
import { chromiumProxyLaunchArgs, startPinnedEgressProxy, type PinnedEgressProxy } from "../lib/pinned-proxy";
import {
  auditSafeCheckoutDom,
  installSafeCheckoutGuard,
  isForbiddenCheckoutPath,
  teardownSafeCheckoutCart,
  type StoreTargetManifest,
} from "../lib/store-manifest";
import type { PageFacts, Report, StepResult, VisualCompare } from "../lib/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE = path.join(root, "fixture");
const OUT = path.join(root, "ronda-out");
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadJourney(): LoadedJourney {
  const file = arg("--journey");
  if (!file) return defaultJourney();
  const abs = path.resolve(file);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    throw new Error(`jornada: não deu para ler ${abs}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const parsed = parseJourneyFile(raw, path.basename(abs));
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.journey;
}

function loadManifestArg(): unknown | undefined {
  const file = arg("--manifest");
  if (!file) return undefined;
  const abs = path.resolve(file);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    throw new Error(`manifesto: não deu para ler ${abs}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function serveFixture(): Promise<{ server: http.Server; origin: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const file = url.pathname === "/" ? "/home.html" : url.pathname;
      const abs = path.normalize(path.join(FIXTURE, file));
      if (!abs.startsWith(FIXTURE)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      fs.readFile(abs, (err, data) => {
        if (err) {
          res.writeHead(404).end("not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[path.extname(abs)] || "text/plain" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, origin: `http://127.0.0.1:${port}` });
    });
  });
}

async function runAuthorizedManifestMode(manifest: StoreTargetManifest, viewport: { width: number; height: number }): Promise<void> {
  assertReportOnly(false);
  const runId = randomUUID();
  const runStartedAtMs = Date.now();
  const runStartedAt = new Date(runStartedAtMs).toISOString();

  const plannedSteps: Array<{ id: string; path: string; stop?: boolean }> = [
    { id: "home", path: manifest.journey?.startPath || "/" },
    ...(manifest.journey?.categoryPath ? [{ id: "categoria", path: manifest.journey.categoryPath }] : []),
    ...(manifest.journey?.productPath ? [{ id: "produto", path: manifest.journey.productPath }] : []),
    ...(manifest.journey?.cartPath ? [{ id: "carrinho", path: manifest.journey.cartPath }] : []),
    {
      id: "checkout",
      path: manifest.journey?.checkoutPath || (manifest.platform === "nuvemshop" ? "/checkout/v3/next" : "/checkout"),
      stop: true,
    },
  ];

  const report: Report = {
    store: manifest.store,
    platform: manifest.platform,
    target: "authorized-manifest",
    steps: [],
    stopped_before_payment: false,
    consoleErrors: [],
    detects_everything: false,
    links: [],
    institutional: [],
    figma: figmaSkip(),
    auth: authSkip(),
    pages: [],
    isolation: { hostedFetch: false, methods: "SAFE-CHECKOUT", figmaFaked: false, payment: false },
    journey: {
      name: `${manifest.store}-safe-checkout`,
      source: "manifest",
      startPath: plannedSteps[0].path,
      stepIds: plannedSteps.map((s) => s.id),
      stopBeforePayment: true,
    },
  };

  let proxy: PinnedEgressProxy | undefined;
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  let cartCleaned = false;
  let failed = false;
  let documentStatus = 0;
  const rawConsole: string[] = [];
  const pages: PageFacts[] = [];

  try {
    fs.mkdirSync(OUT, { recursive: true });
    proxy = await startPinnedEgressProxy({ manifest });
    browser = await chromium.launch({
      headless: true,
      args: chromiumProxyLaunchArgs(proxy.proxyUrl),
    });
    context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
      userAgent: "RondaQA/1.0 (+https://ronda-tawny-xi.vercel.app; safe-checkout)",
    });
    await installSafeCheckoutGuard(context, manifest);
    page = await context.newPage();
    page.on("pageerror", (e) => rawConsole.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") rawConsole.push(m.text());
    });
    page.on("response", (response) => {
      if (response.request().isNavigationRequest() && response.frame() === page?.mainFrame()) {
        documentStatus = response.status();
      }
    });

    for (const step of plannedSteps) {
      const targetUrl = new URL(step.path, manifest.primaryOrigin).href;
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const currentPath = new URL(page.url()).pathname;
      if (isPaymentCompletePath(currentPath) || isForbiddenCheckoutPath(currentPath, manifest.platform)) {
        throw new Error(`política Safe-Checkout: rota proibida detectada (${currentPath})`);
      }
      const html = await page.content();
      if (manifest.platform === "wake") {
        const scriban = detectScribanError(html);
        if (!scriban.ok) throw new Error(`Scriban: ${scriban.message}`);
      }
      if (step.stop) {
        const domCheck = await auditSafeCheckoutDom(page);
        assertNotPaid({
          pathname: currentPath,
          cardValue: domCheck.cardInputsFilled > 0 ? "filled" : "",
          mutations: [],
        });
        report.stopped_before_payment = true;
      }
      const shot = path.join(OUT, `${step.id}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      pages.push(auditHtml(page.url(), html, documentStatus || 200));
      report.steps.push({
        id: step.id,
        url: page.url(),
        pass: true,
        screenshot: shot,
        shotEvidence: describeShotFile(shot),
        stopped_before_payment: Boolean(step.stop),
      });
      if (step.stop) break;
    }
  } catch (err) {
    failed = true;
    report.error = String(err);
    report.steps.push({
      id: plannedSteps[report.steps.length]?.id || "falha",
      url: page?.url() || manifest.primaryOrigin,
      pass: false,
      stopped_before_payment: false,
      error: String(err),
    });
  } finally {
    if (context) {
      try {
        const teardown = await teardownSafeCheckoutCart({ context, page, manifest });
        cartCleaned = teardown.cleaned;
      } catch (err) {
        failed = true;
        report.error = `${report.error ? `${report.error}; ` : ""}cart teardown: ${String(err)}`;
      }
    }
    try {
      await closeBrowser(browser);
    } catch (err) {
      failed = true;
      report.error = `${report.error ? `${report.error}; ` : ""}browser cleanup: ${String(err)}`;
    }
    try {
      await proxy?.close();
    } catch (err) {
      failed = true;
      report.error = `${report.error ? `${report.error}; ` : ""}proxy cleanup: ${String(err)}`;
    }

    report.consoleErrors = filterConsole(rawConsole, new URL(manifest.primaryOrigin).hostname);
    report.pages = pages;
    const runFinishedAtMs = Date.now();
    report.run = {
      id: runId,
      startedAt: runStartedAt,
      finishedAt: new Date(runFinishedAtMs).toISOString(),
      durationMs: Math.max(0, runFinishedAtMs - runStartedAtMs),
      cartCleaned,
    };
    const done = finalizeReport(report);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(done, null, 2));
    fs.writeFileSync(path.join(OUT, "report.html"), renderHtml(done));

    if (failed || !isPassing(done)) {
      console.error("RONDA FAIL", done.error || "jornada autorizada incompleta");
      process.exitCode = 1;
      return;
    }
    console.log(
      `RONDA SAFE-CHECKOUT OK ${done.steps.length}/${plannedSteps.length} stopped_before_payment`,
      `store=${manifest.store} platform=${manifest.platform} cartCleaned=${cartCleaned}`,
      OUT,
    );
  }
}

async function main(): Promise<void> {
  const target = resolveTarget({
    baseUrl: arg("--base-url"),
    manifest: loadManifestArg(),
  });
  const viewport = parseViewport(arg("--viewport"));

  if (target.kind === "authorized-manifest") {
    await runAuthorizedManifestMode(target.manifest, viewport);
    return;
  }

  assertReportOnly(false);
  const journey = loadJourney();
  const runId = randomUUID();
  const fixtureSha256 = fixtureFingerprint(
    ["home.html", "categoria.html", "produto.html", "carrinho.html", "checkout.html", "sobre.html", "politica.html", "shop.css", "journey.json"]
      .map((name) => ({ name, content: fs.readFileSync(path.join(FIXTURE, name)) })),
  );
  const runStartedAtMs = Date.now();
  const runStartedAt = new Date(runStartedAtMs).toISOString();
  if (!isBuiltInFixtureJourney(journey)) {
    throw new Error("política: execução restrita à jornada exata do fixture controlado; jornada configurada foi bloqueada");
  }

  const report: Report = {
    store: "fixture-demo-qa",
    platform: "wake-mock",
    target: "fixture",
    steps: [],
    stopped_before_payment: false,
    consoleErrors: [],
    detects_everything: false,
    links: [],
    institutional: [],
    figma: figmaSkip(),
    auth: authSkip(),
    pages: [],
    isolation: { hostedFetch: false, methods: "GET", figmaFaked: false, payment: false },
    journey: {
      name: journey.name,
      source: journey.source,
      startPath: journey.startPath,
      stepIds: journey.steps.map((s) => s.id),
      actions: journey.steps.map((step) => ({
        id: step.id,
        heading: step.heading,
        click: step.click,
        clickRole: step.click ? step.clickRole || "link" : undefined,
        stop: Boolean(step.stop),
      })),
      stopBeforePayment: true,
    },
  };
  const htmls: string[] = [];
  const pages: PageFacts[] = [];
  const visuals: VisualCompare[] = [];
  const allowLocal = true;
  const refPng = arg("--ref-png");
  const refStep = arg("--ref-step") || "home";
  const refDir = arg("--ref-dir");

  let hosted: Awaited<ReturnType<typeof serveFixture>> | undefined;
  let origin: string | undefined;
  let browser: Browser | undefined;
  let page: Page | undefined;
  let scanReady = false;
  const rawConsole: string[] = [];
  let documentStatus = 0;
  let failed = false;
  try {
    hosted = await serveFixture();
    origin = hosted.origin;
    fs.mkdirSync(OUT, { recursive: true });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport, serviceWorkers: "block" });
    page = await context.newPage();
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (!isAllowedBrowserRequest({ requestUrl: request.url(), origin: origin!, method: request.method() })) {
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    page.on("pageerror", (e) => rawConsole.push(String(e)));
    page.on("response", (response) => {
      if (response.request().isNavigationRequest() && response.frame() === page?.mainFrame()) {
        documentStatus = response.status();
      }
    });
    page.on("console", (m) => {
      if (m.type() === "error") rawConsole.push(m.text());
    });
    scanReady = true;

    await page.goto(`${origin}${journey.startPath}`, { waitUntil: "domcontentloaded" });
    for (const step of journey.steps) {
      if (isPaymentCompletePath(new URL(page.url()).pathname)) {
        throw new Error("política: a Ronda não abre confirmação de pedido");
      }
      if (step.click) {
        await clickFixtureAction(page, step, target.kind, new URL(page.url()).pathname);
      }
      if (isPaymentCompletePath(new URL(page.url()).pathname)) {
        throw new Error("política: a Ronda bloqueia confirmação de pedido");
      }
      const html = await page.content();
      htmls.push(html);
      const scriban = detectScribanError(html);
      if (!scriban.ok) throw new Error(`Scriban: ${scriban.message}`);
      await page.getByRole("heading", { name: step.heading, exact: true }).waitFor({ state: "visible", timeout: 5000 });
      if (step.stop) {
        if (step.id !== "checkout" || new URL(page.url()).pathname !== "/checkout.html" || step.heading !== "Forma de pagamento") {
          throw new Error("política: parada antes do pagamento exige a etapa checkout exata do fixture");
        }
        const cardValue = await page.locator('input[name="card"]').inputValue().catch(() => "");
        assertNotPaid({
          pathname: new URL(page.url()).pathname,
          cardValue,
          mutations: [],
        });
        report.stopped_before_payment = true;
      }
      const shot = path.join(OUT, `${step.id}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      const facts = auditHtml(page.url(), html, documentStatus || 200);
      pages.push(facts);
      const refCandidate =
        refPng && step.id === refStep
          ? refPng
          : refDir
            ? path.join(refDir, `${step.id}.png`)
            : undefined;
      if (refCandidate && fs.existsSync(refCandidate)) {
        visuals.push(
          comparePngFiles({
            step: step.id,
            actualPath: shot,
            referencePath: refCandidate,
            viewport,
            diffPath: path.join(OUT, `diff-${step.id}.png`),
          }),
        );
      } else if (refPng && step.id === refStep) {
        visuals.push({
          source: "user-png",
          figma: false,
          step: step.id,
          viewport,
          reference: { path: refPng, width: 0, height: 0 },
          actual: { path: shot, width: 0, height: 0 },
          pass: false,
          apply: false,
          hypothesis: `PNG de referência não encontrado: ${refPng}. Não usamos Figma no lugar.`,
        });
      }
      const entry: StepResult = {
        id: step.id,
        url: page.url(),
        pass: true,
        screenshot: shot,
        shotEvidence: describeShotFile(shot),
        stopped_before_payment: Boolean(step.stop),
      };
      report.steps.push(entry);
      if (step.stop) break;
    }
  } catch (err) {
    failed = true;
    report.error = String(err);
    report.steps.push({
      id: journey.steps[report.steps.length]?.id || "falha",
      url: page?.url() || (origin ? `${origin}${journey.startPath}` : "fixture unavailable"),
      pass: false,
      stopped_before_payment: false,
      error: String(err),
    });
  } finally {
    try {
      await closeBrowser(browser);
    } catch (err) {
      failed = true;
      report.error = `${report.error ? `${report.error}; ` : ""}browser cleanup: ${String(err)}`;
    }

    if (scanReady && origin) {
      try {
        report.consoleErrors = filterConsole(rawConsole, new URL(origin).hostname);
        const hrefs = htmls.flatMap(extractHrefs);
        const planned = planLinks(hrefs, origin, allowLocal);
        report.links = await checkPlanned(planned, (url, init) => fetch(url, init));
        report.institutional = await checkInstitutional(
          origin,
          INSTITUTIONAL_SLUGS,
          (url, init) => fetch(url, init),
          allowLocal,
        );
      } catch (err) {
        failed = true;
        report.error = `${report.error ? `${report.error}; ` : ""}report checks: ${String(err)}`;
      }
    }

    report.figma = figmaSkip();
    report.auth = authSkip();
    report.pages = pages;
    report.visual = visuals;
    report.isolation = { hostedFetch: false, methods: "GET", figmaFaked: false, payment: false };
    report.detects_everything = false;
    try {
      await closeServer(hosted?.server);
    } catch (err) {
      failed = true;
      report.error = `${report.error ? `${report.error}; ` : ""}fixture cleanup: ${String(err)}`;
    }

    const runFinishedAtMs = Date.now();
    report.run = {
      id: runId,
      startedAt: runStartedAt,
      finishedAt: new Date(runFinishedAtMs).toISOString(),
      durationMs: Math.max(0, runFinishedAtMs - runStartedAtMs),
      fixtureSha256,
    };
    const done = finalizeReport(report);
    try {
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(done, null, 2));
      fs.writeFileSync(path.join(OUT, "report.html"), renderHtml(done));
    } catch (err) {
      failed = true;
      report.error = `${report.error ? `${report.error}; ` : ""}report write: ${String(err)}`;
      console.error("RONDA FAIL", report.error);
    }

    if (failed || !isPassing(done)) {
      console.error("RONDA FAIL", done.error || "jornada incompleta");
      process.exitCode = 1;
      return;
    }
    const broken = done.links.filter((l) => l.verdict === "broken").length;
    console.log(
      `RONDA OK ${done.steps.length}/${journey.steps.length} stopped_before_payment`,
      `links=${done.links.length} broken=${broken} max=${LIMITS.maxLinks}`,
      `viewport=${viewport.width}x${viewport.height}`,
      visuals.length ? `visual=${visuals.filter((v) => v.pass).length}/${visuals.length}` : "visual=skip",
      OUT,
    );
  }
}

main().catch((err) => {
  console.error("RONDA FAIL", err);
  process.exitCode = 1;
});
