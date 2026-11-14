import { describe, expect, it } from "vitest";
import { checkPlanned, extractHrefs, planLinks } from "./scan";

describe("scan", () => {
  it("extracts and classifies hrefs without fetching externals or scripts", () => {
    const html = `
      <a href="sobre.html">Sobre</a>
      <a href="mailto:contato@demo-qa.example">e-mail</a>
      <a href="https://example.com">fora</a>
      <a href="javascript:alert(1)">js</a>
      <a href="http://169.254.169.254/">meta</a>
    `;
    const hrefs = extractHrefs(html);
    const planned = planLinks(hrefs, "http://127.0.0.1:9", true);
    expect(planned.map((p) => p.verdict)).toEqual([
      "ok",
      "skipped-mailto",
      "skipped-external",
      "skipped-script",
      "skipped-external",
    ]);
  });

  it("marks 404 as broken via injected GET", async () => {
    const planned = planLinks(["falta.html"], "http://127.0.0.1:9", true);
    const checked = await checkPlanned(planned, async () => ({
      status: 404,
      headers: { get: () => null },
    }));
    expect(checked[0].verdict).toBe("broken");
    expect(checked[0].status).toBe(404);
  });

  it("does not follow a redirect into a private host", async () => {
    const planned = planLinks(["go.html"], "http://127.0.0.1:9", true);
    const checked = await checkPlanned(planned, async () => ({
      status: 302,
      headers: { get: (name: string) => (name === "location" ? "http://10.0.0.1/secret" : null) },
    }));
    expect(checked[0].verdict).toBe("skipped-ssrf");
  });
});
