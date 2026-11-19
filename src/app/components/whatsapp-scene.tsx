/**
 * Cena estática do aviso real: a loja quebra às 14h32 e o WhatsApp da loja toca
 * 30 segundos depois. Componente de servidor, sem JavaScript.
 */
export function WhatsappScene() {
  return (
    <div className="cg-scene">
      <div>
        <div className="cg-beat">
          <time>14h32:00</time>
          <p>
            Um template quebra na Wake. A página do produto responde <strong>HTTP 200</strong> — o uptime
            continua verde, o anúncio continua rodando.
          </p>
        </div>
        <div className="cg-beat">
          <time>14h32:20</time>
          <p>
            A ronda lê o corpo da resposta e encontra o erro escondido. Um reteste independente confirma:
            não é alarme falso.
          </p>
        </div>
        <div className="cg-beat">
          <time>14h32:30</time>
          <p>
            O WhatsApp da loja toca. Trinta segundos depois da quebra, antes do rombo virar relatório de
            fim de dia.
          </p>
        </div>
        <p className="cg-scene-foot">
          A ronda nunca conclui a compra para provar o defeito: para na tela de pagamento, não preenche
          cartão e limpa o carrinho ao sair. Nenhum pedido fantasma no seu ERP.
        </p>
      </div>

      <figure className="cg-msg" aria-label="Simulação do aviso chegando no WhatsApp da loja, 30 segundos depois da quebra confirmada pelo reteste.">
        <p className="cg-msg-head">WhatsApp · CheckoutGuard</p>
        <p className="cg-msg-text">
          Quebra confirmada na página do produto “Tênis Runner”. Botão Comprar sem preço: erro 500 dentro
          de um HTTP 200 — o ping não enxerga isso.
        </p>
        <p className="cg-msg-text">Reteste confirmou. Etapa 3 de 5. Nenhum pedido criado.</p>
        <span className="cg-msg-meta">14:32 · entregue</span>
        <figcaption className="cg-msg-caption">Simulação fiel do formato real do aviso.</figcaption>
      </figure>
    </div>
  );
}
