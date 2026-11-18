# Ronda

- Só relata (`apply: false`). Nunca patch, nunca Admin, nunca pedido, nunca cartão.
- Alvo padrão: fixture controlado (`npm run ronda`). `--base-url` solto continua bloqueado; só é aceito em conjunto com `--manifest` validado (`StoreTargetManifest`), proxy local com DNS/IP Pinning e trava Safe-Checkout (`stopped_before_payment: true` + limpeza de carrinho no teardown).
- Scanner: só GET no scanner de links (teto 80 links, bloqueia SSRF). O app Next **não** faz fetch de alvo e **não** tem `/api` de browser.
- Não fingir Figma nem login. PNG de referência é arquivo local (`--ref-png`). OpenCode Go não é backend.
- Jornada: no fixture, somente a sequência exata revisada é executável; em loja autorizada por manifesto, `checkoutComplete`, rotas de sucesso/pagamento, iframes de cartão e controles de finalizar compra são bloqueados de forma rígida.
- `npx tsc --noEmit`, `npm test`, `npm run sandbox:poc`, `npm run ronda` e `npm run build` antes de dizer pronto. Audit: vitest 4.1.12 + override postcss 8.5.33 (sem Next 16).
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança nem gateway ativo neste deploy Hobby.
- Prints em `ronda-out/` (gitignored). Loja de cliente não entra neste repo.
