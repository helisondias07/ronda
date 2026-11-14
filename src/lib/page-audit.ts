import type { PageFacts, Suggestion } from "./types";

export type { PageFacts };

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function auditHtml(url: string, html: string, status = 200): PageFacts {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const httpOk = status > 0 && status < 400;
  const pass = httpOk && Boolean(title || h1);
  let suggestion: Suggestion | undefined;
  if (!httpOk) {
    suggestion = {
      step: "pagina",
      kind: "hypothesis",
      apply: false,
      hypothesis: `Hipótese: HTTP ${status} nesta rota. Não é patch e não prova a loja inteira.`,
    };
  } else if (!title && !h1) {
    suggestion = {
      step: "pagina",
      kind: "hypothesis",
      apply: false,
      hypothesis:
        "Hipótese: a página respondeu mas não tem título nem h1 visível. HTTP 200 não prova o conteúdo — não aplicar correção daqui.",
    };
  }
  return { url, status, title, h1, pass, suggestion };
}
