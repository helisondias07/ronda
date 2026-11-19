# DESIGN.md — CheckoutGuard (repo slug `ronda`)

Direção vigente (19/11, anti-slop): **"Sala de Controle"** — instrumento de medição de receita. Duas superfícies na mesma marca: **obsidiana** (o instrumento, ao vivo) e **papel** (o laudo, o que se entrega). Fonte: `C:/Users/HelisonDias/OpenBot/Shared/AgentOps/rebranding-anti-slop-2026-11-18.md`.
Direções anteriores (navy, depois editorial) estão superadas. Comandos e caminhos internos (`npm run ronda`, `ronda-out/`) mantêm o slug histórico.

## Tokens (globals.css, prefixo `cg-`)
- Fundo `--cg-bg` `#101210` · poço `--cg-bg-deep` `#0A0B09` · painel `--cg-surface` `#171A16` · ativo `#20241E`
- Réguas `--cg-line` `#2C312A` / `#3C4238` · texto `--cg-text` `#EFEDE3` · secundário `#A9AE9F` · rótulo mono `#7C8274` (ajustado de `#767C6F`: 4,9:1 medido, o original ficava em 4,47:1)
- Quebra `--cg-broken` `#E4573D` · integridade `#79C99E` · atenção `#E0A33F` · parado `#8FB4CE`
- Papel do laudo `--cg-paper` `#F2EFE4` · tinta `#14150F` · réguas `#CFC9B8`; no papel, status usam versões escuras medidas: `#A5341F` (falha, 5,9:1) e `#1E5B3F` (ok).
- Tipo: **Bodoni Moda** (veredito/H1, só ≥40px, tracking −0.02em), **Archivo** (UI), **IBM Plex Mono** (telemetria, preços, perda). OFL auto-hospedadas.
- Raio **0**; sombra **zero** (elevação = superfície + régua); foco 2px marfim; alvo 44px; espaçamento 4pt, container 1200.

## Componentes
- **Hero "Instrumento":** grid 12, sem card; esquerda linha mono `SEX · 14:32 · PRODUÇÃO`, H1 Bodoni "Seu checkout quebrou às 14h32.", sub Archivo 20px, CTA sólido marfim + ghost sublinhado; direita **painel de varredura** de 5 passos (Home → Produto → Carrinho → Pagamento → Confirmação), régua superior de 2px, linha quebrada em `--cg-broken` com "HTTP 500 · há 4 min", uma varredura de 1,2s a cada 8s (opacity .15; parada com `prefers-reduced-motion`).
- **Loss calculator "faixa de cálculo":** sem caixa; rótulo mono + valor, régua superior de 2px; saída em Archivo 700 `clamp(56, 8vw, 112)px`, unidade mono, legenda fixa "estimativa, não promessa". Lógica em `lib/loss-estimator.ts` intacta.
- **Laudo "a folha":** superfície `--cg-paper`, cabeçalho mono (protocolo, data, domínio), veredito Bodoni 32, passos 01–05 com status escrito + cor, erro citado em mono, notas de auditor em mono 12. Único lugar com papel.
- **Planos "contrato":** três colunas separadas por régua vertical de 1px, sem fundo de card; preço mono 500; lista com régua entre itens; recomendada com régua superior de 2px e rótulo mono "mais escolhido"; CTA sólido só na recomendada, demais sublinhado. Preços via `lib/plans.ts` (R$ 97/147/397).
- **`/visor`** mantém os tokens "laudo" originais (classes `.capa/.slip`) — é a ferramenta de prova, não a landing.

## Regras vigentes
- Nenhum gradiente, sombra, raio > 0, ícone em círculo colorido, verde neon, scanline decorativa.
- Preservada a correção de contraste de `button.cg-cta-quiet` (fundo transparente, herda a superfície).
- Lógica intacta: `match.ts` não existe aqui; cálculo da perda, rotas `/api/checkout` e `/api/webhooks/stripe`, testes de isolamento e fluxos existentes permanecem.
- Vercel Hobby = vitrine/checkout em simulação até chaves Stripe reais; sem promessa de monitoramento de loja real sem manifesto.
