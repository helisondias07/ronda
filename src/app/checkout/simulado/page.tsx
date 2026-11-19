import type { Metadata } from "next";
import { PLANS } from "../../../lib/plans";

export const metadata: Metadata = {
  title: "Checkout (simulação)",
  robots: { index: false, follow: false },
};

export default async function CheckoutSimuladoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const planId = typeof params.plan === "string" ? params.plan : "";
  const plan = PLANS.find((item) => item.id === planId);

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
          <a href="/#plano">Planos</a>
          <a href="/#prova">A prova</a>
          <a href="/visor">Visor técnico</a>
        </nav>
      </header>

      <main id="conteudo" className="cg-sim">
        {plan ? (
          <>
            <h1>Simulação de checkout — {plan.name}</h1>
            <p className="cg-sim-price">
              R$ {plan.price} <span>{plan.period}</span>
            </p>
            <p>
              As chaves de pagamento (Stripe) ainda não estão configuradas neste ambiente, então esta é a
              simulação do fluxo real: o botão do plano chamaria <code>/api/checkout</code>, receberia a URL
              da página segura do Stripe e o comprador terminaria o pagamento lá — nenhum dado de cartão
              passa pelo servidor do CheckoutGuard.
            </p>
            <p className="cg-sim-hint">{plan.tagline}</p>
            <p className="cg-sim-note">
              Para contratar agora, fale com a gente pelo e-mail dos planos; as chaves de produção ativam o
              pagamento hospedado sem alterar esta página.
            </p>
            <div className="cg-hero-cta">
              <a className="cg-cta" href={plan.href}>
                Contratar por e-mail
              </a>
              <a className="cg-cta-quiet" href="/#plano">
                Voltar aos planos
              </a>
            </div>
          </>
        ) : (
          <>
            <h1>Simulação de checkout</h1>
            <p>Plano não reconhecido nesta simulação. Volte para a página de planos e escolha uma das três opções.</p>
            <div className="cg-hero-cta">
              <a className="cg-cta" href="/#plano">
                Ver planos
              </a>
            </div>
          </>
        )}
      </main>

      <footer className="cg-foot">
        <p>
          <strong>CheckoutGuard</strong> — pagamento hospedado no Stripe; o cartão nunca toca nosso servidor.
          <span className="cg-foot-links">
            {" "}
            <a href="/privacidade">Privacidade (LGPD)</a> · <a href="/visor">Visor técnico</a>
          </span>
        </p>
      </footer>
    </>
  );
}
