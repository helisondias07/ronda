/**
 * Prévia fiel do laudo que o produto entrega (mesma estrutura do demo real em /visor):
 * 5 etapas numeradas, veredito por etapa, erro Scriban evidenciado e provas com hash.
 * Componente de servidor, sem JavaScript.
 */
const LAUDO_STEPS = [
  { n: "01", name: "Home", verdict: "passou", note: "vitrine renderizada, sem erro de console" },
  { n: "02", name: "Categoria", verdict: "passou", note: "grade de produtos carregada" },
  { n: "03", name: "Produto", verdict: "falhou", note: 'HTTP 200 com corpo {"status_code": 500} — erro Scriban' },
  { n: "04", name: "Carrinho", verdict: "passou", note: "1 item, frete cotado por CEP" },
  { n: "05", name: "Checkout", verdict: "parado", note: "stopped_before_payment: true — nenhum pedido" },
] as const;

export function LaudoPreview() {
  return (
    <article className="cg-doc" aria-label="Prévia do laudo de auditoria com cinco etapas numeradas.">
      <header className="cg-doc-head">
        <p className="cg-doc-kicker">Laudo · loja-exemplo.com.br · Wake</p>
        <p className="cg-doc-verdict">falhou na etapa 03 — parado antes de pagar</p>
      </header>
      <ol className="cg-doc-steps">
        {LAUDO_STEPS.map((step) => (
          <li key={step.n} className={`cg-doc-step is-${step.verdict}`}>
            <span className="cg-doc-n">{step.n}</span>
            <span className="cg-doc-name">{step.name}</span>
            <span className="cg-doc-note">{step.note}</span>
          </li>
        ))}
      </ol>
      <footer className="cg-doc-foot">
        <p className="cg-doc-error">
          erro capturado: <code>{`{"status_code":500,"message":"The function 'currency' was not found"}`}</code>
        </p>
        <p className="cg-doc-proof">
          prints com hash SHA-256 · console first-party mascarado · carrinho limpo no encerramento · 0
          pedidos criados
        </p>
      </footer>
    </article>
  );
}
