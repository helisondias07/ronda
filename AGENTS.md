# Ronda

- Só relata. Nunca patch, nunca Admin, nunca pedido, nunca cartão.
- Alvo único: fixture controlado. `--base-url` está desativado; GET também pode ter efeitos.
- Scanner: só GET, teto 80 links, bloqueia SSRF. O app Next **não** faz fetch de alvo e **não** tem `/api` de browser.
- Não fingir Figma nem login. PNG de referência é arquivo local (`--ref-png`). OpenCode Go não é backend.
- Jornada: somente a sequência exata do fixture é executável. JSON customizado, cliques ambíguos e ações fora da allowlist são bloqueados; parada antes de pagar só vale na rota fictícia `/checkout.html`.
- `npm test` e `npm run ronda` antes de dizer pronto. Audit: vitest 4.1.12 + override postcss 8.5.33 (sem Next 16).
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança neste projeto.
- Prints em `ronda-out/` (gitignored). Loja de cliente não entra neste repo.
