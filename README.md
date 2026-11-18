# CheckoutGuard (repo slug `ronda`)

**Monitoramento inteligente de jornada & checkout para e-commerce.** Percorre **Home → Categoria → Produto → Carrinho → Checkout**, audita **institucionais**, **links** same-origin, **console JS first-party** e **erro 500 Scriban camuflado em HTTP 200**, emitindo um laudo auditável com prints `SHA-256`. **Para antes de pagar (`stopped_before_payment: true`).** **Não altera o site (`apply: false`).**

O site publicado é a landing comercial B2B e o **Visor Interativo (`/visor`)**, que lê arquivos `report.json` **100% no navegador** (zero rotas `/api`, zero SSRF). O nome comercial é **CheckoutGuard**; comandos e caminhos internos (`npm run ronda`, `ronda-out/`) mantêm o slug histórico para compatibilidade.

## O que funciona hoje

| Frente | Implementação verificada |
|---|---|
| Fixture Demo QA | `npm run ronda` — sequência determinística de 5 etapas com `fixtureSha256` sobre os 9 arquivos do fixture e `stopped_before_payment: true` |
| Manifesto Autorizado (`StoreTargetManifest`) | `src/lib/store-manifest.ts` — valida `primaryOrigin` HTTPS, subdomínios/CDNs permitidos, autorização explícita e bloqueia domínios de pagamento |
| Proxy Anti-SSRF com DNS/IP Pinning | `src/lib/pinned-proxy.ts` — resolve DNS uma vez, bloqueia IPs privados/loopback/CGNAT/link-local/IMDS/IPv6 mapeado e DNS Rebinding, pinando o IP público validado no socket |
| Adaptadores Safe-Checkout (Wake & Nuvemshop) | Permite vitrine/PDP/carrinho/frete, bloqueia `checkoutComplete`, `/checkout/v3/*` POST, `/checkout/v3/success/`, iframes de cartão e botões de finalizar compra + limpa o carrinho no *teardown* |
| GitHub Actions Agendado (R$ 0) | `docs/ronda-github-action-template.yml` + `docs/store-manifest.example.json` — execução em VM Ubuntu efêmera a cada 30 min com reteste automático em 30s |
| Visor Interativo + Landing B2B | `/` e `/visor` — 2 demos reais em 1 clique sem login (falha Scriban 500 Wake + ronda 5/5 aprovada), upload local até 5 MB, planos transparentes e indexação SEO pública |

## O que o CheckoutGuard nunca faz (por contrato)

- Pedido concluído, preenchimento de cartão, 3DS ou `checkoutComplete`
- Patch em tema (`apply: false`), acesso a Admin ou FTP
- Endpoint público de Playwright / crawl na aplicação web (`src/app/api` permanece vazio e verificado por `isolation.test.ts`)
- Cobrança online dentro da instância Vercel Hobby ([Termos §4](https://vercel.com/legal/terms))

## Comandos principais

```bash
npm install
npx playwright install chromium
npx tsc --noEmit
npm test
npm run sandbox:poc
npm run ronda
npm run build
```

Execução autorizada com manifesto assinado + proxy DNS/IP pinado:

```bash
npx tsx src/cli/run.ts --manifest docs/store-manifest.example.json --base-url https://www.lojaexemplo.com.br
```

Sem `--manifest` válido, `--base-url` permanece recusado por segurança.

## Licenças e Privacidade

- Código: MIT. Playwright: Apache-2.0.
- Política LGPD pública em `/privacidade`. Nunca versionar capturas de lojas de clientes neste repositório.
