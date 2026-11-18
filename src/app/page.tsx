import { Viewer } from "./viewer";

const PILOT_MAILTO_AVULSO =
  "mailto:helisondias07@gmail.com?subject=Piloto%20Ronda%20-%20Laudo%20Pos-Deploy%20(R%24%2097)&body=Ol%C3%A1%2C%20quero%20agendar%20um%20Laudo%20P%C3%B3s-Deploy%20da%20Ronda.%0ALoja%20(HTTPS)%3A%20%0APlataforma%20(Wake%2FNuvemshop%2FShopify%2FVTEX)%3A%20%0ARespons%C3%A1vel%3A%20";
const PILOT_MAILTO_LOJA =
  "mailto:helisondias07@gmail.com?subject=Piloto%20Ronda%20-%20Plano%20Loja%20(R%24%20147%2Fm%C3%AAs)&body=Ol%C3%A1%2C%20quero%20configurar%20o%20Piloto%20Assistido%20do%20Plano%20Loja%20na%20Ronda.%0ALoja%20(HTTPS)%3A%20%0APlataforma%3A%20";
const PILOT_MAILTO_AGENCIA =
  "mailto:helisondias07@gmail.com?subject=Piloto%20Ronda%20-%20Plano%20Ag%C3%AAncia%20(R%24%20397%2Fm%C3%AAs)&body=Ol%C3%A1%2C%20quero%20configurar%20o%20Piloto%20Assistido%20para%20Ag%C3%AAncia%20(at%C3%A9%205%20lojas).%0AAg%C3%AAncia%3A%20%0APlataformas%20da%20carteira%3A%20";

