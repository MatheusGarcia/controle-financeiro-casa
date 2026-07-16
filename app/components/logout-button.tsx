import { logout } from "@/app/auth/actions";
import { SubmitButton } from "@/app/components/submit-button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton className="button secondary" pendingLabel="Saindo...">
        Sair
      </SubmitButton>
    </form>
  );
}
