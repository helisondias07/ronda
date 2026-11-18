import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PLAN_PRICE_CONTRACT, PLANS } from "./plans";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const readApp = (rel: string) => readFileSync(join(appDir, rel), "utf8");

describe("plans: contrato comercial intacto", () => {
  it("mantém exatamente os preços aprovados: R$ 97 / R$ 147 / R$ 397", () => {
    expect(PLANS.map((plan) => plan.price)).toEqual([...PLAN_PRICE_CONTRACT]);
  });

  it("mantém os três planos com nome, período e CTA acionáveis", () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(["express", "loja", "agencia"]);
    expect(PLANS.map((plan) => plan.name)).toEqual(["Auditoria Express", "Plano Loja", "Agência"]);
    expect(PLANS.every((plan) => plan.period.length > 0 && plan.cta.length > 0)).toBe(true);
    expect(PLANS.filter((plan) => plan.featured)).toHaveLength(1);
    expect(PLANS.find((plan) => plan.featured)?.id).toBe("agencia");
  });

  it("CTAs são mailto bem-formados, sem promessa de cobrança automática", () => {
    for (const plan of PLANS) {
      expect(plan.href.startsWith("mailto:")).toBe(true);
      expect(decodeURIComponent(plan.href)).toContain(`R$ ${plan.price}`);
    }
  });

  it("bullets não prometem conclusão de pedido nem monitoramento sem manifesto", () => {
    const all = PLANS.flatMap((plan) => plan.bullets).join(" ");
    expect(all).not.toMatch(/checkoutComplete|concluir\s*pedido|pedido\s*conclu/i);
    expect(all).not.toMatch(/sem\s*manifesto|autoriza(c|ç)(a|ã)o\s*automática/i);
  });
});

describe("landing: regressão da reformulação editorial", () => {
  const home = readApp("page.tsx");

  it("home é página de venda e não embute a ferramenta /visor", () => {
    expect(home).not.toMatch(/from ["']\.\/viewer["']/);
    expect(home).not.toMatch(/Viewer/);
  });

  it("hero cumpre o teste dos 3 segundos (checkout quebrado + aviso)", () => {
    expect(home).toContain("Seu checkout quebrou às 14h32.");
    expect(home).toContain("WhatsApp em 30 segundos");
  });

  it("planos vêm da fonte única (lib/plans) e a âncora #plano existe", () => {
    expect(home).toContain('from "../lib/plans"');
    expect(home).toContain('id="plano"');
  });

  it("marca antiga (Ronda) não voltou para a camada comercial", () => {
    expect(home).not.toMatch(/\bRonda\b/);
    const layout = readApp("layout.tsx");
    expect(layout).toContain("CheckoutGuard");
    expect(layout).not.toMatch(/title:[\s\S]*Ronda/);
  });

  it("preços aparecem intactos no texto da home via contrato de planos", () => {
    // a home renderiza PLANS; o preço 97 aparece no CTA do hero e 97/147/397 virão de plans.ts
    expect(home).toContain("R$ 97");
    const plansSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "plans.ts"),
      "utf8",
    );
    for (const price of PLAN_PRICE_CONTRACT) {
      expect(plansSource).toContain(`price: ${price}`);
    }
  });

  it("comparativo honesto existe fora do fluxo do hero e sem tabela-report", () => {
    expect(home).toContain("Checkly");
    expect(home).toContain("BugBug");
    expect(home).toContain("Noibu");
    // hero termina antes da primeira section de erro; comparativo fica depois da prova
    const heroEnd = home.indexOf("</section>");
    const versus = home.indexOf("Checkly");
    expect(versus).toBeGreaterThan(heroEnd);
    expect(home).not.toMatch(/<table/);
  });
});
