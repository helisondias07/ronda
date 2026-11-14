# Ronda

- Só relata. Nunca patch, nunca Admin, nunca pedido, nunca cartão.
- Alvo padrão: fixture. URL remota exige `--autorizo-este-ambiente` e localhost ou `RONDA_ALLOW_HOST`.
- Scanner: só GET, teto 80 links, bloqueia SSRF. O app Next **não** faz fetch de alvo e **não** tem `/api` de browser.
- Não fingir Figma nem login. PNG de referência é arquivo local (`--ref-png`). OpenCode Go não é backend.
- `npm test` e `npm run ronda` antes de dizer pronto. Audit: vitest 4.1.12 + override postcss 8.5.33 (sem Next 16).
- Vercel Hobby = pessoal/não comercial (Termos §4). Sem cobrança neste projeto.
- Prints em `ronda-out/` (gitignored). Loja de cliente não entra neste repo.
