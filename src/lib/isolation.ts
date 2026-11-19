import fs from "node:fs";
import path from "node:path";

/**
 * Allowlist das únicas rotas /api permitidas no site público: infraestrutura de
 * pagamento (Stripe Checkout + webhook). Nenhuma rota pode executar navegador,
 * acessar lojas de terceiros ou aceitar URL arbitrária (anti-SSRF).
 */
const ALLOWED_API_ROUTES = new Set(["checkout\\route.ts", "checkout/route.ts", "webhooks\\stripe\\route.ts", "webhooks/stripe/route.ts"]);

/** O site público não pode expor Playwright, crawl de loja nem /api fora do allowlist de pagamento. */
export function hostedBrowserEndpointForbidden(appDir: string): {
  ok: boolean;
  apiRoutes: string[];
  forbiddenRoutes: string[];
  reason: string;
} {
  const api = path.join(appDir, "api");
  const apiRoutes = fs.existsSync(api)
    ? fs.readdirSync(api, { recursive: true }).map(String).filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    : [];
  const forbiddenRoutes = apiRoutes.filter((f) => !ALLOWED_API_ROUTES.has(f));
  return {
    ok: forbiddenRoutes.length === 0,
    apiRoutes,
    forbiddenRoutes,
    reason:
      "Somente /api/checkout e /api/webhooks/stripe (pagamento hospedado, sem navegador, sem acesso a lojas) são permitidas. Qualquer /api de browser ou GET de loja quebra o isolamento SSRF.",
  };
}
