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

  it("aponta apenas sinais HTML básicos de acessibilidade e explica o escopo", () => {
    const facts = auditHtml(
      "http://127.0.0.1/form",
      '<title>Form</title><h1>Contato</h1><img src="a.png"><button><svg></svg></button><input id="email"><img src="decor.png" alt=""><img src="hidden.png" aria-hidden="true"><label for="nome">Nome</label><input id="nome"><input type="hidden" name="token"><input aria-hidden="true">',
    );
    expect(facts.accessibility?.scope).toBe("static-html-heuristic");
    expect(facts.accessibility?.findings).toEqual([
      "Imagem 1: falta atributo alt.",
      "Controle 1 (button): sem texto visível ou rótulo aria-label.",
      "Campo 1 (input): rótulo programático não encontrado.",
    ]);
  });
});
