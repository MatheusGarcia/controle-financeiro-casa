"use server";

import { redirect } from "next/navigation";
import { isAuthorizedUserId } from "@/lib/auth/authorized-users";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Informe o e-mail e a senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  const { data } = await supabase.auth.getClaims();
  if (!isAuthorizedUserId(data?.claims?.sub)) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "E-mail ou senha inválidos." };
  }

  redirect("/");
}
