export default function PrivacidadePage() {
  return (
    <>
      <header className="tape">
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
          </ul>
          <p>
            <a href="/">Voltar</a>
          </p>
        </section>
      </main>
    </>
  );
}
