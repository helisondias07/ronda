import fs from "node:fs";
import path from "node:path";

/** O site Hobby não pode expor Playwright nem fetch de loja. */
export function hostedBrowserEndpointForbidden(appDir: string): {
  ok: boolean;
  apiRoutes: string[];
  reason: string;
} {
  const api = path.join(appDir, "api");
  const apiRoutes = fs.existsSync(api)
    ? fs.readdirSync(api, { recursive: true }).map(String).filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    : [];
  return {
    ok: apiRoutes.length === 0,
    apiRoutes,
    reason:
      "O visor só lê JSON colado. Qualquer /api que rode browser ou GET de loja quebra o isolamento SSRF.",
  };
}
