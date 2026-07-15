import { getMonthlyDashboardData } from "@/features/dashboard/data";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export async function MonthlySummary({ month }: { month: string }) {
  const { summary } = await getMonthlyDashboardData(month);
  return <section className="grid summary-grid" aria-label="Resumo do mês" id="summary">
    <article className="card"><span className="metric-label">Total compartilhado</span><strong className="metric-value">{currency.format(summary.sharedTotal)}</strong></article>
    <article className="card"><span className="metric-label">Acerto pendente (por pessoa)</span><strong className="metric-value">{currency.format(summary.pendingPerPerson)}</strong></article>
    <article className="card"><span className="metric-label">Matheus adiantou (pendente)</span><strong className="metric-value">{currency.format(summary.matheusPaid)}</strong></article>
    <article className="card"><span className="metric-label">Karina adiantou (pendente)</span><strong className="metric-value">{currency.format(summary.karinaPaid)}</strong></article>
  </section>;
}
