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
import { FIXTURE_JOURNEY } from "../lib/wake";
import { checkInstitutional, checkPlanned, extractHrefs, planLinks } from "../lib/scan";
import { INSTITUTIONAL_SLUGS, LIMITS } from "../lib/limits";
import { authSkip, figmaSkip } from "../lib/gaps";
import type { Report, StepResult } from "../lib/types";

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
  };
  const htmls: string[] = [];
  const allowLocal = true;

  const hosted = target.kind === "fixture" ? await serveFixture() : null;
  const origin = target.kind === "fixture" ? hosted!.origin : target.url;

  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const rawConsole: string[] = [];
  page.on("pageerror", (e) => rawConsole.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") rawConsole.push(m.text());
  });

  let failed = false;
  try {
    await page.goto(`${origin}/home.html`, { waitUntil: "domcontentloaded" });
    for (const step of FIXTURE_JOURNEY) {
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
      const headingName = step.id === "categoria" ? { name: "Tênis", exact: true } : { name: step.heading };
      await page.getByRole("heading", headingName).waitFor({ state: "visible", timeout: 5000 });
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
      await page.screenshot({ path: shot, fullPage: true });
      const entry: StepResult = {
        id: step.id,
        url: page.url(),
        pass: true,
        screenshot: shot,
        stopped_before_payment: Boolean(step.stop),
      };
      report.steps.push(entry);
    }
  } catch (err) {
    failed = true;
    report.error = String(err);
    report.steps.push({
      id: "checkout",
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
      "RONDA OK 5/5 stopped_before_payment",
      `links=${done.links.length} broken=${broken} max=${LIMITS.maxLinks}`,
      OUT,
    );
  }
}

main().catch((err) => {
  console.error("RONDA FAIL", err);
  process.exit(1);
});
