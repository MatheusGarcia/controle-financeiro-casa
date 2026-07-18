export const expenseMutationScopes = ["CURRENT", "INSTALLMENT_PLAN"] as const;

export type ExpenseMutationScope = (typeof expenseMutationScopes)[number];

export function parseExpenseMutationScope(value: FormDataEntryValue | null): ExpenseMutationScope {
  if (value === null || value === "CURRENT") return "CURRENT";
  if (value === "INSTALLMENT_PLAN") return "INSTALLMENT_PLAN";
  throw new Error("Alcance da alteração inválido.");
}
