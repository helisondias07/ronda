import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { hostedBrowserEndpointForbidden } from "./isolation";

describe("isolamento do visor e rotas públicas B2B", () => {
  it("não publica endpoint de browser ou crawl", () => {
    const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");
    const check = hostedBrowserEndpointForbidden(appDir);
    expect(check.apiRoutes).toEqual([]);
    expect(check.ok).toBe(true);
    expect(fs.existsSync(path.join(appDir, "visor", "page.tsx"))).toBe(true);
  });

  it("habilita indexação SEO pública e sitemap para /, /visor e /privacidade", () => {
    const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");
    const layoutSrc = fs.readFileSync(path.join(appDir, "layout.tsx"), "utf8");
    expect(layoutSrc).toContain("robots: { index: true, follow: true }");
    expect(layoutSrc).not.toContain("noindex");

    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);

    const urls = sitemap().map((item) => new URL(item.url).pathname);
    expect(urls).toEqual(["/", "/visor", "/privacidade"]);
  });
});
