# Ronda

Percorre **home → categoria → produto → carrinho → checkout**, olha **institucionais** e **links** same-origin, e emite um laudo. **Para antes de pagar.** **Não altera o site.** **Não garante que detecta tudo.**

O site publicado só **mostra** um `report.json`. Ele **não busca URL** (isolamento contra SSRF). A ronda roda no seu computador.

## O que funciona de verdade

| Função | Como |
|---|---|
| Fixture Demo QA | `npm run ronda` — 5 etapas, `stopped_before_payment` |
| Institucionais | allowlist `sobre.html`, `politica.html` |
| Links / botões com href | GET same-origin, teto 80, timeout 8s; mailto/externo/script ignorados |
| Console | só `pageerror` / `console.error` first-party |
| 500 Scriban | JSON `status_code: 500` = falha, mesmo com HTTP 200 |
| SSRF | bloqueia IP privado, metadata, credencial na URL, redirect para 10.x |
| Sugestão | hipótese no laudo com `apply: false` |
| Visor | cola JSON; exemplo é o fixture, rotulado |

## O que não faz (de propósito)

- Pedido, cartão, 3DS, `checkoutComplete`, PATCH/POST destrutivo
- Patch em tema, Admin, FTP, preço/estoque/frete
- Loja de cliente em produção
- **Figma:** sem token/spec não comparamos; não desenhamos diff falso (use `visual-review` no Oasis)
- **Login:** sem conta no Vault não autenticamos; não criamos cadastro
- SaaS com OpenCode Go / chave GLM pessoal
- Buscar URL a partir deste site na Vercel

Playground visual: `docs/playground-estados.html`.

## Rodar

```bash
npm install
npx playwright install chromium
npm test
npm run ronda
npm run dev
```

Preview local autorizado (não é produção de cliente):

```bash
npm run ronda -- --base-url http://127.0.0.1:5000 --autorizo-este-ambiente
```

## Isolamento do scanner

- Processo da jornada: Playwright local. Processo do visor: Next.js sem `fetch` de alvo.
- Só GET. Sem `file:`, `gopher:`, credencial na URL.
- Origin = fixture ou localhost/`RONDA_ALLOW_HOST` com `--autorizo-este-ambiente`.
- Teto: 30 páginas, 80 links, 2 redirects, 8s.

## Deploy (sem cobrar)

1. GitHub: este repositório (`main`).
2. Vercel Hobby, framework Next.js, **sem** domínio pago. Preview por PR. Rollback = Promote do deployment anterior.
3. Feature implícita: visor **não** liga varredura remota. Não ligar cobrança nem ads até revisão.

## Preço (hipótese, não oferta)

Custo variável do MVP local: US$ 0 (Playwright OSS). Checkly Starter / Tracefox pago não cabem no teto de R$ 200 juntos. **Hipótese** se um dia houver plano: laudo por ambiente autorizado, sem “consertamos seu site”. Sem WTP medido.

## Lacunas

- Sem demo Awake / preview `fbits.storefront` neste repo (só fixture).
- Sem Figma e sem jornada autenticada.
- Sem adapter Nuvemshop. Chromium ≠ Safari real.
- `npm audit` pode listar vulns de transitivos; não forçamos `--force`.

## Licenças

- Código: MIT. Playwright: Apache-2.0. Fixture fictício, sem dado de cliente.

## Privacidade

`/privacidade`. Não versionar print de loja real.
