import type { StepResult, Suggestion } from "./types";

export function suggest(step: StepResult): Suggestion | null {
  if (step.pass) return null;
  const err = step.error || "etapa falhou";
  let hypothesis = `A etapa ${step.id} não chegou no estado esperado.`;
  if (/status_code":\s*500|Scriban/i.test(err)) {
    hypothesis =
      "O Storefront devolveu JSON com status_code 500 (erro Scriban). HTTP 200 não prova a página. Hipótese: função ou partial ausente no tema — não aplicar patch daqui.";
  } else if (/Timeout/i.test(err)) {
    hypothesis =
      "O seletor não ficou visível a tempo. Hipótese: preview local sem interação, CTA com texto diferente, ou minicart por snippet. Só relata.";
  }
  return { step: step.id, hypothesis, apply: false, kind: "hypothesis" };
}
