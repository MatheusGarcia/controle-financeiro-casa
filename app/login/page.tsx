import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { isAuthorizedUserId } from "@/lib/auth/authorized-users";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Entrar | Controle financeiro da casa",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!error && isAuthorizedUserId(data?.claims?.sub)) {
    redirect("/");
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-labelledby="login-title">
        <p className="eyebrow">Acesso privado</p>
        <h1 id="login-title">Controle da casa</h1>
        <p className="login-intro">
          Organização simples e segura das despesas compartilhadas de Matheus e Karina.
        </p>
      </section>

      <section className="card login-card" aria-labelledby="login-form-title">
        <p className="eyebrow">Área exclusiva</p>
        <h2 id="login-form-title">Entre para continuar</h2>
        <p className="note">Use o acesso configurado para você.</p>
        <LoginForm />
      </section>
    </main>
  );
}
