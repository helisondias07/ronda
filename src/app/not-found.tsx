export default function NotFound() {
  return (
    <>
      <header className="capa">
        <h1>Página não encontrada</h1>
        <p>Esse endereço não existe neste site do CheckoutGuard. Não é um laudo de loja.</p>
      </header>
      <main>
        <section className="slip">
          <p>
            <a href="/">Voltar ao visor</a>
            {" · "}
            <a href="/playground-estados.html">Playground de estados</a>
          </p>
        </section>
      </main>
    </>
  );
}
