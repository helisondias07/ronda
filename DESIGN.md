# DESIGN.md — Ronda

Direção do Diretor (14/11/2026): laudo de vistoria. Rótulo provisório **Laudo** — marca e domínio **não conferidos**. O slug publicado continua `ronda`. Sem serif (a serif ficou no produto de candidatos).

## Intenção
Documento de prova, sem conserto. Frase de 3 s: “Laudo da loja, com prova. A gente não mexe no site.”

## Tokens
- `--concreto` `#E6E1D6`, `--folha` `#F7F4EC`, `--carvao` `#1C1C1A`, `--suave` `#5A564E`, `--linha` `#C9C2B3`
- `--sinal` `#B8860B` (faixa “em vistoria”, texto carvão em cima)
- `--ok` `#1F5C45`, `--falha` `#8B1E1E`, `--parar` `#1F4E79` (checkout parado ≠ falha)
- Tipo: IBM Plex Sans/Mono quando instaladas localmente; caso contrario, pilhas de sistema (Segoe UI/system-ui e Consolas/monospace). O build nao baixa fontes.

## Acessibilidade
Skip link, alvo 44px, foco 2px carvão, prints com texto, `@media print` fundo branco, `prefers-reduced-motion`.

Fonte: `Shared/AgentOps/DESIGN-laudo.md`.
