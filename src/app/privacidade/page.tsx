import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade (LGPD)",
  description: "Política de privacidade e limites técnicos do visor local e do motor Safe-Checkout do CheckoutGuard.",
};

export default function PrivacidadePage() {
  return (
    <>
      <header className="capa">
        <div className="capa-inner">
          <h1>Privacidade e Segurança de Dados (LGPD)</h1>
          <p>
            O visor público em <code>/visor</code> lê apenas o <strong>JSON aberto ou colado no seu próprio navegador</strong>.
            Nenhuma captura ou relatório local é enviado para servidores desta página.
          </p>
        </div>
      </header>
      <main>
        <section className="slip">
          <ul className="plain">
            <li>
              <strong>Processamento local no navegador:</strong> relatórios <code>report.json</code> abertos no visor
              permanecem em memória na aba do usuário (art. 7º, I, Lei 13.709/2018).
            </li>
            <li>
              <strong>Zero SSRF no site publicado:</strong> esta aplicação Next.js não possui rotas <code>/api</code>,
              não abre navegador headless remoto e não faz requisições a lojas de terceiros.
            </li>
            <li>
              <strong>Execução autorizada no CLI / CI:</strong> o motor de vistoria exige manifesto explícito (
              <code>StoreTargetManifest</code>), proxy local com DNS/IP Pinning, trava Safe-Checkout (
              <code>stopped_before_payment: true</code>), mascaramento de tokens/e-mails no console e limpeza do
              carrinho no encerramento.
            </li>
            <li>
              <strong>Proibições permanentes:</strong> o CheckoutGuard nunca preenche dados de cartão, nunca executa{" "}
              <code>checkoutComplete</code>, nunca acessa painel Admin e nunca altera arquivos de tema (
              <code>apply: false</code>).
            </li>
          </ul>
          <p>
            <a href="/">Voltar à página inicial</a> · <a href="/visor">Ir para o Visor Interativo</a>
          </p>
        </section>
      </main>
    </>
  );
}
