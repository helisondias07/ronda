# Plano de evolução — QA real além do visor

Acesso 14/11/2026. **Não é oferta e não está implementado.** O visor publicado só lê JSON colado. QA de loja continua no **CLI local**. Custo de ferramenta no MVP: Playwright OSS **R$ 0**. Sem Checkly pago, sem ads, sem OpenCode Go como backend.

## Isolamento (já vale)

| Superfície | O que faz | O que não faz |
|---|---|---|
| Site Hobby | Mostra `report.json` | Não busca URL de loja (SSRF) |
| CLI no PC | Playwright no fixture ou URL de loopback literal `127.0.0.1` / `[::1]` com `--autorizo-este-ambiente`; intercepta same-origin GET e barra outros métodos, origens externas e confirmação de pedido | Nomes DNS, hosts remotos, produção de cliente; POST/PUT/DELETE; pedido |
| Perfil de browser | Um por loja (ADX) | Reusar sessão entre lojas |
| Página capturada | Título/h1 + sinais HTML básicos (`alt`, rótulo de input, texto de botão/link) | Não é WCAG/axe; não valida teclado, leitor de tela, contraste ou UI montada após captura |

## Limites de verificacao de rede

O CLI foi executado contra o fixture. Os testes de links usam `fetch` injetado; não houve teste de rede real dos bloqueios do Playwright nem simulação de DNS rebinding. A política atual recusa nomes DNS e restringe o alvo a fixture/loopback literal, mas isso não é certificação geral de isolamento de rede.

## Figma (fase posterior, sem fingir)

- Reusar `visual-review` do Oasis; **não** segundo motor de pixel.
- Entrada: PNG/PDF que o cliente exporta **ou** `FIGMA_TOKEN` + file/node no cofre.
- Sem token/spec: o laudo continua com `figma.available: false` e o motivo. Não desenhar diff falso.
- Comparação visual **implementada** só contra PNG que o usuário coloca no disco (`--ref-png`). Viewport e dimensões explícitas; sem reescalar.
- AUP Figma: não scrapar arquivo alheio; viewer token só com autorização.

## Acesso autorizado (só o usuário desbloqueia)

1. Autorização escrita do ambiente (local / staging / demo). Produção de cliente = não.
2. Conta de teste **já existente** no Vault. Não criar cadastro.
3. Allowlist de slugs institucionais.
4. Confirmação: produto **não aplica** patch.

Sem isso, a fase “loja de verdade” fica **blocked**.

## Sequência (quando desbloquear)

| Fase | Escopo | Fora |
|---|---|---|
| Agora | Fixture + visor honesto | Loja real |
| A (feita no fixture) | CLI: jornada configurável local (teto 8, parar antes de pagar), GET same-origin, print+sha256, h1/título, sinais HTML básicos de acessibilidade, hipóteses `apply: false`. Sem `/api` de browser. | Produção; Figma falso; afirmar conformidade WCAG |
| A2 | **Não habilitada para preview remoto.** O CLI só aceita `http(s)://127.0.0.1` ou `http(s)://[::1]` literal com `--autorizo-este-ambiente`; hostname/DNS é recusado antes de abrir o browser. | Staging/DNS, produção e garantia geral de isolamento |
| B | Anexar saída do `visual-review` no mesmo JSON (sugestão, `apply: false`) | Reimplementar Figma |
| C | Login só com Vault | CAPTCHA, SMS, social, pedido |

Critério de pronto de cada fase: teste automatizado + um laudo de fixture; zero commit no tema do cliente.

## Serviços que exigem conta, chave ou pagamento — não contratados

Acesso 14/11/2026. R$ 0 neste Hobby. **Não é oferta.**

| Integração | Por que espera | O que o usuário desbloqueia |
|---|---|---|
| Figma / `FIGMA_TOKEN` | Token + file/node autorizados | PNG local (`--ref-png`) até lá; `figma.available: false` |
| Login / Vault | Conta de teste já existente | Sem cadastro, CAPTCHA, SMS ou social |
| Loja de cliente / Admin Wake | Fora do escopo do CLI atual; exigir autorização escrita em avaliação futura | Só fixture ou loopback literal `127.0.0.1` / `[::1]` com `--autorizo-este-ambiente` |
| Pedido / pagamento / `checkoutComplete` | Fora da política | A jornada para em “Forma de pagamento” |
| Checkly / Tracefox / ads | Orçamento | Playwright OSS no PC; R$ 0 |
| Cobrança (Pix/cartão) | Vercel Pro + meio de pagamento | Migrar de Hobby **antes**; não contratar agora |
