import type { Page } from "playwright";
import type { JourneyStep } from "./wake";

const BUILT_IN_STEPS: JourneyStep[] = [
  { id: "home", heading: "Loja Demo QA" },
  { id: "categoria", heading: "Tênis", click: "Ver categoria Tênis" },
  { id: "produto", heading: "Tênis Demo QA", click: "Ver produto" },
  { id: "carrinho", heading: "Carrinho", click: "Adicionar ao carrinho", clickRole: "button" },
  { id: "checkout", heading: "Forma de pagamento", click: "Ir ao checkout", stop: true },
];

const FIXTURE_ACTIONS = [
  { id: "categoria", from: "/home.html", role: "link", label: "Ver categoria Tênis", to: "/categoria.html" },
  { id: "produto", from: "/categoria.html", role: "link", label: "Ver produto", to: "/produto.html" },
  {
    id: "carrinho",
    from: "/produto.html",
    role: "button",
    label: "Adicionar ao carrinho",
    to: "/carrinho.html?qty=1",
    handler: "window.location.href='carrinho.html?qty=1'",
  },
  { id: "checkout", from: "/carrinho.html", role: "link", label: "Ir ao checkout", to: "/checkout.html" },
] as const;

export function isBuiltInFixtureJourney(input: { startPath: string; steps: JourneyStep[] }): boolean {
  const { startPath, steps } = input;
  return startPath === "/home.html" && steps.length === BUILT_IN_STEPS.length && steps.every((step, index) => {
    const expected = BUILT_IN_STEPS[index];
    return step.id === expected.id && step.heading === expected.heading && step.click === expected.click &&
      (step.click ? step.clickRole || "link" : undefined) === (expected.click ? expected.clickRole || "link" : undefined) &&
      Boolean(step.stop) === Boolean(expected.stop);
  });
}

export async function clickFixtureAction(
  page: Page,
  step: JourneyStep,
  targetKind: "fixture" | "authorized-local",
  currentPath: string,
): Promise<void> {
  const action = FIXTURE_ACTIONS.find((candidate) => candidate.id === step.id);
  if (
    targetKind !== "fixture" || !action || action.from !== currentPath ||
    step.click !== action.label || (step.clickRole || "link") !== action.role
  ) {
    throw new Error("política: clique fora da sequência exata e controlada do fixture foi bloqueado");
  }

  const locator = page.getByRole(action.role, { name: action.label, exact: true });
  if (await locator.count() !== 1) throw new Error("política: controle do fixture ausente ou ambíguo");

  if (action.role === "link") {
    const href = await locator.getAttribute("href");
    const inlineHandler = await locator.getAttribute("onclick");
    const destination = href ? new URL(href, page.url()) : null;
    if (inlineHandler !== null || !destination || destination.origin !== new URL(page.url()).origin || `${destination.pathname}${destination.search}` !== action.to) {
      throw new Error("política: destino do link do fixture não corresponde ao mapa validado");
    }
  } else {
    const safeButton = await locator.evaluate((element, expectedHandler) =>
      element instanceof HTMLButtonElement && element.type === "button" && !element.closest("form") &&
      element.getAttribute("onclick") === expectedHandler,
    action.handler,
    );
    if (!safeButton) throw new Error("política: botão do fixture não é um controle local validado");
  }

  const destination = new URL(action.to, page.url()).href;
  const navigation = page.waitForURL(destination, { waitUntil: "domcontentloaded", timeout: 5000 });
  await locator.click();
  await navigation;
}
