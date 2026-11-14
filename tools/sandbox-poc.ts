import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import http, { type Server } from "node:http";
import { chromium, type BrowserContext } from "playwright";
import { closeBrowser, closeServer } from "../src/lib/resource-cleanup";

function isAllowedRequest(rawUrl: string, allowedOrigin: string): boolean {
  try {
    const candidate = new URL(rawUrl);
    const allowed = new URL(allowedOrigin);
    return allowed.protocol === "http:" && allowed.hostname === "127.0.0.1" &&
      candidate.protocol === "http:" && candidate.hostname === "127.0.0.1" &&
      !candidate.username && !candidate.password && candidate.origin === allowed.origin;
  } catch {
    return false;
  }
}

async function listenLocal(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function main(): Promise<void> {
  let canaryRequests = 0;
  let canaryUpgrades = 0;
  let receivedPosts = 0;
  let effectfulGets = 0;
  const blockedHttp: string[] = [];
  const blockedWebSockets: string[] = [];
  let context: BrowserContext | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let targetServer: Server | undefined;
  let canaryServer: Server | undefined;

  try {
    canaryServer = http.createServer((_request, response) => {
      canaryRequests += 1;
      response.writeHead(404).end("local canary should not receive traffic");
    });
    canaryServer.on("upgrade", (_request, socket) => {
      canaryUpgrades += 1;
      socket.destroy();
    });
    const canaryOrigin = await listenLocal(canaryServer);

    targetServer = http.createServer((request, response) => {
      const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
      if (pathname === "/redirect") {
        response.writeHead(302, { Location: `${canaryOrigin}/not-found` }).end();
        return;
      }
      if (pathname === "/write") {
        if (request.method === "POST") receivedPosts += 1;
        response.writeHead(200).end("write received");
        return;
      }
      if (pathname === "/effectful-get") {
        effectfulGets += 1;
        response.writeHead(200).end("synthetic state changed through GET");
        return;
      }
      const page = `<!doctype html><html><body>
        <img src="${canaryOrigin}/image">
        <iframe src="${canaryOrigin}/frame"></iframe>
        <script>
          window.pocDone = false;
          Promise.allSettled([
            fetch('${canaryOrigin}/fetch'),
            fetch('/write', { method: 'POST', body: 'synthetic' }),
            fetch('/effectful-get'),
            new Promise((resolve) => { const image = new Image(); image.onload = () => resolve('loaded'); image.onerror = () => resolve('blocked'); image.src = '${canaryOrigin}/script-image'; })
          ]).then(() => { window.pocDone = true; });
          try { new WebSocket('ws://127.0.0.1:${new URL(canaryOrigin).port}/socket'); } catch {}
        </script>
      </body></html>`;
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
    });
    const targetOrigin = await listenLocal(targetServer);

    assert.equal(isAllowedRequest(`${targetOrigin}/home.html`, targetOrigin), true);
    for (const candidate of [
      "file:///etc/passwd",
      "data:text/html,blocked",
      "http://localhost/",
      "http://127.0.0.1:80/",
      "http://127.0.0.1:80@127.0.0.1/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/",
      "https://example.com/",
      `http://user:pass@${new URL(targetOrigin).host}/home.html`,
    ]) {
      assert.equal(isAllowedRequest(candidate, targetOrigin), false, `must deny ${candidate}`);
    }

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() !== "GET" || !isAllowedRequest(request.url(), targetOrigin)) {
        blockedHttp.push(`${request.method()} ${request.url()}`);
        await route.abort("blockedbyclient");
        return;
      }
      const response = await route.fetch({ maxRedirects: 0 });
      if (response.status() >= 300 && response.status() < 400) {
        const location = response.headers()["location"];
        blockedHttp.push(`REDIRECT ${location ? new URL(location, request.url()).href : request.url()}`);
        await route.fulfill({ status: 502, contentType: "text/plain", body: "redirect blocked by local POC" });
        return;
      }
      await route.fulfill({ response });
    });
    await context.routeWebSocket(() => true, (socket) => {
      blockedWebSockets.push(socket.url());
      socket.close();
    });

    const page = await context.newPage();
    await page.goto(`${targetOrigin}/home.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (window as Window & { pocDone?: boolean }).pocDone === true);
    await page.waitForTimeout(100);

    assert.ok(blockedHttp.some((item) => item.includes(`${canaryOrigin}/fetch`)), "external fetch was not blocked");
    assert.ok(blockedHttp.some((item) => item.includes(`${canaryOrigin}/image`)), "image subresource was not blocked");
    assert.ok(blockedHttp.some((item) => item.includes(`${canaryOrigin}/frame`)), "iframe subresource was not blocked");
    assert.ok(blockedHttp.some((item) => item.startsWith("POST ")), "same-origin POST was not blocked");
    assert.ok(blockedWebSockets.some((url) => url.includes("/socket")), "WebSocket was not blocked");

    await page.goto(`${targetOrigin}/redirect`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForTimeout(100);
    assert.ok(blockedHttp.some((item) => item.includes(`${canaryOrigin}/not-found`)), "redirect hop was not blocked");
    assert.equal(canaryRequests, 0, "canary received an HTTP request");
    assert.equal(canaryUpgrades, 0, "canary received a WebSocket upgrade");
    assert.equal(receivedPosts, 0, "target received a blocked POST");
    assert.equal(effectfulGets, 1, "the synthetic same-origin GET side effect did not occur");

    console.log(`POC OK: local allow ${targetOrigin}; blocked HTTP=${blockedHttp.length}; blocked WS=${blockedWebSockets.length}; canary HTTP/WS=0; POST received=0; synthetic GET side effect=${effectfulGets}`);
  } finally {
    await context?.close().catch(() => undefined);
    await closeBrowser(browser).catch(() => undefined);
    await closeServer(targetServer).catch(() => undefined);
    await closeServer(canaryServer).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error("POC FAIL:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
