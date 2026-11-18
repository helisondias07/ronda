/**
 * Planos comerciais do CheckoutGuard — fonte única de preço e copy.
 * Contrato: R$ 97 (avulso) / R$ 147 (mês) / R$ 397 (mês) — não alterar sem aprovação.
 */

export type Plan = {
  id: "express" | "loja" | "agencia";
  name: string;
  price: number;
  period: string;
  tagline: string;
  bullets: string[];
  href: string;
  cta: string;
  featured: boolean;
};

const MAILTO_BASE = "mailto:helisondias07@gmail.com";

export const PLANS: Plan[] = [
  {
    id: "express",
    name: "Auditoria Express",
    price: 97,
    period: "avulso, por bateria",
    tagline: "Um laudo pontual da loja, antes ou depois de um deploy.",
    bullets: [
      "1 loja autorizada por manifesto assinado",
      "Bateria de 3 execuções (desktop e mobile)",
      "Jornada até o checkout, sem pagar, e até 80 links",
      "Laudo HTML/JSON com prints e hash SHA-256",
    ],
    href:
      `${MAILTO_BASE}?subject=${encodeURIComponent("CheckoutGuard - Auditoria Express (R$ 97)")}` +
      `&body=${encodeURIComponent(
        "Olá, quero agendar uma Auditoria Express do CheckoutGuard.\nLoja (HTTPS): \nPlataforma (Wake/Nuvemshop/Shopify/VTEX): \nResponsável: ",
      )}`,
    cta: "Pedir a auditoria",
    featured: false,
  },
  {
    id: "loja",
    name: "Plano Loja",
    price: 147,
    period: "por mês",
    tagline: "Ronda agendada a cada 60 minutos, com gatilho pós-deploy.",
    bullets: [
      "1 loja Wake ou Nuvemshop (Shopify/VTEX sob consulta)",
      "Reteste automático em 30 s contra falso-positivo",
      "Alertas por e-mail e Slack no primeiro sintoma",
      "Runner agendado incluído (GitHub Actions, custo R$ 0)",
    ],
    href:
      `${MAILTO_BASE}?subject=${encodeURIComponent("CheckoutGuard - Plano Loja (R$ 147/mês)")}` +
      `&body=${encodeURIComponent(
        "Olá, quero configurar o Piloto Assistido do Plano Loja no CheckoutGuard.\nLoja (HTTPS): \nPlataforma: ",
      )}`,
    cta: "Agendar piloto",
    featured: false,
  },
  {
    id: "agencia",
    name: "Agência",
    price: 397,
    period: "por mês, até 5 lojas",
    tagline: "A carteira inteira sob ronda, com laudo entregável por cliente.",
    bullets: [
      "Até 5 lojas autorizadas (+ R$ 59/mês por extra)",
      "Ronda a cada 30 min e vistoria pós-deploy",
      "Alertas em Slack, ClickUp e WhatsApp",
      "Laudo técnico exportável por entrega",
    ],
    href:
      `${MAILTO_BASE}?subject=${encodeURIComponent("CheckoutGuard - Plano Agência (R$ 397/mês)")}` +
      `&body=${encodeURIComponent(
        "Olá, quero configurar o Piloto Assistido para Agência (até 5 lojas) no CheckoutGuard.\nAgência: \nPlataformas da carteira: ",
      )}`,
    cta: "Falar sobre a carteira",
    featured: true,
  },
];

export const PLAN_PRICE_CONTRACT = [97, 147, 397] as const;
