import "server-only";

import { redirect } from "next/navigation";
import { isAuthorizedUserId } from "@/lib/auth/authorized-users";
import { createClient } from "@/lib/supabase/server";

export async function requireAuthorizedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims || !isAuthorizedUserId(claims.sub)) {
    redirect("/login");
  }

  return claims;
}
