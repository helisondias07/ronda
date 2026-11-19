import { LaudoPreview } from "./components/laudo-preview";
import { LossCalculator } from "./components/loss-calculator";
import { WhatsappScene } from "./components/whatsapp-scene";
import { CheckoutButton } from "./components/checkout-button";
import { PLANS } from "../lib/plans";

export default function HomePage() {
  return (
    <>
      <a className="skip" href="#conteudo">
        Ir para o conteúdo principal
      </a>

      <header className="cg-top">
        <a className="cg-mark" href="/" aria-label="CheckoutGuard, página inicial">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 2 4 5v6c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5l-8-3Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span>CheckoutGuard</span>
        </a>
        <nav className="cg-links" aria-label="Navegação principal">
          <a href="#plano">Planos</a>
          <a href="#prova">A prova</a>
          <a href="/visor">Visor técnico</a>
        </nav>
      </header>

      <main id="conteudo">
        {/* ---------- hero: a frase de 3 segundos ---------- */}
        <section className="cg-hero">
          <h1>Seu checkout quebrou às 14h32.</h1>
          <p className="cg-hero-deck">
            O ping continuou verde, o anúncio continuou cobrando cliques — você só foi saber às 19h, quando
            o dia de vendas não bateu.
          </p>
          <p className="cg-hero-one">
            O CheckoutGuard percorre a sua loja como um cliente — Home, produto, frete por CEP, checkout —,
            lê o que a página realmente entrega e avisa no seu WhatsApp em 30 segundos. Sem completar a
            compra, sem mexer no site.
          </p>
          <div className="cg-hero-cta">
            <a className="cg-cta" href="#plano">
              Começar com uma auditoria — R$ 97
            </a>
            <a className="cg-cta-quiet" href="#prova">
              Ver a prova primeiro
            </a>
          </div>
          <p className="cg-hero-plats">
            Wake · Nuvemshop · Shopify · VTEX — a jornada vai até a tela de pagamento e para.
          </p>
        </section>

        {/* ---------- o erro invisível ---------- */}
        <section className="cg-erro" aria-labelledby="cg-erro-title">
          <h2 id="cg-erro-title">O defeito que o seu monitor chama de “tudo bem”</h2>
          <div className="cg-erro-split">
            <div className="cg-erro-side">
              <p className="cg-erro-figure is-ok">HTTP 200</p>
              <p className="cg-erro-cap">o que o monitor de uptime enxerga</p>
            </div>
            <div className="cg-erro-side">
              <p className="cg-erro-figure is-bad">
                <code>{`{"status_code": 500}`}</code>
              </p>
              <p className="cg-erro-cap">
                o que a página entrega ao cliente: um erro de template escondido no corpo de uma resposta
                “saudável”. Sem preço, sem botão, venda perdida.
              </p>
            </div>
          </div>
          <p className="cg-erro-note">
            Padrão real da Wake/Fbits SSR, capturado em laudo: a ronda decodifica o corpo da resposta, não
            só o status.
          </p>
        </section>

        {/* ---------- a cena do aviso ---------- */}
        <section className="cg-cena" aria-labelledby="cg-cena-title">
          <h2 id="cg-cena-title">O aviso chega antes do prejuízo</h2>
          <WhatsappScene />
        </section>

        {/* ---------- calculadora ---------- */}
        <section className="cg-contas" aria-labelledby="cg-contas-title">
          <h2 id="cg-contas-title">Faça as contas do seu tráfego</h2>
          <LossCalculator />
        </section>

        {/* ---------- a prova ---------- */}
        <section className="cg-prova" id="prova" aria-labelledby="cg-prova-title">
          <div className="cg-prova-copy">
            <h2 id="cg-prova-title">A prova, não a promessa</h2>
            <p>
              Cada ronda vira um laudo: etapas numeradas, o erro capturado com as próprias palavras do
              servidor, prints com hash SHA-256 e o compromisso no papel — parado antes de pagar, carrinho
              limpo, nenhum pedido criado.
            </p>
            <p className="cg-prova-hint">
              Abra o laudo real agora, sem cadastro e sem login, no{" "}
              <a href="/visor">visor técnico</a> — o mesmo documento que a sua agência recebe.
            </p>
          </div>
          <LaudoPreview />
        </section>

        {/* ---------- comparativo honesto, fora do caminho de venda ---------- */}
        <section className="cg-versus" aria-labelledby="cg-versus-title">
          <h2 id="cg-versus-title">Por que não usar só Checkly, BugBug ou Noibu?</h2>
          <p>
            São ferramentas boas — em outro serviço. O <strong>Checkly</strong> e o <strong>BugBug</strong>{" "}
            testam o fluxo que você mesmo escrever e mantiver, por loja, cobrando em dólar. O{" "}
            <strong>Noibu</strong> assiste às sessões reais depois que o cliente já bateu no defeito; ele
            não percorre a loja nem cota frete por CEP.
          </p>
          <p>
            Nenhum deles decodifica fora da caixa o erro 500 escondido no HTTP 200 da Wake, avisa em
            português no WhatsApp da loja e trava o pagamento — por R$ 97 a auditoria, sem cartão de crédito
            para começar.
          </p>
        </section>

        {/* ---------- planos ---------- */}
        <section className="cg-plans" id="plano" aria-labelledby="cg-plans-title">
          <h2 id="cg-plans-title">Três maneiras de contratar</h2>
          {PLANS.map((plan) => (
            <article key={plan.id} className={`cg-plan-row ${plan.featured ? "is-featured" : ""}`}>
              <div className="cg-plan-id">
                <h3>{plan.name}</h3>
                <p className="cg-plan-tagline">{plan.tagline}</p>
              </div>
              <p className="cg-plan-price">
                <span className="cg-plan-currency">R$</span>
                {plan.price}
                <span className="cg-plan-period"> {plan.period}</span>
              </p>
              <ul className="cg-plan-list">
                {plan.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <CheckoutButton
                planId={plan.id}
                fallbackHref={plan.href}
                label={plan.cta}
                variant={plan.featured ? "primary" : "quiet"}
              />
            </article>
          ))}
          <p className="cg-plans-note">
            Pagamento por Stripe Checkout hospedado: o cartão nunca passa pelo nosso servidor. Enquanto as
            chaves de produção não estão ativas, o botão abre uma simulação honesta do fluxo — o e-mail
            continua valendo para contratar com acompanhamento. Onboarding mediante manifesto de
            autorização da loja para as rondas.
          </p>
        </section>

        {/* ---------- fechamento ---------- */}
        <section className="cg-close">
          <h2>Daqui a trinta dias, qual versão da sua loja você prefere lembrar?</h2>
          <p>
            A que ficou quebrada das 14h32 às 19h — ou a que recebeu o aviso às 14h32:30 e voltou a vender
            no mesmo intervalo da campanha.
          </p>
          <div className="cg-hero-cta">
            <a className="cg-cta" href="#plano">
              Contratar a partir de R$ 97
            </a>
            <a className="cg-cta-quiet" href="/visor">
              Ver o laudo técnico
            </a>
          </div>
        </section>
      </main>

      <footer className="cg-foot">
        <p>
          <strong>CheckoutGuard</strong> — leito de prova para o seu checkout. Não alteramos temas, não
          acessamos Admin, não preenchemos cartão e não concluímos pedidos.
        </p>
        <p className="cg-foot-links">
          <a href="/visor">Visor técnico</a> · <a href="/privacidade">Privacidade (LGPD)</a> · Wake ·
          Nuvemshop · Shopify · VTEX
        </p>
      </footer>
    </>
  );
}
