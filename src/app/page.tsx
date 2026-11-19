import { CheckoutButton } from "./components/checkout-button";
import { LaudoPreview } from "./components/laudo-preview";
import { LossCalculator } from "./components/loss-calculator";
import { WhatsappScene } from "./components/whatsapp-scene";
import { PLANS } from "../lib/plans";

const SCAN_LINES = [
  { step: "01 Home", status: "ok", time: "14:32:01", tone: "ok" },
  { step: "02 Produto", status: "HTTP 500 · erro Scriban", time: "há 4 min", tone: "broken" },
  { step: "03 Carrinho", status: "não executado", time: "—", tone: "pending" },
  { step: "04 Pagamento", status: "parado antes de pagar", time: "—", tone: "stopped" },
  { step: "05 Confirmação", status: "não executado", time: "—", tone: "pending" },
] as const;

export default function HomePage() {
  return (
    <div className="cg-world">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo principal
      </a>

      <header className="cg-top">
        <div className="cg-shell cg-top-inner">
          <a className="cg-mark" href="/" aria-label="CheckoutGuard, página inicial">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2 4 5v6c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5l-8-3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <span>CheckoutGuard</span>
          </a>
          <nav className="cg-nav" aria-label="Navegação principal">
            <a href="#prova">Laudo</a>
            <a href="#plano">Planos</a>
            <a href="#versus">Comparativo</a>
            <a href="/visor">Visor técnico</a>
          </nav>
        </div>
      </header>

      <main id="conteudo">
        {/* ---------- instrumento ---------- */}
        <div className="cg-shell">
          <section className="cg-hero" aria-labelledby="cg-hero-title">
            <div>
              <p className="cg-meta">SEX · 14:32 · PRODUÇÃO</p>
              <h1 id="cg-hero-title">Seu checkout quebrou às 14h32.</h1>
              <p className="cg-deck">
                O ping continuou verde e o anúncio continuou cobrando cliques. Você só foi saber às 19h,
                quando o dia de vendas não bateu.
              </p>
              <p className="cg-lede">
                O CheckoutGuard percorre a loja como um cliente — Home, produto, carrinho, pagamento —, lê o
                que a página realmente entrega e avisa no WhatsApp em 30 segundos. Sem completar a compra,
                sem mexer no site.
              </p>
              <div className="cg-actions">
                <a className="cg-cta" href="#plano">
                  Começar com uma auditoria — R$ 97
                </a>
                <a className="cg-cta-quiet" href="#prova">
                  Ver a prova primeiro
                </a>
              </div>
              <p className="cg-plats">
                Wake · Nuvemshop · Shopify · VTEX — a jornada vai até a tela de pagamento e para.
              </p>
            </div>

            <aside className="cg-scan" aria-label="Painel de varredura da última execução: Home aprovada, Produto com HTTP 500 há 4 minutos, Carrinho e Confirmação não executados, Pagamento parado antes de pagar.">
              <div className="cg-scan-head">
                <span>varredura · loja-exemplo.com.br</span>
                <span>30 s</span>
              </div>
              <ol>
                {SCAN_LINES.map((line) => (
                  <li key={line.step} className={`is-${line.tone}`}>
                    <span className="cg-step">{line.step}</span>
                    <span className="cg-status">{line.status}</span>
                    <span className="cg-time">{line.time}</span>
                  </li>
                ))}
              </ol>
              <span className="cg-scanline" aria-hidden="true" />
            </aside>
          </section>
        </div>

        {/* ---------- o erro invisível ---------- */}
        <section className="cg-section cg-section-dark" aria-labelledby="cg-erro-title">
          <div className="cg-shell">
            <p className="cg-kicker">diagnóstico</p>
            <h2 className="cg-h2" id="cg-erro-title">
              O defeito que o seu monitor chama de “tudo bem”
            </h2>
            <div className="cg-erro-grid">
              <div>
                <p className="cg-erro-label">o que o monitor de uptime enxerga</p>
                <p className="cg-erro-200">HTTP 200</p>
                <p className="cg-erro-cap">servidor respondeu. Nada de alarme.</p>
              </div>
              <div>
                <p className="cg-erro-label">o que a página entrega ao cliente</p>
                <p className="cg-erro-500">{`{"status_code": 500}`}</p>
                <p className="cg-erro-cap">
                  erro de template escondido no corpo de uma resposta “saudável”. Sem preço, sem botão,
                  venda perdida.
                </p>
              </div>
            </div>
            <p className="cg-erro-note">
              Padrão real da Wake/Fbits SSR, capturado em laudo: a ronda decodifica o corpo da resposta,
              não só o status.
            </p>
          </div>
        </section>

        {/* ---------- o aviso ---------- */}
        <section className="cg-section" aria-labelledby="cg-cena-title">
          <div className="cg-shell">
            <p className="cg-kicker">telemetria</p>
            <h2 className="cg-h2" id="cg-cena-title">O aviso chega antes do prejuízo</h2>
            <WhatsappScene />
          </div>
        </section>

        {/* ---------- faixa de cálculo ---------- */}
        <section className="cg-section cg-section-dark" aria-labelledby="cg-contas-title">
          <div className="cg-shell">
            <p className="cg-kicker">estimativa</p>
            <h2 className="cg-h2" id="cg-contas-title">Faça as contas do seu tráfego</h2>
            <LossCalculator />
          </div>
        </section>

        {/* ---------- laudo em papel ---------- */}
        <section className="cg-section" id="prova" aria-labelledby="cg-prova-title">
          <div className="cg-shell">
            <div className="cg-prova">
              <div className="cg-prova-copy">
                <p className="cg-kicker">laudo</p>
                <h2 className="cg-h2" id="cg-prova-title">A prova, não a promessa</h2>
                <p>
                  Cada ronda vira um laudo: etapas numeradas, o erro capturado com as próprias palavras do
                  servidor, prints com hash SHA-256 e o compromisso no papel — parado antes de pagar,
                  carrinho limpo, nenhum pedido criado.
                </p>
                <p>
                  Abra o laudo real agora, sem cadastro e sem login, no{" "}
                  <a href="/visor">visor técnico</a> — o mesmo documento que a sua agência recebe.
                </p>
              </div>
              <LaudoPreview />
            </div>
          </div>
        </section>

        {/* ---------- comparativo honesto ---------- */}
        <section className="cg-section cg-section-dark" id="versus" aria-labelledby="cg-versus-title">
          <div className="cg-shell cg-versus">
            <p className="cg-kicker">comparativo</p>
            <h2 className="cg-h2" id="cg-versus-title">Por que não usar só Checkly, BugBug ou Noibu?</h2>
            <p>
              São ferramentas boas — em outro serviço. O <strong>Checkly</strong> e o <strong>BugBug</strong>{" "}
              testam o fluxo que você mesmo escrever e mantiver, por loja, cobrando em dólar. O{" "}
              <strong>Noibu</strong> assiste às sessões reais depois que o cliente já bateu no defeito; ele
              não percorre a loja nem cota frete por CEP.
            </p>
            <p>
              Nenhum deles decodifica fora da caixa o erro 500 escondido no HTTP 200 da Wake, avisa em
              português no WhatsApp da loja e trava o pagamento — por R$ 97 a auditoria, sem cartão de
              crédito para começar.
            </p>
          </div>
        </section>

        {/* ---------- planos como contrato ---------- */}
        <section className="cg-section" id="plano" aria-labelledby="cg-plans-title">
          <div className="cg-shell">
            <p className="cg-kicker">contrato</p>
            <h2 className="cg-h2" id="cg-plans-title">Três maneiras de contratar</h2>
            <div className="cg-plans-grid">
              {PLANS.map((plan) => (
                <article key={plan.id} className={`cg-plan ${plan.featured ? "is-featured" : ""}`}>
                  <p className="cg-plan-tag">{plan.featured ? "mais escolhido" : plan.id}</p>
                  <h3 className="cg-plan-name">{plan.name}</h3>
                  <p className="cg-plan-price">
                    R$ {plan.price}
                    <span className="cg-plan-period">{plan.period}</span>
                  </p>
                  <ul className="cg-plan-list">
                    {plan.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <div className="cg-plan-cta">
                    <CheckoutButton
                      planId={plan.id}
                      fallbackHref={plan.href}
                      label={plan.cta}
                      variant={plan.featured ? "primary" : "quiet"}
                    />
                  </div>
                </article>
              ))}
            </div>
            <p className="cg-plans-note">
              Pagamento por Stripe Checkout hospedado: o cartão nunca passa pelo nosso servidor. Enquanto as
              chaves de produção não estão ativas, o botão abre uma simulação honesta do fluxo — o e-mail
              continua valendo para contratar com acompanhamento. Onboarding mediante manifesto de
              autorização da loja para as rondas.
            </p>
          </div>
        </section>

        {/* ---------- fechamento ---------- */}
        <section className="cg-close">
          <div className="cg-shell">
            <h2>Daqui a trinta dias, qual versão da sua loja você prefere lembrar?</h2>
            <p>
              A que ficou quebrada das 14h32 às 19h — ou a que recebeu o aviso às 14h32:30 e voltou a vender
              no mesmo intervalo da campanha.
            </p>
            <div className="cg-actions">
              <a className="cg-cta" href="#plano">
                Contratar a partir de R$ 97
              </a>
              <a className="cg-cta-quiet" href="/visor">
                Ver o laudo técnico
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="cg-foot">
        <div className="cg-shell">
          <p>
            <strong>CheckoutGuard</strong> — instrumento de medição de receita. Não alteramos temas, não
            acessamos Admin, não preenchemos cartão e não concluímos pedidos.
          </p>
          <p>
            <a href="/visor">Visor técnico</a> · <a href="/privacidade">Privacidade (LGPD)</a> · Wake ·
            Nuvemshop · Shopify · VTEX
          </p>
        </div>
      </footer>
    </div>
  );
}
