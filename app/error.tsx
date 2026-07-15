"use client";

import { useEffect } from "react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application route error");
  }, []);

  return (
    <main className="shell error-page">
      <p className="eyebrow">Algo não saiu como esperado</p>
      <h1>Não foi possível concluir esta operação.</h1>
      <p>Verifique os dados informados e tente novamente. Se o problema continuar, confirme a conexão com o banco de dados ou acesse <code>/api/health</code> para conferir a disponibilidade.</p>
      <button className="button" onClick={() => reset()}>Tentar novamente</button>
    </main>
  );
}
