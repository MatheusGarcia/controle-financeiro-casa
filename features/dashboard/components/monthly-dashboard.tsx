import { getMonthlyDashboardData } from "@/features/dashboard/data";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const categoryColors = ["#176b87", "#0f9d79", "#e67e22", "#8e5cc8", "#d05d7b", "#5a6f93", "#c9a227", "#007c56", "#8b5e3c"];

function formatPerson(person: "MATHEUS" | "KARINA") {
  return person === "MATHEUS" ? "Matheus" : "Karina";
}

export async function MonthlyDashboard({ month }: { month: string }) {
  const { dashboard } = await getMonthlyDashboardData(month);
  const maxCategoryTotal = dashboard.categoryTotals[0]?.[1] ?? 1;
  const maxTrendValue = Math.max(...dashboard.monthlyTrend.map((item) => item.value), 1);

  return <section className="dashboard" aria-label="Painel financeiro" id="dashboard">
    <div className="dashboard-heading"><div><p className="eyebrow">Dashboard</p><h2>Visão de {dashboard.monthLabel}</h2></div><p className="note">Valores incluem lançamentos pagos e pendentes do mês.</p></div>
    <div className="grid dashboard-grid">
      <article className="card dashboard-card"><h3>Fechamento do mês</h3><div className="closing-rows"><span>Total lançado <strong>{currency.format(dashboard.monthTotal)}</strong></span><span>Compartilhado <strong>{currency.format(dashboard.sharedTotal)}</strong></span><span>Individual <strong>{currency.format(dashboard.individualTotal)}</strong></span><span>Já acertado <strong>{currency.format(dashboard.settledTotal)}</strong></span></div><p className={`settlement ${dashboard.balanced ? "neutral" : ""}`}>{dashboard.settlement}</p></article>
      <article aria-labelledby="payer-chart-title" className="card dashboard-card"><h3 id="payer-chart-title">Quem pagou no mês</h3><div className="split-chart">{dashboard.personTotals.map((item, index) => <div key={item.person}><div className="split-chart-label"><span>{formatPerson(item.person)}</span><strong>{currency.format(item.value)}</strong></div><div aria-hidden="true" className="progress"><span style={{ width: `${dashboard.monthTotal ? (item.value / dashboard.monthTotal) * 100 : 0}%`, background: index === 0 ? "#176b87" : "#e67e22" }} /></div></div>)}</div></article>
      <article className="card dashboard-card"><h3>Próximos compromissos</h3>{dashboard.upcomingExpenses.length === 0 ? <p className="note">Nenhuma despesa pendente nos próximos três meses.</p> : <div className="upcoming-list">{dashboard.upcomingExpenses.map((expense) => <div key={expense.id}><span><strong>{expense.description}</strong><small>{dateFormatter.format(new Date(expense.occurredOn))} · {expense.categoryName}</small></span><strong>{currency.format(expense.amount)}</strong></div>)}</div>}</article>
    </div>
    <div className="grid insights-grid">
      <article aria-labelledby="category-chart-title" className="card"><h3 id="category-chart-title">Gastos por categoria</h3>{dashboard.categoryTotals.length === 0 ? <p className="note">Registre despesas para ver a distribuição.</p> : <div className="bar-list">{dashboard.categoryTotals.map(([name, value], index) => <div key={name}><div className="bar-label"><span><i aria-hidden="true" style={{ background: categoryColors[index % categoryColors.length] }} />{name}</span><strong>{currency.format(value)}</strong></div><div aria-hidden="true" className="progress"><span style={{ width: `${(value / maxCategoryTotal) * 100}%`, background: categoryColors[index % categoryColors.length] }} /></div></div>)}</div>}</article>
      <article aria-labelledby="trend-chart-title" className="card"><h3 id="trend-chart-title">Últimos seis meses</h3><div aria-hidden="true" className="trend-chart">{dashboard.monthlyTrend.map((item) => <div key={item.date}><span className="trend-value">{item.value ? currency.format(item.value) : "–"}</span><div className="trend-column"><span style={{ height: `${(item.value / maxTrendValue) * 100}%` }} /></div><small>{monthFormatter.format(new Date(item.date))}</small></div>)}</div><ul className="sr-only">{dashboard.monthlyTrend.map((item) => <li key={item.date}>{monthFormatter.format(new Date(item.date))}: {currency.format(item.value)}</li>)}</ul></article>
    </div>
  </section>;
}
