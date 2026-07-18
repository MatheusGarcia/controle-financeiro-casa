import type { ExpenseStatus, PaymentType, Person, SettlementStatus } from "@prisma/client";

export type ExpenseFilters = {
  categoryId?: string;
  paymentType?: PaymentType;
  payer?: Person;
  query?: string;
  settlement?: SettlementStatus;
  status?: ExpenseStatus;
};

export type ExpenseFilterKey = keyof ExpenseFilters;

export function parseExpenseFilters(params: { category?: string; payer?: string; payment?: string; q?: string; settlement?: string; status?: string }): ExpenseFilters {
  const query = params.q?.trim().replace(/\s+/g, " ").slice(0, 80);
  const categoryId = params.category?.trim().slice(0, 64);

  return {
    categoryId: categoryId || undefined,
    paymentType: params.payment === "DEBITO_PIX" || params.payment === "CREDITO" || params.payment === "NAO_INFORMADO" ? params.payment : undefined,
    payer: params.payer === "MATHEUS" || params.payer === "KARINA" ? params.payer : undefined,
    query: query || undefined,
    status: params.status === "PAGO" || params.status === "PENDENTE" ? params.status : undefined,
    settlement: params.settlement === "DIVIDIDA" || params.settlement === "PENDENTE_DIVISAO" ? params.settlement : undefined,
  };
}

export function hasExpenseFilters(filters: ExpenseFilters) {
  return Object.values(filters).some(Boolean);
}

export function expenseListUrl(month: string, filters: ExpenseFilters, page?: number) {
  const params = new URLSearchParams({ month });
  if (filters.query) params.set("q", filters.query);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.paymentType) params.set("payment", filters.paymentType);
  if (filters.payer) params.set("payer", filters.payer);
  if (filters.status) params.set("status", filters.status);
  if (filters.settlement) params.set("settlement", filters.settlement);
  if (page && page > 1) params.set("page", String(page));
  return `/?${params.toString()}`;
}

export function expenseListUrlWithoutFilter(month: string, filters: ExpenseFilters, filter: ExpenseFilterKey) {
  return expenseListUrl(month, { ...filters, [filter]: undefined });
}
