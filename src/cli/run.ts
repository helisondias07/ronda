/**
 * Ronda CLI: jornada home→checkout no fixture (ou localhost autorizado).
 * Nunca preenche cartão, nunca chama checkoutComplete, nunca grava tema.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { resolveTarget } from "../lib/allowlist";
import { assertNotPaid, assertReportOnly, isPaymentCompletePath } from "../lib/policy";
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

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
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

async function main(): Promise<void> {
  const target = resolveTarget({
    baseUrl: arg("--base-url"),
    authorize: hasFlag("--autorizo-este-ambiente"),
    allowHost: process.env.RONDA_ALLOW_HOST,
  });

  assertReportOnly(false);
  const journey = loadJourney();

  const report: Report = {
    store: target.kind === "fixture" ? "fixture-demo-qa" : target.url,
    platform: target.kind === "fixture" ? "wake-mock" : "wake",
    target: target.kind === "fixture" ? "fixture" : "authorized-local",
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
      stopBeforePayment: true,
    },
  };
  const htmls: string[] = [];
  const pages: PageFacts[] = [];
  const visuals: VisualCompare[] = [];
  const allowLocal = true;
  const viewport = parseViewport(arg("--viewport"));
  const refPng = arg("--ref-png");
  const refStep = arg("--ref-step") || "home";
  const refDir = arg("--ref-dir");

  const hosted = target.kind === "fixture" ? await serveFixture() : null;
  const origin = target.kind === "fixture" ? hosted!.origin : target.url;

  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const rawConsole: string[] = [];
  let documentStatus = 0;
  page.on("pageerror", (e) => rawConsole.push(String(e)));
  page.on("response", (response) => {
    if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) {
      documentStatus = response.status();
    }
  });
  page.on("console", (m) => {
    if (m.type() === "error") rawConsole.push(m.text());
  });

  let failed = false;
  try {
    await page.goto(`${origin}${journey.startPath}`, { waitUntil: "domcontentloaded" });
    for (const step of journey.steps) {
      if (isPaymentCompletePath(new URL(page.url()).pathname)) {
        throw new Error("política: a Ronda não abre confirmação de pedido");
      }
      if (step.click) {
        await page.getByRole("link", { name: step.click, exact: true }).click();
      }
      const html = await page.content();
      htmls.push(html);
      const scriban = detectScribanError(html);
      if (!scriban.ok) throw new Error(`Scriban: ${scriban.message}`);
      await page.getByRole("heading", { name: step.heading, exact: true }).waitFor({ state: "visible", timeout: 5000 });
      if (step.stop) {
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
    }
  } catch (err) {
    failed = true;
    report.error = String(err);
    report.steps.push({
      id: journey.steps[report.steps.length]?.id || "falha",
      url: page.url(),
      pass: false,
      stopped_before_payment: false,
      error: String(err),
    });
  } finally {
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
    report.figma = figmaSkip();
    report.auth = authSkip();
    report.pages = pages;
    report.visual = visuals;
    report.isolation = { hostedFetch: false, methods: "GET", figmaFaked: false, payment: false };
    report.detects_everything = false;
    const done = finalizeReport(report);
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(done, null, 2));
    fs.writeFileSync(path.join(OUT, "report.html"), renderHtml(done));
    await browser.close();
    hosted?.server.close();
    if (failed || !isPassing(done)) {
      console.error("RONDA FAIL", done.error || "jornada incompleta");
      process.exit(1);
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
  process.exit(1);
});
