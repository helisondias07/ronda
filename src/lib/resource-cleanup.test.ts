import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { closeBrowser, closeServer } from "./resource-cleanup";

describe("idempotent resource cleanup", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await closeBrowser(browser);
  });

  it("closes an HTTP server once even when cleanup is repeated", async () => {
    const server = http.createServer((_request, response) => response.end("fixture"));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    await Promise.all([closeServer(server), closeServer(server)]);
    await closeServer(server);
    expect(server.listening).toBe(false);
  });

  it("closes Chromium once even when cleanup is repeated", async () => {
    expect(browser.isConnected()).toBe(true);
    await Promise.all([closeBrowser(browser), closeBrowser(browser)]);
    await closeBrowser(browser);
    expect(browser.isConnected()).toBe(false);
  });
});
