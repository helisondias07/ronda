import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { hostedBrowserEndpointForbidden } from "./isolation";

const appDir = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");

describe("isolamento do visor e rotas públicas B2B", () => {
  it("só publica as rotas de pagamento no allowlist — nenhum endpoint de browser ou crawl", () => {
    const check = hostedBrowserEndpointForbidden(appDir());
    const allowed = ["checkout/route.ts", "webhooks/stripe/route.ts"];
    expect(check.apiRoutes.map((f) => f.replace(/\\/g, "/")).sort()).toEqual(allowed);
    expect(check.forbiddenRoutes).toEqual([]);
    expect(check.ok).toBe(true);
    expect(fs.existsSync(path.join(appDir(), "visor", "page.tsx"))).toBe(true);
  });

  it("nenhuma rota /api importa playwright nem aceita alvo de loja do cliente", () => {
    const apiDir = path.join(appDir(), "api");
    const files = fs.readdirSync(apiDir, { recursive: true }).map(String).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
      const src = fs.readFileSync(path.join(apiDir, file), "utf8");
      expect(src).not.toMatch(/playwright|chromium/i);
      expect(src).not.toMatch(/--base-url|allowHost|storeManifest|RONDA_ALLOW_HOST/i);
    }
  });

  it("habilita indexação SEO pública e sitemap para /, /visor e /privacidade", () => {
    const layoutSrc = fs.readFileSync(path.join(appDir(), "layout.tsx"), "utf8");
    expect(layoutSrc).toContain("robots: { index: true, follow: true }");
    expect(layoutSrc).not.toContain("noindex");

    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);

    const urls = sitemap().map((item) => new URL(item.url).pathname);
    expect(urls).toEqual(["/", "/visor", "/privacidade"]);
  });
});
