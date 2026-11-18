# DESIGN.md — CheckoutGuard (repo slug `ronda`)

Direção do usuário (18/11/2026): o nome **Ronda** foi substituído pela marca comercial **CheckoutGuard** — *"Monitoramento Inteligente de Jornada & Checkout para E-commerce"*. Reformulação visual completa da landing (zero cara de dashboard, visual único B2B Commerce Security, distinto dos demais produtos do usuário). Comandos e caminhos internos (`npm run ronda`, `ronda-out/`) mantêm o slug histórico.

## Duas camadas, duas identidades

1. **Landing comercial `/` (nova, 2026-11):** página de venda para Meta Ads, foco em dono de loja e agência. Hero navy com simulação animada da jornada (`Home → Produto → Frete CEP → Checkout`) e mockup da notificação WhatsApp em ~30s.
2. **Ferramenta técnica `/visor` (mantém o tom "laudo"):** documento de prova, sem conserto. Frase de 3 s: "Laudo da loja, com prova. A gente não mexe no site." Sem serif.

## Tokens — landing comercial (`cg-*`)

- `--cg-navy` `#090D16` (hero e rodapé) · `--cg-navy-2` `#10182B` (painéis do hero)
- Seções claras: `--cg-paper` `#FFFFFF` · `--cg-mist` `#F4F7FB` (alternância rigorosa navy ↔ claro)
- Sinal: `--cg-signal` `#00C853` (CTA, verde de sucesso) · Alerta: `--cg-alert` `#EF4444` (erro, prejuízo) · Parada segura: `--cg-stop` `#2563EB`
- Tinta `#0B1220`, texto secundário `#475569`, linhas `#E2E8F0`
- Tipo: IBM Plex Sans/Mono quando instaladas localmente; caso contrário, pilhas de sistema. O build não baixa fontes.
- Cards com raio 12–16 px e sombras suaves; botões com alvo ≥ 44 px; tabela comparativa com zebra claro.

## Tokens — ferramenta /visor (mantidos, classe `slip`/`capa`)

- `--concreto` `#E6E1D6`, `--folha` `#F7F4EC`, `--carvao` `#1C1C1A`, `--suave` `#5A564E`, `--linha` `#C9C2B3`
- `--sinal` `#B8860B` · `--ok` `#1F5C45`, `--falha` `#8B1E1E`, `--parar` `#1F4E79`

## Acessibilidade (ambas as camadas)

Skip link, alvo 44 px, foco 2 px, prints com texto, `@media print` fundo branco, `prefers-reduced-motion` (simulação do hero congela no estado final; pulsos desativados).

Fonte: `Shared/AgentOps/DESIGN-laudo.md` + feedback do usuário de 18/11/2026.
