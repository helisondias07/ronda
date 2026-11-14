# Ronda

- Só relata. Nunca patch, nunca Admin, nunca pedido, nunca cartão.
- Alvo padrão: fixture. Apenas loopback literal (`127.0.0.1` ou `[::1]`) exige `--autorizo-este-ambiente`; nomes DNS e URLs remotas são bloqueados.
- Scanner: só GET, teto 80 links, bloqueia SSRF. O app Next **não** faz fetch de alvo e **não** tem `/api` de browser.
- Não fingir Figma nem login. PNG de referência é arquivo local (`--ref-png`). OpenCode Go não é backend.
- Jornada: JSON local (`--journey`), teto 8 etapas, `stop: true` obrigatório. Sem clique de pedido. Figma continua skip.
- `npm test` e `npm run ronda` antes de dizer pronto. Audit: vitest 4.1.12 + override postcss 8.5.33 (sem Next 16).
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança neste projeto.
- Prints em `ronda-out/` (gitignored). Loja de cliente não entra neste repo.
