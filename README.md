# Ronda

Percorre **home → categoria → produto → carrinho → checkout**, olha **institucionais** e **links** same-origin, e emite um laudo. **Para antes de pagar.** **Não altera o site.** **Não garante que detecta tudo.**

O site publicado só **mostra** um `report.json`. Ele **não busca URL** (isolamento contra SSRF). A ronda roda no seu computador.

## O que funciona de verdade

| Função | Como |
|---|---|
| Fixture Demo QA | `npm run ronda` — jornada builtin (5 etapas) ou `--journey fixture/journey.json`; `stopped_before_payment`, print+sha256, h1/título |
| PNG de referência | `--ref-png` + `--ref-step` + `--viewport 1280x720` no PC; diff em `ronda-out/report.html` (`<img src="diff-….png">`). O visor Hobby **não** lê disco. **Não é Figma.** |
| Institucionais | allowlist `sobre.html`, `politica.html` |
| Links / botões com href | GET same-origin, teto 80, timeout 8s; mailto/externo/script ignorados |
| Console | só `pageerror` / `console.error` first-party |
| 500 Scriban | JSON `status_code: 500` = falha, mesmo com HTTP 200 |
| Checagem HTML básica | Título, h1, `alt` de imagem e rótulo de controle; heurística parcial, não auditoria WCAG |
| SSRF | bloqueia IP privado, metadata, credencial na URL, redirect para 10.x |
| Sugestão | hipótese no laudo com `apply: false` |
| Visor | cola JSON; exemplo é o fixture, rotulado |

## O que não faz (de propósito)

- Pedido, cartão, 3DS, `checkoutComplete`, PATCH/POST destrutivo
- Patch em tema, Admin, FTP, preço/estoque/frete
- Loja de cliente em produção
- Endpoint público de Playwright / crawl (o visor Hobby **não** tem `/api`)
- **Figma:** sem token/spec não comparamos; não desenhamos diff falso (use `visual-review` no Oasis)
- **Login:** sem conta no Vault não autenticamos; não criamos cadastro
- SaaS com OpenCode Go / chave GLM pessoal
- Buscar URL a partir deste site na Vercel

Playground visual: `/playground-estados.html` no site publicado (cópia em `public/`; fonte em `docs/`).

Evolução (não implementada): `docs/plano-evolucao-qa.md` — Figma via `visual-review`, isolamento CLI×visor, acesso só com autorização. Sem loja de cliente neste Hobby.

## Rodar

```bash
npm install
npx playwright install chromium
npm test
npm run ronda
npm run ronda -- --journey fixture/journey.json
npm run dev
```

Preview local autorizado (não é produção de cliente):

```bash
npm run ronda -- --base-url http://127.0.0.1:5000 --autorizo-este-ambiente
npm run ronda -- --viewport 1280x720 --ref-png caminho/home.png --ref-step home
```

O visor Hobby **não** recebe o PNG. Diff fica em `ronda-out/diff-*.png`.

## Isolamento do scanner

- Processo da jornada: Playwright local. Processo do visor: Next.js sem `fetch` de alvo.
- Só GET. Sem `file:`, `gopher:`, credencial na URL.
- Origin = fixture ou localhost/`RONDA_ALLOW_HOST` com `--autorizo-este-ambiente`.
- Teto: 30 páginas, 80 links, 2 redirects, 8s.

## Deploy (sem cobrar)

1. GitHub: este repositório (`main`).
2. Vercel Hobby, framework Next.js, **sem** domínio pago. Preview por PR. Rollback = Promote do deployment anterior.
3. Feature implícita: visor **não** liga varredura remota.
4. Hobby = **pessoal ou não comercial** ([Termos §4](https://vercel.com/legal/terms), 14/11/2026). **Não cobrar** neste deploy. Migração para Pro **só** se houver pagamento — **não contratar agora**.

Não ligar cobrança nem ads até revisão.

## Preço (hipótese, não oferta)

Custo variável do MVP local: US$ 0 (Playwright OSS). Checkly Starter / Tracefox pago não cabem no teto de R$ 200 juntos. **Hipótese a testar** (não oferta): avulso R$ 99 pelo relatório **sem** patch; ads R$ 0 até 2 pagamentos. Marca/domínio não conferidos. Sem WTP medido.

## Lacunas

- Sem demo Awake / preview `fbits.storefront` neste repo (só fixture).
- Sem Figma e sem jornada autenticada.
- Checagem de acessibilidade limitada ao HTML capturado; não valida WCAG, teclado ou leitor de tela.
- Sem adapter Nuvemshop. Chromium ≠ Safari real.
- `npm audit` pode listar vulns de transitivos; não forçamos `--force`.

## Licenças

- Código: MIT. Playwright: Apache-2.0. Fixture fictício, sem dado de cliente.

## Privacidade

`/privacidade`. Não versionar print de loja real.
