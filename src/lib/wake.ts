import type { StepId } from "./types";

export type JourneyStep = {
  id: StepId;
  heading: string;
  click?: string;
  stop?: boolean;
};

export const FIXTURE_JOURNEY: JourneyStep[] = [
  { id: "home", heading: "Loja Demo QA" },
  { id: "categoria", heading: "Tênis", click: "Ver categoria Tênis" },
  { id: "produto", heading: "Tênis Demo QA", click: "Ver produto" },
  { id: "carrinho", heading: "Carrinho", click: "Adicionar ao carrinho" },
  { id: "checkout", heading: "Forma de pagamento", click: "Ir ao checkout", stop: true },
];

type PagesJson = {
  pages?: Array<{ urlMatch?: string; authLevel?: string }>;
};

export function checkoutHints(pages: PagesJson): { checkout: boolean; completeForbidden: boolean } {
  const matches = (pages.pages || []).map((p) => p.urlMatch || "");
  return {
    checkout: matches.some((m) => /(^|\/)checkout\/?$/.test(m) || m.includes("checkout")),
    completeForbidden: matches.some((m) => /checkout\/(complete|confirmation)/.test(m)),
  };
}
