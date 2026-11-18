# DESIGN.md — CheckoutGuard (repo slug `ronda`)

Direção do usuário (18/11/2026, 2ª reprovada): o nome **Ronda** virou marca comercial **CheckoutGuard** e a landing foi reprovada duas vezes — "parece relatório técnico, não um site de venda". Reformulação editorial definitiva: **página de venda, não relatório**. Comandos e caminhos internos (`npm run ronda`, `ronda-out/`) mantêm o slug histórico.

## Duas camadas, duas identidades

1. **Landing comercial `/` (editorial, 18/11 v2):** página de venda com DNA de documento (o produto é um laudo). Hero serifado de afirmação, não de explicação; o defeito 200/500 é composição tipográfica; a cena do WhatsApp é estática e grande; planos são linhas tipográficas, não cards; comparativo honesto existe, mas fora do fluxo de venda.
2. **Ferramenta técnica `/visor` (mantém o tom "laudo"):** documento de prova, sem conserto. Frase de 3 s: "Laudo da loja, com prova. A gente não mexe no site." Sem serif no corpo da ferramenta.

## Frase de leitura (brief da skill ui-humanizer)

Página de venda do CheckoutGuard para dono de loja e agência que paga tráfego — intenção **convencer**, linguagem direta de e-commerce brasileiro, stack Next.js estática sem downloads. Variação **alta** (seções com larguras e alinhamentos desiguais), Movimento **baixo** (zero animação decorativa; a única mudança dinâmica é a calculadora reagindo ao slider), Densidade **baixa-média** (copy curta com fatos reais).

## Tokens — landing comercial (`cg-*`, v2)

- Papel `--cg-paper` `#F6F3EC` · tom de seção `--cg-paper-deep` `#EFE9DD` (sem navy; o azul morreu com o visual de dashboard)
- Tinta `--cg-ink` `#14181D` · secundário `#5B6472` · fio de cabelo `#D8D2C4`
- Acento único de alarme `--cg-alarm` `#C13A2E` (o prejuízo, o erro 500, o vermelho da perda) · verde de seguro `--cg-safe` `#1B7A4A` (só em "passou" e "evitado")
- Display: **serif Georgia** com motivo (laudo/documento) — `clamp(2.7rem…5rem)` no hero, contraste de tamanho real; corpo: Segoe UI/system-ui; mono **só dentro de artefatos de evidência** (JSON, hash, horários)
- Raio 4–10px, uma regra de sombra; sem pill, sem chip pulsante, sem gradiente, sem emoji-ícone
- Divisores: hairlines `#D8D2C4`; seções de ritmos diferentes (hero 62rem, cena 2 colunas assimétricas, planos linhas full-width)

## Tokens — ferramenta /visor (mantidos, classe `slip`/`capa`)

- `--concreto` `#E6E1D6`, `--folha` `#F7F4EC`, `--carvao` `#1C1C1A`, `--suave` `#5A564E`, `--linha` `#C9C2B3`
- `--sinal` `#B8860B` · `--ok` `#1F5C45`, `--falha` `#8B1E1E`, `--parar` `#1F4E79`

## Acessibilidade (ambas as camadas)

Skip link, alvo ≥ 44px, foco 2px tinta, `@media print` fundo branco, `prefers-reduced-motion` (landing v2 não tem animação decorativa, então nada a suprimir).

Fonte: `Shared/AgentOps/DESIGN-laudo.md`, feedback do usuário de 18/11/2026 e skill `ui-humanizer` (SKILL.md).

