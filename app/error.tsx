"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell error-page">
      <p className="eyebrow">Algo não saiu como esperado</p>
      <h1>Não foi possível concluir esta operação.</h1>
      <p>Verifique os dados informados e tente novamente. Se o problema continuar, confira se o PostgreSQL local está ativo.</p>
      <button className="button" onClick={() => reset()}>Tentar novamente</button>
    </main>
  );
}
