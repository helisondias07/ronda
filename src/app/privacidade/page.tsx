export default function PrivacidadePage() {
  return (
    <>
      <header className="capa">
        <h1>Privacidade (LGPD)</h1>
        <p>
          O visor publicado só lê o <strong>JSON que você cola</strong> neste navegador. Não busca loja e
          não envia o laudo a um servidor nosso.
        </p>
      </header>
      <main>
        <section className="slip">
          <ul>
            <li>Base: consentimento ao colar um laudo neste navegador (art. 7º, I, Lei 13.709/2018).</li>
            <li>Este site não abre URL de vitrine, não faz crawl e não processa endereço de loja.</li>
            <li>
              O CLI, no seu computador, pode gravar prints em <code>ronda-out/</code> e fazer GET só no
              origin autorizado. Isso não acontece nesta página.
            </li>
            <li>Não versionar print de loja de cliente. Produção de cliente continua fora.</li>
            <li>Teto do CLI: 30 páginas, 80 links, 8 segundos, método GET. Sem POST/PUT/DELETE.</li>
          </ul>
          <p>
            <a href="/">Voltar</a>
          </p>
        </section>
      </main>
    </>
  );
}
