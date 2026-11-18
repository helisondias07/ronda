import { FlowSimulation } from "./components/flow-simulation";
import { LossCalculator } from "./components/loss-calculator";

const PILOT_MAILTO_AVULSO =
  "mailto:helisondias07@gmail.com?subject=CheckoutGuard%20-%20Auditoria%20Express%20(R%24%2097)&body=Ol%C3%A1%2C%20quero%20agendar%20uma%20Auditoria%20Express%20do%20CheckoutGuard.%0ALoja%20(HTTPS)%3A%20%0APlataforma%20(Wake%2FNuvemshop%2FShopify%2FVTEX)%3A%20%0ARespons%C3%A1vel%3A%20";
const PILOT_MAILTO_LOJA =
  "mailto:helisondias07@gmail.com?subject=CheckoutGuard%20-%20Plano%20Loja%20(R%24%20147%2Fm%C3%AAs)&body=Ol%C3%A1%2C%20quero%20configurar%20o%20Piloto%20Assistido%20do%20Plano%20Loja%20no%20CheckoutGuard.%0ALoja%20(HTTPS)%3A%20%0APlataforma%3A%20";
const PILOT_MAILTO_AGENCIA =
  "mailto:helisondias07@gmail.com?subject=CheckoutGuard%20-%20Plano%20Ag%C3%AAncia%20(R%24%20397%2Fm%C3%AAs)&body=Ol%C3%A1%2C%20quero%20configurar%20o%20Piloto%20Assistido%20para%20Ag%C3%AAncia%20(at%C3%A9%205%20lojas)%20no%20CheckoutGuard.%0AAg%C3%AAncia%3A%20%0APlataformas%20da%20carteira%3A%20";

