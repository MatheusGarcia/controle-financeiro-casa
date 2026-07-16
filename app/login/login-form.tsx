"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/components/submit-button";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="login-form">
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          autoComplete="email"
          autoFocus
          id="email"
          inputMode="email"
          name="email"
          placeholder="seu@email.com"
          required
          type="email"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          placeholder="Digite sua senha"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p aria-live="polite" className="login-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton className="button login-submit" pendingLabel="Entrando...">
        Entrar
      </SubmitButton>
    </form>
  );
}
