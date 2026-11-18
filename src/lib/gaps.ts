import fs from "node:fs";
import type { Skip } from "./types";

export function figmaSkip(env: NodeJS.ProcessEnv = process.env): Skip {
  const spec = env.RONDA_FIGMA_SPEC;
  if (spec && fs.existsSync(spec)) {
    return {
      available: false,
      reason:
        "há spec no disco, mas o CheckoutGuard não reimplementa o visual-review; rode o gate Oasis à parte. apply: false",
    };
  }
  return {
    available: false,
    reason: "sem FIGMA_TOKEN nem spec local. Não fingimos comparação com Figma.",
  };
}

export function authSkip(): Skip {
  return {
    available: false,
    reason:
      "sem conta de teste no Vault. O CheckoutGuard não cria cadastro, não preenche senha e não automatiza CAPTCHA/SMS/social.",
  };
}
