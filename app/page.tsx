import Link from "next/link";
import { Prisma, SettlementStatus, SharingType } from "@prisma/client";
import { createExpense, createInstallmentPlan, createPaymentMethod, createRecurringRule, deleteExpense, updateExpense } from "@/app/actions";
import { ensureInitialCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { ensureRecurringExpensesForMonth } from "@/lib/recurring-expenses";
import { SideNavigation } from "@/app/components/side-navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { ExpenseFiltersForm } from "@/features/expenses/components/expense-filters";
import { expenseListUrl as buildExpenseListUrl, parseExpenseFilters } from "@/features/expenses/filters";

type SearchParams = Promise<{ month?: string; edit?: string; page?: string; payer?: string; status?: string; settlement?: string }>;

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const categoryColors = ["#176b87", "#0f9d79", "#e67e22", "#8e5cc8", "#d05d7b", "#5a6f93", "#c9a227", "#007c56", "#8b5e3c"];
const expensesPerPage = 20;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseMonth(value?: string) {
  return /^\d{4}-\d{2}$/.test(value ?? "") ? value! : currentMonth();
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1, 12),
    end: new Date(year, monthNumber, 1, 12),
  };
}

function formatPerson(person: "MATHEUS" | "KARINA") {
  return person === "MATHEUS" ? "Matheus" : "Karina";
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function decimalValue(value: Prisma.Decimal) {
  return value.toNumber();
}

function sumExpenses(expenses: Array<{ amount: Prisma.Decimal }>) {
  return expenses.reduce((sum, expense) => sum + decimalValue(expense.amount), 0);
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const month = parseMonth(params.month);
  const filters = parseExpenseFilters(params);
  const page = Math.max(1, Number(params.page) || 1);
  const { start, end } = monthBounds(month);
  const trendStart = new Date(start.getFullYear(), start.getMonth() - 5, 1, 12);
  const upcomingEnd = new Date(end.getFullYear(), end.getMonth() + 3, 1, 12);

  await ensureInitialCategories();
  await ensureRecurringExpensesForMonth(month);
  const monthWhere: Prisma.ExpenseWhereInput = { occurredOn: { gte: start, lt: end } };
  const listWhere: Prisma.ExpenseWhereInput = { ...monthWhere, payer: filters.payer, status: filters.status, settlementStatus: filters.settlement };
  const [categories, paymentMethods, recurringRules, installmentPlans, expenses, filteredExpenses, filteredExpenseCount, trendExpenses, upcomingExpenses] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.paymentMethod.findMany({ where: { active: true }, orderBy: [{ owner: "asc" }, { name: "asc" }] }),
    prisma.recurringRule.findMany({ where: { active: true }, include: { category: true, paymentMethod: true }, orderBy: { description: "asc" } }),
    prisma.installmentPlan.findMany({ include: { category: true, paymentMethod: true }, orderBy: { firstDueOn: "asc" } }),
    prisma.expense.findMany({
      where: monthWhere,
      include: { category: true },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.expense.findMany({ where: listWhere, include: { category: true }, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }], skip: (page - 1) * expensesPerPage, take: expensesPerPage }),
    prisma.expense.count({ where: listWhere }),
    prisma.expense.findMany({
      where: { occurredOn: { gte: trendStart, lt: end } },
      select: { amount: true, occurredOn: true },
    }),
    prisma.expense.findMany({
      where: { occurredOn: { gte: end, lt: upcomingEnd }, status: "PENDENTE" },
      include: { category: true },
      orderBy: { occurredOn: "asc" },
      take: 6,
    }),
  ]);

  const editExpense = params.edit ? expenses.find((expense) => expense.id === params.edit) : undefined;
  const expenseListUrl = buildExpenseListUrl(month, filters);
  const totalExpensePages = Math.max(1, Math.ceil(filteredExpenseCount / expensesPerPage));
  const shared = expenses.filter((expense) => expense.sharingType === SharingType.COMPARTILHADA);
  const sharedTotal = sumExpenses(shared);
  const pendingSettlement = shared.filter((expense) => expense.settlementStatus === SettlementStatus.PENDENTE_DIVISAO);
  const matheusPaid = sumExpenses(pendingSettlement.filter((expense) => expense.payer === "MATHEUS"));
  const karinaPaid = sumExpenses(pendingSettlement.filter((expense) => expense.payer === "KARINA"));
  const pendingSettlementTotal = sumExpenses(pendingSettlement);
  const half = pendingSettlementTotal / 2;
  const matheusBalance = matheusPaid - half;
  const karinaBalance = karinaPaid - half;
  const settlement = Math.abs(matheusBalance) < 0.005
    ? "As despesas compartilhadas estão equilibradas."
    : matheusBalance > 0
      ? `Karina deve ${currency.format(matheusBalance)} para Matheus.`
      : `Matheus deve ${currency.format(karinaBalance)} para Karina.`;
  const individualTotal = sumExpenses(expenses.filter((expense) => expense.sharingType === SharingType.INDIVIDUAL));
  const monthTotal = sumExpenses(expenses);
  const settledTotal = sumExpenses(shared.filter((expense) => expense.settlementStatus === SettlementStatus.DIVIDIDA));
  const personTotals = ["MATHEUS", "KARINA"].map((person) => ({
    person: person as "MATHEUS" | "KARINA",
    value: sumExpenses(expenses.filter((expense) => expense.payer === person)),
  }));
  const categoryTotals = Array.from(
    expenses.reduce((result, expense) => {
      const previous = result.get(expense.category.name) ?? 0;
      result.set(expense.category.name, previous + decimalValue(expense.amount));
      return result;
    }, new Map<string, number>()),
  ).sort(([, left], [, right]) => right - left);
  const maxCategoryTotal = categoryTotals[0]?.[1] ?? 1;
  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() - 5 + index, 1, 12);
    const value = sumExpenses(trendExpenses.filter((expense) => expense.occurredOn.getFullYear() === date.getFullYear() && expense.occurredOn.getMonth() === date.getMonth()));
    return { date, value };
  });
  const maxTrendValue = Math.max(...monthlyTrend.map((item) => item.value), 1);

  return (
    <main className="app-layout">
      <SideNavigation />
      <div className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Matheus + Karina</p>
          <h1>Controle da casa</h1>
        </div>
        <div className="header-actions"><Link className="button secondary" href="/import">Importar planilha</Link><form className="month-form" action="/" method="get">
          <label htmlFor="month">Mês</label>
          <input id="month" name="month" type="month" defaultValue={month} />
          <button className="button secondary" type="submit">Ver</button>
        </form></div>
      </header>

      <section className="grid summary-grid" aria-label="Resumo do mês" id="summary">
        <article className="card"><span className="metric-label">Total compartilhado</span><strong className="metric-value">{currency.format(sharedTotal)}</strong></article>
        <article className="card"><span className="metric-label">Acerto pendente (por pessoa)</span><strong className="metric-value">{currency.format(half)}</strong></article>
        <article className="card"><span className="metric-label">Matheus adiantou (pendente)</span><strong className="metric-value">{currency.format(matheusPaid)}</strong></article>
        <article className="card"><span className="metric-label">Karina adiantou (pendente)</span><strong className="metric-value">{currency.format(karinaPaid)}</strong></article>
      </section>

      <section className="dashboard" aria-label="Painel financeiro" id="dashboard">
        <div className="dashboard-heading"><div><p className="eyebrow">Dashboard</p><h2>Visão de {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start)}</h2></div><p className="note">Valores incluem lançamentos pagos e pendentes do mês.</p></div>
        <div className="grid dashboard-grid">
          <article className="card dashboard-card"><h3>Fechamento do mês</h3><div className="closing-rows"><span>Total lançado <strong>{currency.format(monthTotal)}</strong></span><span>Compartilhado <strong>{currency.format(sharedTotal)}</strong></span><span>Individual <strong>{currency.format(individualTotal)}</strong></span><span>Já acertado <strong>{currency.format(settledTotal)}</strong></span></div><p className={`settlement ${Math.abs(matheusBalance) < 0.005 ? "neutral" : ""}`}>{settlement}</p></article>
          <article className="card dashboard-card"><h3>Quem pagou no mês</h3><div className="split-chart">{personTotals.map((item, index) => <div key={item.person}><div className="split-chart-label"><span>{formatPerson(item.person)}</span><strong>{currency.format(item.value)}</strong></div><div className="progress"><span style={{ width: `${monthTotal ? (item.value / monthTotal) * 100 : 0}%`, background: index === 0 ? "#176b87" : "#e67e22" }} /></div></div>)}</div></article>
          <article className="card dashboard-card"><h3>Próximos compromissos</h3>{upcomingExpenses.length === 0 ? <p className="note">Nenhuma despesa pendente nos próximos três meses.</p> : <div className="upcoming-list">{upcomingExpenses.map((expense) => <div key={expense.id}><span><strong>{expense.description}</strong><small>{dateFormatter.format(expense.occurredOn)} · {expense.category.name}</small></span><strong>{currency.format(decimalValue(expense.amount))}</strong></div>)}</div>}</article>
        </div>
        <div className="grid insights-grid">
          <article className="card"><h3>Gastos por categoria</h3>{categoryTotals.length === 0 ? <p className="note">Registre despesas para ver a distribuição.</p> : <div className="bar-list">{categoryTotals.map(([name, value], index) => <div key={name}><div className="bar-label"><span><i style={{ background: categoryColors[index % categoryColors.length] }} />{name}</span><strong>{currency.format(value)}</strong></div><div className="progress"><span style={{ width: `${(value / maxCategoryTotal) * 100}%`, background: categoryColors[index % categoryColors.length] }} /></div></div>)}</div>}</article>
          <article className="card"><h3>Últimos seis meses</h3><div className="trend-chart">{monthlyTrend.map((item) => <div key={item.date.toISOString()}><span className="trend-value">{item.value ? currency.format(item.value) : "–"}</span><div className="trend-column"><span style={{ height: `${(item.value / maxTrendValue) * 100}%` }} /></div><small>{monthFormatter.format(item.date)}</small></div>)}</div></article>
        </div>
      </section>

      <section className="grid content-grid">
        <aside className="card" id="expense-form">
          <h2>{editExpense ? "Editar despesa" : "Nova despesa"}</h2>
          <p className="note">Marque “Já dividida” quando a parte de quem não pagou a conta já tiver sido repassada.</p>
          <form action={editExpense ? updateExpense : createExpense}>
            {editExpense && <input type="hidden" name="id" value={editExpense.id} />}
            <div className="field"><label htmlFor="description">Descrição</label><input id="description" name="description" required defaultValue={editExpense?.description} placeholder="Ex.: Aluguel" /></div>
            <div className="two-columns">
              <div className="field"><label htmlFor="amount">Valor</label><input id="amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={editExpense ? decimalValue(editExpense.amount) : undefined} placeholder="0,00" /></div>
              <div className="field"><label htmlFor="occurredOn">Data</label><input id="occurredOn" name="occurredOn" type="date" required defaultValue={editExpense ? dateInputValue(editExpense.occurredOn) : `${month}-01`} /></div>
            </div>
            <div className="field"><label htmlFor="categoryId">Categoria</label><select id="categoryId" name="categoryId" required defaultValue={editExpense?.categoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="field"><label htmlFor="paymentMethodId">Método de pagamento</label><select id="paymentMethodId" name="paymentMethodId" defaultValue={editExpense?.paymentMethodId ?? ""}><option value="">Não informado</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}{method.owner ? ` · ${formatPerson(method.owner)}` : ""}</option>)}</select></div>
            <div className="two-columns">
              <div className="field"><label htmlFor="payer">Quem pagou</label><select id="payer" name="payer" defaultValue={editExpense?.payer ?? "MATHEUS"}><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div>
              <div className="field"><label htmlFor="sharingType">Natureza</label><select id="sharingType" name="sharingType" defaultValue={editExpense?.sharingType ?? "COMPARTILHADA"}><option value="COMPARTILHADA">Compartilhada</option><option value="INDIVIDUAL">Individual</option></select></div>
            </div>
            <div className="field"><label htmlFor="settlementStatus">Divisão</label><select id="settlementStatus" name="settlementStatus" defaultValue={editExpense?.settlementStatus ?? "PENDENTE_DIVISAO"}><option value="PENDENTE_DIVISAO">Pendente de dividir</option><option value="DIVIDIDA">Já dividida</option></select></div>
            <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={editExpense?.status ?? "PAGO"}><option value="PAGO">Pago</option><option value="PENDENTE">Pendente</option></select></div>
            <div className="field"><label htmlFor="notes">Observação</label><textarea id="notes" name="notes" defaultValue={editExpense?.notes ?? undefined} placeholder="Opcional" /></div>
            <div className="actions"><SubmitButton className="button" pendingLabel={editExpense ? "Salvando alterações…" : "Adicionando despesa…"}>{editExpense ? "Salvar alterações" : "Adicionar despesa"}</SubmitButton>{editExpense && <Link className="button secondary" href={expenseListUrl}>Cancelar</Link>}</div>
          </form>
        </aside>

        <section className="card" id="expenses">
          <h2>Despesas de {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start)}</h2>
          <p className={`settlement ${Math.abs(matheusBalance) < 0.005 ? "neutral" : ""}`}>{settlement}</p>
          <ExpenseFiltersForm filters={filters} month={month} />
          {filteredExpenses.length === 0 ? <p className="empty">Nenhuma despesa encontrada com estes filtros.</p> : <div className="expense-list">
            {filteredExpenses.map((expense) => (
              <article className="expense" key={expense.id}>
                <div><p className="expense-description">{expense.description}</p><p className="expense-meta">{dateFormatter.format(expense.occurredOn)} · {expense.category.name} · {formatPerson(expense.payer)} · {expense.sharingType === "COMPARTILHADA" ? "Compartilhada" : "Individual"} · {expense.status === "PAGO" ? "Pago" : "Pendente"}{expense.sharingType === "COMPARTILHADA" ? ` · ${expense.settlementStatus === "DIVIDIDA" ? "Já dividida" : "Pendente de dividir"}` : ""}</p></div>
                <strong className="expense-amount">{currency.format(decimalValue(expense.amount))}</strong>
                <div className="expense-actions"><Link className="link-button" href={`${expenseListUrl}&edit=${expense.id}#expense-form`} scroll={false}>Editar</Link><form action={deleteExpense}><input type="hidden" name="id" value={expense.id} /><input type="hidden" name="month" value={month} /><SubmitButton className="button danger" pendingLabel="Excluindo…">Excluir</SubmitButton></form></div>
              </article>
            ))}
          </div>}
          {totalExpensePages > 1 && <nav className="pagination" aria-label="Paginação de despesas"><span>Página {page} de {totalExpensePages}</span>{page > 1 && <Link className="button secondary" href={`${expenseListUrl}&page=${page - 1}#expenses`}>Anterior</Link>}{page < totalExpensePages && <Link className="button secondary" href={`${expenseListUrl}&page=${page + 1}#expenses`}>Próxima</Link>}</nav>}
        </section>
      </section>

      <section className="management" id="management">
        <div>
          <h2>Cartões, recorrências e parcelas</h2>
          <p className="note">Cadastre os compromissos uma vez; as despesas mensais são criadas na lista automaticamente.</p>
        </div>
        <div className="grid management-grid">
          <details className="card"><summary>Adicionar cartão ou conta</summary><form action={createPaymentMethod}><input type="hidden" name="month" value={month} /><div className="field"><label htmlFor="methodName">Nome</label><input id="methodName" name="methodName" required placeholder="Ex.: Nubank Matheus" /></div><div className="two-columns"><div className="field"><label htmlFor="methodType">Tipo</label><select id="methodType" name="methodType"><option value="CARTAO">Cartão</option><option value="CONTA">Conta</option><option value="DINHEIRO">Dinheiro</option><option value="OUTRO">Outro</option></select></div><div className="field"><label htmlFor="methodOwner">Titular</label><select id="methodOwner" name="methodOwner"><option value="">Compartilhado</option><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div></div><SubmitButton className="button" pendingLabel="Adicionando método…">Adicionar método</SubmitButton></form>{paymentMethods.length > 0 && <p className="note list-note">Ativos: {paymentMethods.map((method) => method.name).join(", ")}</p>}</details>

          <details className="card"><summary>Adicionar despesa recorrente</summary><form action={createRecurringRule}><input type="hidden" name="month" value={month} /><div className="field"><label htmlFor="recurringDescription">Descrição</label><input id="recurringDescription" name="recurringDescription" required placeholder="Ex.: Aluguel" /></div><div className="two-columns"><div className="field"><label htmlFor="recurringAmount">Valor</label><input id="recurringAmount" name="recurringAmount" type="number" min="0.01" step="0.01" required /></div><div className="field"><label htmlFor="dueDay">Dia do vencimento</label><input id="dueDay" name="dueDay" type="number" min="1" max="31" required defaultValue="1" /></div></div><div className="field"><label htmlFor="recurringCategoryId">Categoria</label><select id="recurringCategoryId" name="recurringCategoryId">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="two-columns"><div className="field"><label htmlFor="recurringPayer">Quem paga</label><select id="recurringPayer" name="recurringPayer"><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div><div className="field"><label htmlFor="recurringSharingType">Natureza</label><select id="recurringSharingType" name="recurringSharingType"><option value="COMPARTILHADA">Compartilhada</option><option value="INDIVIDUAL">Individual</option></select></div></div><div className="field"><label htmlFor="recurringPaymentMethodId">Método de pagamento</label><select id="recurringPaymentMethodId" name="recurringPaymentMethodId"><option value="">Não informado</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></div><div className="two-columns"><div className="field"><label htmlFor="startsOn">Inicia em</label><input id="startsOn" name="startsOn" type="date" required defaultValue={`${month}-01`} /></div><div className="field"><label htmlFor="endsOn">Termina em</label><input id="endsOn" name="endsOn" type="date" /></div></div><SubmitButton className="button" pendingLabel="Criando recorrência…">Criar recorrência</SubmitButton></form>{recurringRules.length > 0 && <p className="note list-note">Ativas: {recurringRules.map((rule) => rule.description).join(", ")}</p>}</details>

          <details className="card"><summary>Adicionar compra parcelada</summary><form action={createInstallmentPlan}><input type="hidden" name="month" value={month} /><div className="field"><label htmlFor="installmentDescription">Descrição</label><input id="installmentDescription" name="installmentDescription" required placeholder="Ex.: Bicicleta" /></div><div className="two-columns"><div className="field"><label htmlFor="installmentAmount">Valor de cada parcela</label><input id="installmentAmount" name="installmentAmount" type="number" min="0.01" step="0.01" required /></div><div className="field"><label htmlFor="totalInstallments">Número de parcelas</label><input id="totalInstallments" name="totalInstallments" type="number" min="2" max="120" required /></div></div><div className="field"><label htmlFor="firstDueOn">Primeira parcela</label><input id="firstDueOn" name="firstDueOn" type="date" required defaultValue={`${month}-01`} /></div><div className="field"><label htmlFor="installmentCategoryId">Categoria</label><select id="installmentCategoryId" name="installmentCategoryId">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="two-columns"><div className="field"><label htmlFor="installmentPayer">Quem paga</label><select id="installmentPayer" name="installmentPayer"><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div><div className="field"><label htmlFor="installmentSharingType">Natureza</label><select id="installmentSharingType" name="installmentSharingType"><option value="COMPARTILHADA">Compartilhada</option><option value="INDIVIDUAL">Individual</option></select></div></div><div className="field"><label htmlFor="installmentPaymentMethodId">Método de pagamento</label><select id="installmentPaymentMethodId" name="installmentPaymentMethodId"><option value="">Não informado</option>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></div><SubmitButton className="button" pendingLabel="Criando parcelas…">Criar parcelas</SubmitButton></form>{installmentPlans.length > 0 && <p className="note list-note">Planos: {installmentPlans.map((plan) => `${plan.description} (${plan.totalInstallments}x)`).join(", ")}</p>}</details>
        </div>
      </section>
      </div>
    </main>
  );
}
