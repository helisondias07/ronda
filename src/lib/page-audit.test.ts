import { describe, expect, it } from "vitest";
import { auditHtml } from "./page-audit";

describe("auditHtml", () => {
  it("passa com h1 e marca hipótese sem patch quando falta conteúdo", () => {
    const ok = auditHtml("http://127.0.0.1/home.html", "<title>Home</title><h1>Vitrine</h1>");
    expect(ok.pass).toBe(true);
    expect(ok.suggestion).toBeUndefined();
    const empty = auditHtml("http://127.0.0.1/x", "<html><body></body></html>", 200);
    expect(empty.pass).toBe(false);
    expect(empty.suggestion?.apply).toBe(false);
    expect(empty.suggestion?.kind).toBe("hypothesis");
    expect(empty.suggestion?.hypothesis).toMatch(/não aplicar/i);
    const broken = auditHtml("http://127.0.0.1/falta", "<h1>x</h1>", 404);
    expect(broken.pass).toBe(false);
    expect(broken.suggestion?.hypothesis).toMatch(/HTTP 404/);
  });
});