export default function HomePage() {
  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo principal
      </a>

      <header className="cg-hero">
        <div className="cg-wrap">
          <div className="cg-topbar">
            <span className="cg-brand" aria-label="CheckoutGuard">
              <svg className="cg-brand-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 2 4 5v6c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5l-8-3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="m8.5 11.8 2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="cg-brand-name">CheckoutGuard</span>
            </span>
            <nav className="cg-topnav" aria-label="Navegação principal">
              <a href="#calculadora">Prejuízo evitado</a>
              <a href="#comparativo">Comparativo honesto</a>
              <a href="#seguranca">Safe-Checkout</a>
              <a href="#planos">Planos</a>
              <a href="/visor">Abrir /visor</a>
              <a href="/privacidade">Privacidade</a>
            </nav>
          </div>

          <div className="cg-hero-grid">
            <div className="cg-hero-copy">
              <p className="cg-eyebrow">Monitoramento inteligente de jornada &amp; checkout para e-commerce</p>
              <h1>
                Você paga caro por tráfego no Meta Ads. Descubra em 30s se o seu checkout está quebrando —{" "}
                <span className="cg-accent">antes de perder vendas</span>.
              </h1>
              <p className="cg-hero-sub">
                O <strong>CheckoutGuard</strong> percorre <strong>Home → Produto → Frete CEP → Checkout</strong> como
                um cliente real em <strong>Wake (Fbits SSR), Nuvemshop, Shopify e VTEX</strong>, flagra o erro 500
                Scriban camuflado em HTTP 200 que o ping de uptime não enxerga, avisa no WhatsApp em ~30s e{" "}
                <strong>para antes de pagar</strong> — zero pedidos fantasmos no seu ERP.
              </p>
              <div className="cg-hero-actions">
                <a className="cg-btn primary" href="#calculadora">
                  Calcular meu prejuízo evitado
                </a>
                <a className="cg-btn ghost" href="/visor">
                  Ver a prova real (visor, sem login)
                </a>
              </div>
              <ul className="cg-hero-proof" aria-label="Garantias do motor">
                <li>✓ erro 500 Scriban em HTTP 200 detectado</li>
                <li>✓ alerta em ~30s no WhatsApp da loja</li>
                <li>✓ 0 pedidos criados · carrinho limpo no fim</li>
              </ul>
            </div>
            <FlowSimulation />
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="cg-section is-mist" id="calculadora" aria-labelledby="titulo-calculadora">
          <div className="cg-wrap">
            <h2 id="titulo-calculadora">Quanto custa 2 horas de botão “Comprar” quebrado?</h2>
            <p className="cg-lead">
              Loja monitorada avisa a equipe em ~30s. Loja sem monitor descobre no fim do dia — pelo número de vendas
              que não aconteceu. Arraste o slider e veja o tamanho do rombo.
            </p>
            <LossCalculator />
          </div>
        </section>

        <section className="cg-section" id="comparativo" aria-labelledby="titulo-comparativo">
          <div className="cg-wrap">
            <h2 id="titulo-comparativo">Comparativo honesto: Checkly, BugBug e Noibu</h2>
            <p className="cg-lead">
              São ferramentas excelentes — para DevOps, testes manuais e replay de sessão. O caso abaixo é outro:
              jornada de compra em plataformas brasileiras, com trava de não-pagamento e preço local.
            </p>
            <div className="cg-table-wrap">
              <table className="cg-table">
                <thead>
                  <tr>
                    <th scope="col">Critério</th>
                    <th scope="col">CheckoutGuard</th>
                    <th scope="col">Checkly</th>
                    <th scope="col">BugBug</th>
                    <th scope="col">Noibu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Enxerga erro 500 Scriban (Wake/Fbits) escondido em HTTP 200 <em>sem escrever asserts</em>
                    </td>
                    <td className="is-ok">✓ decodificador dedicado</td>
                    <td>— exige script e assert por rota</td>
                    <td>— exige configuração manual</td>
                    <td>— foco em erro JS de sessão real</td>
                  </tr>
                  <tr>
                    <td>Jornada real com frete/CEP brasileiro (Wake, Nuvemshop)</td>
                    <td className="is-ok">✓ pronta para as plataformas</td>
                    <td>— genérica, você mantém o script</td>
                    <td>— você grava o fluxo por loja</td>
                    <td>— não executa jornadas</td>
                  </tr>
                  <tr>
                    <td>
                      Trava que impede pedido fantasma no ERP (<code>stopped_before_payment: true</code>)
                    </td>
                    <td className="is-ok">✓ nativa, bloqueio rígido</td>
                    <td>— depende do que você programar</td>
                    <td>— depende do que você gravar</td>
                    <td>— não executa compras</td>
                  </tr>
                  <tr>
                    <td>Alerta em português no WhatsApp da loja</td>
                    <td className="is-ok">✓ ~30s com reteste anti-falso-positivo</td>
                    <td>— Slack / e-mail / PagerDuty</td>
                    <td>— e-mail</td>
                    <td>— e-mail / Slack, em inglês</td>
                  </tr>
                  <tr>
                    <td>Preço para PME brasileira</td>
                    <td className="is-ok">✓ em BRL, a partir de R$ 97</td>
                    <td>— cobrança em USD</td>
                    <td>— cobrança em USD</td>
                    <td>— enterprise, USD</td>
                  </tr>
                  <tr>
                    <td>Rondas agendadas a custo zero (GitHub Actions)</td>
                    <td className="is-ok">✓ template pronto incluso</td>
                    <td className="is-ok">✓</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="cg-note">
              Leitura honesta: com Checkly ou BugBug uma agência <em>consegue</em> cobrir parte disso — escrevendo e
              mantendo scripts por loja, em dólar. O Noibu é imbatível em replay de sessão do tráfego real. O que
              nenhum deles faz fora da caixa é decodificar o corpo Scriban da Wake dentro de um HTTP 200, rodar frete
              por CEP brasileiro e travar o pagamento — em português e em real.
            </p>
          </div>
        </section>

        <section className="cg-section is-mist" id="seguranca" aria-labelledby="titulo-seguranca">
          <div className="cg-wrap">
            <h2 id="titulo-seguranca">Como testamos a sua loja sem gerar pedido falso</h2>
            <p className="cg-lead">
              O motor Safe-Checkout exige um manifesto assinado pela loja (<code>StoreTargetManifest</code>), sai por{" "}
              <strong>proxy com DNS/IP Pinning</strong> anti-SSRF e mantém um firewall semântico por plataforma —
              permitindo vitrine, produto, carrinho e frete, bloqueando de forma rígida qualquer finalização.
            </p>
            <div className="cg-table-wrap">
              <table className="cg-table">
                <thead>
                  <tr>
                    <th scope="col">Plataforma</th>
                    <th scope="col">Jornada auditada (safe)</th>
                    <th scope="col">Bloqueio rígido + teardown</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Wake / Fbits SSR</strong>
                    </td>
                    <td>Vitrine, categoria, PDP, GraphQL de carrinho/frete e leitura do erro Scriban 500.</td>
                    <td>
                      Bloqueia <code>checkoutComplete</code>, rotas de confirmação e iframes de cartão; limpa o
                      carrinho ao encerrar.
                    </td>
                    <td className="is-ok">✓ pronto no CLI / CI</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Nuvemshop</strong>
                    </td>
                    <td>Home, PDP, adição ao carrinho, frete/CEP e abertura inicial do checkout.</td>
                    <td>
                      Bloqueia todo POST em <code>/checkout/v3/*</code>, gateways (PagoNube, MercadoPago, Appmax) e
                      esvazia o carrinho no fim.
                    </td>
                    <td className="is-ok">✓ pronto no CLI / CI</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Shopify</strong>
                    </td>
                    <td>Coleções, PDP, <code>/cart/add.js</code> e resumo inicial do checkout.</td>
                    <td>Bloqueia <code>SubmitForCompletion</code>, vault <code>*.shopifycs.com</code> e thank-you.</td>
                    <td>piloto assistido</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>VTEX (IO / Legacy)</strong>
                    </td>
                    <td>Vitrine, PDP, <code>orderForm</code> e chegada ao carrinho.</td>
                    <td>Bloqueia <code>/api/checkout/pub/orders</code>, pagamentos e <code>orderPlaced</code>.</td>
                    <td>piloto assistido</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="cg-bullets">
              <li>
                <strong>Isolamento verificado:</strong> este site não tem rotas <code>/api</code> nem navegador no
                servidor — rondas reais rodam em VM efêmera do GitHub Actions (template em{" "}
                <code>docs/ronda-github-action-template.yml</code>) com reteste em 30s antes de alertar.
              </li>
              <li>
                <strong>Prova em 1 clique:</strong> abra o <a href="/visor">visor interativo</a> e veja o laudo real
                com prints, hash SHA-256 e a falha Scriban evidenciada — sem login, sem cadastro.
              </li>
              <li>
                <strong>Nunca, por contrato:</strong> não mexemos no seu tema (<code>apply: false</code>), não
                acessamos Admin, não preenchemos cartão e não concluímos pedidos.
              </li>
            </ul>
          </div>
        </section>

        <section className="cg-section" id="planos" aria-labelledby="titulo-planos">
          <div className="cg-wrap">
            <h2 id="titulo-planos">Planos comerciais claros</h2>
            <p className="cg-lead">
              Um minuto de checkout travado em campanha custa mais que um mês inteiro de monitoramento. Comece com
              uma auditoria avulsa ou habilite rondas contínuas.
            </p>
            <div className="cg-plans">
              <div className="cg-plan">
                <span className="cg-plan-tag">entrega de sprint / pré-campanha</span>
                <h3>Auditoria Express</h3>
                <p className="cg-price">
                  R$ 97 <span>avulso por bateria</span>
                </p>
                <ul>
                  <li>1 loja autorizada via manifesto assinado</li>
                  <li>Bateria de 3 execuções (desktop + mobile)</li>
                  <li>Jornada até o checkout sem pagar + até 80 links GET</li>
                  <li>Laudo HTML/JSON com prints SHA-256 para anexar ao cliente</li>
                </ul>
                <a className="cg-btn outline" href={PILOT_MAILTO_AVULSO}>
                  Solicitar Auditoria Express
                </a>
              </div>

              <div className="cg-plan">
                <span className="cg-plan-tag">operação individual</span>
                <h3>Plano Loja</h3>
                <p className="cg-price">
                  R$ 147 <span>/ mês</span>
                </p>
                <ul>
                  <li>1 loja autorizada (Wake ou Nuvemshop; Shopify/VTEX sob consulta)</li>
                  <li>ronda a cada 60 min + gatilho pós-deploy (runner GitHub Actions a R$ 0)</li>
                  <li>Reteste automático em 30s contra falso-positivo</li>
                  <li>Alertas imediatos por E-mail e Slack</li>
                </ul>
                <a className="cg-btn outline" href={PILOT_MAILTO_LOJA}>
                  Agendar Piloto Loja
                </a>
              </div>

              <div className="cg-plan is-featured">
                <span className="cg-plan-tag is-signal">recomendado · multi-loja</span>
                <h3>Agência</h3>
                <p className="cg-price">
                  R$ 397 <span>/ mês · até 5 lojas</span>
                </p>
                <ul>
                  <li>Até 5 lojas autorizadas (+ R$ 59/mês por loja extra)</li>
                  <li>Rondas a cada 30 min + vistoria pós-deploy com Safe-Checkout</li>
                  <li>Alertas acionáveis no Slack, ClickUp e WhatsApp</li>
                  <li>Laudo técnico exportável por entrega da agência</li>
                </ul>
                <a className="cg-btn primary" href={PILOT_MAILTO_AGENCIA}>
                  Solicitar Piloto Agência
                </a>
              </div>
            </div>

            <p className="cg-note">
              <strong>Transparência e hospedagem:</strong> esta página opera como vitrine técnica em instância
              Vercel Hobby (<a href="https://vercel.com/legal/terms" rel="noreferrer">Termos §4</a>) — sem checkout
              online, sem processamento de pagamento neste domínio e sem execução remota de navegador. O onboarding de
              pilotos assistidos ocorre mediante manifesto de autorização da loja, com cobrança ativada somente em
              ambiente comercial dedicado.
            </p>
          </div>
        </section>
      </main>

      <footer className="cg-footer">
        <div className="cg-wrap">
          <p className="cg-footer-brand">
            <strong>CheckoutGuard</strong> — Monitoramento inteligente de jornada &amp; checkout. A gente não mexe no
            seu site e para antes de pagar.
          </p>
          <p className="cg-footer-links">
            <a href="/visor">Visor interativo (sem login)</a> · <a href="/privacidade">Privacidade (LGPD)</a> ·{" "}
            <a href="#planos">Planos</a> · <a href="#comparativo">Comparativo</a>
          </p>
          <p className="cg-footer-note">
            Wake (Fbits SSR) · Nuvemshop · Shopify · VTEX — erro Scriban em HTTP 200, console JS first-party e links
            quebrados, com laudo auditável e zero pedido fantasma.
          </p>
        </div>
      </footer>
    </>
  );
}
