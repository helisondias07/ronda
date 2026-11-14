export default function PrivacidadePage() {
  return (
    <>
      <header className="capa">
        <h1>Privacidade (LGPD)</h1>
        <p>A Ronda processa URL e laudo que você gera. Não criamos conta e não entramos em loja de cliente da nuvem.</p>
      </header>
      <main>
        <section className="slip">
          <ul>
            <li>Base: consentimento ao colar um laudo neste navegador (art. 7º, I, Lei 13.709/2018).</li>
            <li>O visor não envia o JSON a servidor nosso: a leitura é no seu navegador.</li>
            <li>
              O CLI grava prints em <code>ronda-out/</code> na sua máquina. Não versionar prints de loja de
              cliente.
            </li>
            <li>Não use a Ronda contra produção de cliente sem autorização escrita do ambiente.</li>
            <li>
              O site publicado não faz fetch de URL (isolamento). O CLI, no seu PC, só faz GET no origin
              autorizado; IP privado, metadata e credenciais na URL são recusados.
            </li>
            <li>Teto: 30 páginas, 80 links, 8 segundos, método GET. Sem POST/PUT/DELETE.</li>
          </ul>
          <p>
            <a href="/">Voltar</a>
          </p>
        </section>
      </main>
    </>
  );
}
