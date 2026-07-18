"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { expenseListUrlWithoutFilter, type ExpenseFilterKey, type ExpenseFilters } from "@/features/expenses/filters";

type Props = {
  categories: Array<{ id: string; name: string }>;
  filters: ExpenseFilters;
  month: string;
  resultCount: number;
};

const filterLabels: Record<Exclude<ExpenseFilterKey, "categoryId" | "query">, Record<string, string>> = {
  paymentType: { CREDITO: "Crédito", DEBITO_PIX: "Débito / Pix", NAO_INFORMADO: "Pagamento não informado" },
  payer: { KARINA: "Pago por Karina", MATHEUS: "Pago por Matheus" },
  settlement: { DIVIDIDA: "Já dividida", PENDENTE_DIVISAO: "Pendente de dividir" },
  status: { PAGO: "Pago", PENDENTE: "Pendente" },
};

export function ExpenseFiltersForm({ categories, filters, month, resultCount }: Props) {
  const router = useRouter();
  const activeFilters: Array<{ key: ExpenseFilterKey; label: string }> = [];
  if (filters.query) activeFilters.push({ key: "query", label: `Busca: “${filters.query}”` });
  if (filters.categoryId) activeFilters.push({ key: "categoryId", label: categories.find((category) => category.id === filters.categoryId)?.name ?? "Categoria selecionada" });
  for (const key of ["paymentType", "payer", "status", "settlement"] as const) {
    const value = filters[key];
    if (value) activeFilters.push({ key, label: filterLabels[key][value] });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams({ month });
    for (const name of ["q", "category", "payment", "payer", "status", "settlement"]) {
      const value = formData.get(name)?.toString().trim();
      if (value) params.set(name, value);
    }
    router.push(`/?${params.toString()}#expenses`);
  }

  return <form className="expense-filters" action="/" method="get" onSubmit={applyFilters}>
    <input name="month" type="hidden" value={month} />
    <div className="field filter-search"><label htmlFor="filterQuery">Buscar por descrição</label><input id="filterQuery" name="q" type="search" maxLength={80} defaultValue={filters.query ?? ""} placeholder="Ex.: supermercado, energia…" /></div>
    <div className="field"><label htmlFor="filterCategory">Categoria</label><select id="filterCategory" name="category" defaultValue={filters.categoryId ?? ""}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    <div className="field"><label htmlFor="filterPayment">Pagamento</label><select id="filterPayment" name="payment" defaultValue={filters.paymentType ?? ""}><option value="">Todos</option><option value="DEBITO_PIX">Débito / Pix</option><option value="CREDITO">Crédito</option><option value="NAO_INFORMADO">Não informado</option></select></div>
    <div className="field"><label htmlFor="filterPayer">Quem pagou</label><select id="filterPayer" name="payer" defaultValue={filters.payer ?? ""}><option value="">Todos</option><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div>
    <div className="field"><label htmlFor="filterStatus">Status</label><select id="filterStatus" name="status" defaultValue={filters.status ?? ""}><option value="">Todos</option><option value="PAGO">Pago</option><option value="PENDENTE">Pendente</option></select></div>
    <div className="field"><label htmlFor="filterSettlement">Divisão</label><select id="filterSettlement" name="settlement" defaultValue={filters.settlement ?? ""}><option value="">Todas</option><option value="PENDENTE_DIVISAO">Pendente de dividir</option><option value="DIVIDIDA">Já dividida</option></select></div>
    <div className="filter-actions"><button className="button secondary" type="submit">Aplicar filtros</button>{activeFilters.length > 0 && <Link className="link-button" href={`/?month=${month}#expenses`}>Limpar todos</Link>}</div>
    <div className="filter-summary" aria-live="polite">
      <strong>{resultCount} {resultCount === 1 ? "despesa encontrada" : "despesas encontradas"}</strong>
      {activeFilters.length > 0 && <div className="active-filters" aria-label="Filtros ativos">{activeFilters.map((filter) => <Link aria-label={`Remover filtro ${filter.label}`} className="filter-chip" href={`${expenseListUrlWithoutFilter(month, filters, filter.key)}#expenses`} key={filter.key}>{filter.label}<span aria-hidden="true">×</span></Link>)}</div>}
    </div>
  </form>;
}
