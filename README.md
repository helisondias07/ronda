# Ronda

Percorre **home → categoria → produto → carrinho → checkout** e emite um laudo com print por etapa. **Para antes de pagar.** **Não altera a loja.**

O site publicado só **mostra** um `report.json`. A jornada em si roda no seu computador.

## O que funciona de verdade

| Função | Como |
|---|---|
| Fixture Demo QA | `npm run ronda` — 5 etapas, `stopped_before_payment` |
| Laudo | `ronda-out/report.json` + `report.html` + PNG |
| 500 Scriban | JSON `status_code: 500` conta como falha, mesmo com HTTP 200 |
| Sugestão | Hipótese no laudo com `apply: false` |
| Visor | Cole o JSON na home; exemplo é o fixture, rotulado |

## O que não faz (de propósito)

- Pedido, cartão, 3DS, `checkoutComplete`
- Patch em `Pages/` / `Components/`, Admin Wake, FTP
- Loja de cliente em produção
- SaaS com OpenCode Go / chave GLM pessoal
- Fingir execução ao vivo neste site

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

## Deploy (sem cobrar)

1. GitHub: este repositório.
2. Vercel Hobby: Import, framework Next.js, **sem** domínio pago. Preview por PR. Rollback = deployment anterior.

Não ligue cobrança nem ads até revisão. O visor **não** recebe URL de loja para testar.

## Preço (hipótese, não oferta)

Custo variável do MVP local: US$ 0 (Playwright OSS). Checkly Starter / Tracefox pago / Especialista Profissional não cabem no teto de R$ 200 juntos. **Hipótese** se um dia houver plano: laudo por loja, sem “consertamos sua vitrine”. Sem WTP medido.

## Licenças

- Código deste repo: MIT.
- Playwright: Apache-2.0.
- Fixture: loja fictícia, sem dado de cliente.

## Privacidade

`/privacidade`. Não versionar print de loja real.
