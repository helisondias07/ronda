import type { PageFacts, Suggestion } from "./types";

export type { PageFacts };

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function attribute(attributes: string, name: string): string | undefined {
  return attributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]?.trim();
}

function basicAccessibilityFindings(html: string): string[] {
  const findings: string[] = [];
  const images = [...html.matchAll(/<img\b([^>]*)>/gi)];
  images.forEach((match, index) => {
    if (attribute(match[1], "aria-hidden")?.toLowerCase() === "true") return;
    if (attribute(match[1], "alt") === undefined) findings.push(`Imagem ${index + 1}: falta atributo alt.`);
  });

  const controls = [
    ...html.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi),
  ];
  controls.forEach((match, index) => {
    if (attribute(match[2], "aria-hidden")?.toLowerCase() === "true") return;
    const label = attribute(match[2], "aria-label") || attribute(match[2], "title");
    if (!label && !stripTags(match[3])) {
      findings.push(`Controle ${index + 1} (${match[1].toLowerCase()}): sem texto visível ou rótulo aria-label.`);
    }
  });

  const fields = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)].filter(
    (match) =>
      attribute(match[2], "type")?.toLowerCase() !== "hidden" &&
      attribute(match[2], "aria-hidden")?.toLowerCase() !== "true",
  );
  fields.forEach((match, index) => {
    const id = attribute(match[2], "id");
    const labelledBy = attribute(match[2], "aria-labelledby");
    const ariaLabel = attribute(match[2], "aria-label");
    const title = attribute(match[2], "title");
    const hasForLabel = id && [...html.matchAll(/<label\b([^>]*)>/gi)].some((label) => attribute(label[1], "for") === id);
    const position = match.index ?? 0;
    const labelStart = html.lastIndexOf("<label", position);
    const labelEnd = html.lastIndexOf("</label>", position);
    const labelClose = html.indexOf("</label>", position);
    const hasWrappingLabel = labelStart > labelEnd && labelClose >= 0 && labelClose - position < 300;
    if (!labelledBy && !ariaLabel && !title && !hasForLabel && !hasWrappingLabel) {
      findings.push(`Campo ${index + 1} (${match[1].toLowerCase()}): rótulo programático não encontrado.`);
    }
  });
  return findings;
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
  return {
    url,
    status,
    title,
    h1,
    pass,
    suggestion,
    accessibility: { scope: "static-html-heuristic", findings: basicAccessibilityFindings(html) },
  };
}
