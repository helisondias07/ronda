# Ronda

- Só relata. Nunca patch, nunca Admin, nunca pedido, nunca cartão.
- Alvo padrão: fixture. URL remota exige `--autorizo-este-ambiente` e localhost ou `RONDA_ALLOW_HOST`.
- Scanner: só GET, teto 80 links, bloqueia SSRF. O app Next **não** faz fetch de alvo.
- Não fingir Figma nem login. OpenCode Go não é backend.
- `npm test` e `npm run ronda` antes de dizer pronto.
- Prints em `ronda-out/` (gitignored). Loja de cliente não entra neste repo.
