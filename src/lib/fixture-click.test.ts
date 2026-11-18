import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright";
import { defaultJourney } from "./journey";
import { clickFixtureAction, isBuiltInFixtureJourney } from "./fixture-click";

describe("fixture-only journey execution", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  it("accepts only the reviewed fixture sequence", () => {
    const fixture = defaultJourney();
    expect(isBuiltInFixtureJourney(fixture)).toBe(true);
    expect(isBuiltInFixtureJourney({
      ...fixture,
      steps: fixture.steps.map((step) => step.id === "carrinho" ? { ...step, click: "Comprar agora" } : step),
    })).toBe(false);
  });

  it("does not fire ambiguous button or side-effecting GET link handlers", async () => {
    const page = await browser.newPage();
    await page.setContent(`
      <button type="button" onclick="window.clicked = true">Comprar agora</button>
      <a href="/mutar?acao=exemplo" onclick="window.clicked = true">Abrir detalhes</a>
      <output id="clicked">não</output>
      <script>window.clicked = false</script>
    `);

    await expect(clickFixtureAction(page, {
      id: "carrinho", heading: "Carrinho", click: "Comprar agora", clickRole: "button",
    }, "fixture", "/produto.html")).rejects.toThrow(/bloqueado/);
    await expect(clickFixtureAction(page, {
      id: "checkout", heading: "Forma de pagamento", click: "Abrir detalhes", clickRole: "link", stop: true,
    }, "fixture", "/carrinho.html")).rejects.toThrow(/bloqueado/);
    await expect(clickFixtureAction(page, {
      id: "carrinho", heading: "Carrinho", click: "Adicionar ao carrinho", clickRole: "button",
    }, "authorized-local", "/produto.html")).rejects.toThrow(/bloqueado/);

    expect(await page.evaluate(() => (window as unknown as { clicked: boolean }).clicked)).toBe(false);
    await page.close();
  });
});
