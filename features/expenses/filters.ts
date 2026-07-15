import type { ExpenseStatus, Person, SettlementStatus } from "@prisma/client";

export type ExpenseFilters = {
  payer?: Person;
  settlement?: SettlementStatus;
  status?: ExpenseStatus;
};

export function parseExpenseFilters(params: { payer?: string; settlement?: string; status?: string }): ExpenseFilters {
  return {
    payer: params.payer === "MATHEUS" || params.payer === "KARINA" ? params.payer : undefined,
    status: params.status === "PAGO" || params.status === "PENDENTE" ? params.status : undefined,
    settlement: params.settlement === "DIVIDIDA" || params.settlement === "PENDENTE_DIVISAO" ? params.settlement : undefined,
  };
}

export function expenseListUrl(month: string, filters: ExpenseFilters) {
  const params = new URLSearchParams({ month });
  if (filters.payer) params.set("payer", filters.payer);
  if (filters.status) params.set("status", filters.status);
  if (filters.settlement) params.set("settlement", filters.settlement);
  return `/?${params.toString()}`;
}
