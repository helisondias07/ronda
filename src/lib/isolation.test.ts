import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hostedBrowserEndpointForbidden } from "./isolation";

describe("isolamento do visor", () => {
  it("não publica endpoint de browser ou crawl", () => {
    const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");
    const check = hostedBrowserEndpointForbidden(appDir);
    expect(check.apiRoutes).toEqual([]);
    expect(check.ok).toBe(true);
  });
});