export default function HomePage() {
  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo principal
      </a>

      <header className="capa">
        <div className="capa-inner">
          <div className="topbar">
            <span className="brand-stamp">RONDA · VISTORIA DE JORNADA E-COMMERCE · APPLY: FALSE</span>
            <nav className="topnav" aria-label="Navegação principal">
              <a href="#visor">Demo & Visor (1 clique)</a>
              <a href="#seguranca">Safe-Checkout</a>
              <a href="#planos">Planos B2B</a>
              <a href="/visor">Abrir /visor</a>
              <a href="/privacidade">Privacidade</a>
            </nav>
          </div>

          <h1>Laudo da jornada de compra, com prova. A gente não mexe na loja e para antes de pagar.</h1>
          <p>
            Vistoria técnica automatizada para <strong>Agências de E-commerce e Operações</strong> em{" "}
            <strong>Wake (Fbits SSR), Nuvemshop, Shopify e VTEX</strong>. Percorre{" "}
            <strong>Home → Categoria → Produto → Carrinho → Checkout</strong>, flagra{" "}
            <strong>erro 500 Scriban camuflado em HTTP 200</strong>, erros de console JS e links quebrados — com
            bloqueio rígido de pagamento e limpeza de carrinho ao encerrar.
          </p>

          <div className="hero-actions">
            <a className="cta-link primary" href="#visor">
              Inspecionar laudo real abaixo (sem login)
            </a>
            <a className="cta-link secondary" href="/visor">
              Abrir visor em tela cheia (/visor)
            </a>
            <a className="cta-link secondary" href="#planos">
              Ver planos e piloto assistido
            </a>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="slip" aria-labelledby="dor-b2b">
          <h2 id="dor-b2b">O que o monitor de uptime comum deixa passar depois do deploy</h2>
          <div className="grid-3">
            <div>
              <h3>01 · HTTP 200 com vitrine ou PDP quebrada</h3>
              <p className="muted">
                Na Wake/Fbits SSR, um erro de template Scriban pode devolver <code>HTTP 200</code> com corpo{" "}
                <code>{'{"status_code": 500}'}</code>. Ping tradicional marca &ldquo;online&rdquo; enquanto o
                tráfego pago bate numa página sem botão de compra.
              </p>
            </div>
            <div>
              <h3>02 · Prova documental para agência e lojista</h3>
              <p className="muted">
                Cada vistoria entrega passos numerados (<code>01</code> a <code>05</code>), captura com hash{" "}
                <code>SHA-256</code>, erros de console <em>first-party</em> mascarados e hipótese técnica sem tocar no
                código da loja (<code>apply: false</code>).
              </p>
            </div>
            <div>
              <h3>03 · Zero pedido fantasma no ERP</h3>
              <p className="muted">
                O motor Safe-Checkout testa adição ao carrinho e cotação de frete, para na tela de checkout (
                <code>stopped_before_payment: true</code>), bloqueia gateways/cartão e esvazia o carrinho no{" "}
                <em>teardown</em>.
              </p>
            </div>
          </div>
        </section>

        <div id="visor">
          <Viewer embedded={true} defaultDemo="scriban" />
        </div>

        <section className="slip" id="seguranca" aria-labelledby="titulo-seguranca">
          <h2 id="titulo-seguranca">Arquitetura Safe-Checkout & Cobertura por Plataforma</h2>
          <p className="muted">
            Para testar lojas reais sem gerar pedidos falsos, travar estoque ou expor infraestrutura a SSRF, a Ronda
            exige um manifesto assinado (<code>StoreTargetManifest</code>) e opera com{" "}
            <strong>proxy local de saída com DNS/IP Pinning</strong> + firewall semântico por plataforma.
          </p>

          <div className="table-wrap">
            <table className="laudo-table">
              <thead>
                <tr>
                  <th scope="col">Plataforma</th>
                  <th scope="col">Jornada auditada (Safe)</th>
                  <th scope="col">Bloqueio rígido (Hard Deny + Teardown)</th>
                  <th scope="col">Status do adaptador</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Wake / Fbits SSR</strong>
                  </td>
                  <td>
                    Vitrine, categoria, PDP, GraphQL <code>checkoutCreate</code> / <code>checkoutProductAdd</code> /{" "}
                    <code>shippingQuotes</code>, chegada em <code>/checkout</code> e leitura de erro{" "}
                    <code>500 Scriban</code>.
                  </td>
                  <td>
                    Bloqueia <code>checkoutComplete</code>, <code>checkoutPayment*</code>,{" "}
                    <code>/checkout/confirmation</code>, iframes de cartão e executa <code>checkoutClean</code> ao
                    encerrar.
                  </td>
                  <td>
                    <span className="pill ok">pronto no CLI / CI</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Nuvemshop</strong>
                  </td>
                  <td>
                    Home, PDP, adição via <code>/comprar</code> ou <code>/cart/add</code>, frete e abertura inicial de{" "}
                    <code>/checkout/v3/next/</code>.
                  </td>
                  <td>
                    Bloqueia todo <code>POST</code> em <code>/checkout/v3/*</code>, <code>/checkout/v3/success/</code>,
                    PagoNube/MercadoPago/Appmax e aciona <code>/cart/clear</code> no fim.
                  </td>
                  <td>
                    <span className="pill ok">pronto no CLI / CI</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Shopify</strong>
                  </td>
                  <td>
                    Coleções, PDP, <code>POST /cart/add.js</code> e abertura do resumo inicial{" "}
                    <code>/checkouts/cn/*</code>.
                  </td>
                  <td>
                    Bloqueia <code>SubmitForCompletion</code>, <code>/thank_you</code>, vault{" "}
                    <code>*.shopifycs.com</code> e botões de compra em 1 clique.
                  </td>
                  <td>
                    <span className="pill parar">piloto assistido</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>VTEX (IO / Legacy)</strong>
                  </td>
                  <td>
                    Vitrine, PDP, inserção controlada no <code>orderForm</code> e chegada em{" "}
                    <code>/checkout/#/cart</code>.
                  </td>
                  <td>
                    Bloqueia <code>POST /api/checkout/pub/orders</code>, <code>/api/payments/*</code> e{" "}
                    <code>/checkout/orderPlaced</code>.
                  </td>
                  <td>
                    <span className="pill parar">piloto assistido</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="muted mono" style={{ marginTop: "0.75rem" }}>
            Isolamento verificado: este domínio web não possui rotas /api nem executa navegador no servidor. Rondas
            agendadas rodam em VM efêmera do GitHub Actions (template incluso em docs/ronda-github-action-template.yml)
            com reteste automático em 30s antes de alertar.
          </p>
        </section>

        <section className="slip" id="planos" aria-labelledby="titulo-planos">
          <h2 id="titulo-planos">Planos Transparentes & Piloto Assistido</h2>
          <p className="muted">
            Um único minuto de checkout travado em campanha custa mais que um mês inteiro de vistoria. Comece com um
            laudo pós-deploy avulso ou habilite rondas contínuas na carteira da agência.
          </p>

          <div className="grid-3" style={{ marginTop: "0.9rem" }}>
            <div className="plan-box">
              <div>
                <span className="pill parar">entrega de sprint / pré-campanha</span>
                <h3 style={{ marginTop: "0.55rem" }}>Laudo Pós-Deploy</h3>
                <div className="price-tag">
                  R$ 97 <span className="price-sub">avulso por bateria</span>
                </div>
                <ul className="plain">
                  <li>1 loja autorizada via manifesto assinado</li>
                  <li>Bateria de 3 execuções (desktop + mobile)</li>
                  <li>Jornada até o checkout sem pagar + até 80 links GET</li>
                  <li>Laudo HTML/JSON com prints SHA-256 para anexar ao cliente</li>
                </ul>
              </div>
              <div style={{ marginTop: "0.9rem" }}>
                <a className="cta-link outline" style={{ width: "100%" }} href={PILOT_MAILTO_AVULSO}>
                  Solicitar Laudo Pós-Deploy
                </a>
              </div>
            </div>

            <div className="plan-box">
              <div>
                <span className="pill ok">operação individual</span>
                <h3 style={{ marginTop: "0.55rem" }}>Loja</h3>
                <div className="price-tag">
                  R$ 147 <span className="price-sub">/ mês</span>
                </div>
                <ul className="plain">
                  <li>1 loja autorizada (Wake ou Nuvemshop; Shopify/VTEX sob consulta)</li>
                  <li>Ronda a cada 60 min + gatilho pós-deploy (runner GitHub Actions a R$ 0)</li>
                  <li>Reteste automático em 30s contra falso-positivo</li>
                  <li>Alertas imediatos por E-mail e Slack</li>
                </ul>
              </div>
              <div style={{ marginTop: "0.9rem" }}>
                <a className="cta-link outline" style={{ width: "100%" }} href={PILOT_MAILTO_LOJA}>
                  Agendar Piloto Loja
                </a>
              </div>
            </div>

            <div className="plan-box featured">
              <div>
                <span className="pill ok">recomendado · multi-loja</span>
                <h3 style={{ marginTop: "0.55rem" }}>Agência</h3>
                <div className="price-tag">
                  R$ 397 <span className="price-sub">/ mês · até 5 lojas</span>
                </div>
                <ul className="plain">
                  <li>Até 5 lojas autorizadas (+ R$ 59/mês por loja extra)</li>
                  <li>Rondas a cada 30 min + vistoria pós-deploy com Safe-Checkout</li>
                  <li>
                    Alertas acionáveis no <strong>Slack, ClickUp e WhatsApp</strong>
                  </li>
                  <li>Certificado/laudo técnico exportável por entrega da agência</li>
                </ul>
              </div>
              <div style={{ marginTop: "0.9rem" }}>
                <a className="cta-link" style={{ width: "100%" }} href={PILOT_MAILTO_AGENCIA}>
                  Solicitar Piloto Agência
                </a>
              </div>
            </div>
          </div>

          <p className="muted" style={{ marginTop: "0.95rem", marginBottom: 0 }}>
            <strong>Nota de transparência e hospedagem:</strong> esta página pública opera como vitrine técnica e visor
            local em instância Vercel Hobby (
            <a href="https://vercel.com/legal/terms" rel="noreferrer">
              Termos §4
            </a>{" "}
            — sem checkout online, sem processamento de pagamento neste domínio e sem execução remota de navegador). O
            onboarding de pilotos assistidos ocorre mediante manifesto de autorização da loja, com cobrança ativada
            somente em ambiente comercial dedicado.
          </p>
        </section>
      </main>

      <footer>
        <strong>Ronda</strong> — Laudo da loja, com prova. Este site não altera temas, não acessa Admin e não conclui
        pedidos. · <a href="/visor">Visor Interativo (/visor)</a> · <a href="/privacidade">Privacidade (LGPD)</a> ·{" "}
        <a href="/playground-estados.html">Estados do laudo</a>
      </footer>
    </>
  );
}
