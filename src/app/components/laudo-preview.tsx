/**
 * Laudo real na superfície de papel: cabeçalho mono, veredito em Bodoni,
 * passos 01–05 com status escrito + cor, evidência do erro e notas de auditor.
 * Componente de servidor, sem JavaScript.
 */
const LAUDO_STEPS = [
  { n: "01", name: "Home", status: "passou", tone: "ok", note: "vitrine renderizada, sem erro de console" },
  { n: "02", name: "Categoria", status: "passou", tone: "ok", note: "grade de produtos carregada" },
  {
    n: "03",
    name: "Produto",
    status: "falhou",
    tone: "falhou",
    note: "HTTP 200 com corpo status_code 500 — erro Scriban no template",
  },
  { n: "04", name: "Carrinho", status: "passou", tone: "ok", note: "1 item, frete cotado por CEP" },
  {
    n: "05",
    name: "Checkout",
    status: "parado",
    tone: "parado",
    note: "stopped_before_payment: true — nenhum pedido criado",
  },
] as const;

export function LaudoPreview() {
  return (
    <article className="cg-paper" aria-label="Prévia do laudo de auditoria com cinco etapas numeradas.">
      <header className="cg-doc-head">
        <span>LAUDO · loja-exemplo.com.br</span>
        <span>18/11/2026 · 14:32 · Wake</span>
      </header>
      <p className="cg-doc-verdict">Falhou no passo 03. Parado antes de pagar.</p>
      <ol className="cg-doc-steps">
        {LAUDO_STEPS.map((step) => (
          <li key={step.n} className={`cg-doc-step is-${step.tone}`}>
            <span className="cg-doc-n">{step.n}</span>
            <span className="cg-doc-name">{step.name}</span>
            <span className="cg-doc-note">{step.note}</span>
            <span className="cg-doc-status">{step.status}</span>
          </li>
        ))}
      </ol>
      <footer className="cg-doc-foot">
        <p className="cg-doc-error">
          erro capturado: <code>{`{"status_code":500,"message":"The function 'currency' was not found"}`}</code>
        </p>
        <p className="cg-doc-margin">
          nota de auditor · a hipótese é do time, não da ferramenta: revisar o partial de preço do tema.
          apply: false.
        </p>
        <p className="cg-doc-proof">
          prints com hash SHA-256 · console first-party mascarado · carrinho limpo no encerramento · 0
          pedidos criados
        </p>
      </footer>
    </article>
  );
}
