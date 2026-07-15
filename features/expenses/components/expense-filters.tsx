import Link from "next/link";
import type { ExpenseFilters } from "@/features/expenses/filters";

export function ExpenseFiltersForm({ filters, month }: { filters: ExpenseFilters; month: string }) {
  return <form className="expense-filters" action="/" method="get">
    <input name="month" type="hidden" value={month} />
    <div className="field"><label htmlFor="filterPayer">Quem pagou</label><select id="filterPayer" name="payer" defaultValue={filters.payer ?? ""}><option value="">Todos</option><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div>
    <div className="field"><label htmlFor="filterStatus">Status</label><select id="filterStatus" name="status" defaultValue={filters.status ?? ""}><option value="">Todos</option><option value="PAGO">Pago</option><option value="PENDENTE">Pendente</option></select></div>
    <div className="field"><label htmlFor="filterSettlement">Divisão</label><select id="filterSettlement" name="settlement" defaultValue={filters.settlement ?? ""}><option value="">Todas</option><option value="PENDENTE_DIVISAO">Pendente de dividir</option><option value="DIVIDIDA">Já dividida</option></select></div>
    <div className="filter-actions"><button className="button secondary" type="submit">Filtrar</button><Link className="link-button" href={`/?month=${month}`}>Limpar</Link></div>
  </form>;
}
