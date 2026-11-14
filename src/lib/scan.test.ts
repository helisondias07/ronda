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
      "skipped-ssrf",
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

  it("blocks redirects into private and DNS targets without fetching them", async () => {
    const planned = planLinks(["go.html"], "http://127.0.0.1:9", true);
    let calls = 0;
    const checked = await checkPlanned(planned, async () => ({
      status: (calls++, 302),
      headers: { get: (name: string) => (name === "location" ? "http://10.0.0.1/secret" : null) },
    }));
    expect(checked[0].verdict).toBe("skipped-ssrf");
    expect(calls).toBe(1);
  });

  it("revalidates caller-supplied links before making any request", async () => {
    let calls = 0;
    const checked = await checkPlanned(
      [{ href: "http://public-rebind.example/", verdict: "ok" }],
      async () => {
        calls += 1;
        return { status: 200, headers: { get: () => null } };
      },
    );
    expect(checked[0].verdict).toBe("skipped-ssrf");
    expect(calls).toBe(0);
  });

  it("follows same-origin redirects and reports the final 404", async () => {
    const planned = planLinks(["go.html"], "http://127.0.0.1:9", true);
    const requested: string[] = [];
    const checked = await checkPlanned(planned, async (url) => {
      requested.push(url);
      return requested.length === 1
        ? { status: 302, headers: { get: (name: string) => (name === "location" ? "/missing.html" : null) } }
        : { status: 404, headers: { get: () => null } };
    });
    expect(requested).toEqual(["http://127.0.0.1:9/go.html", "http://127.0.0.1:9/missing.html"]);
    expect(checked[0]).toMatchObject({ status: 404, verdict: "broken" });
  });

  it("does not follow a redirect to a DNS hostname", async () => {
    const planned = planLinks(["go.html"], "http://127.0.0.1:9", true);
    let calls = 0;
    const checked = await checkPlanned(planned, async () => {
      calls += 1;
      return {
        status: 302,
        headers: { get: (name: string) => (name === "location" ? "http://public-rebind.example/maybe-private" : null) },
      };
    });
    expect(checked[0].verdict).toBe("skipped-external");
    expect(calls).toBe(1);
  });
});
