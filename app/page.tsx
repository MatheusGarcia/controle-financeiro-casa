import Link from "next/link";
import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { createExpense, createRecurringRule, updateExpense } from "@/app/actions";
import { ensureInitialCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { ensureRecurringExpensesForMonth } from "@/lib/recurring-expenses";
import { SideNavigation } from "@/app/components/side-navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { LogoutButton } from "@/app/components/logout-button";
import { EditAnchorScroller } from "@/app/components/edit-anchor-scroller";
import { PaymentFields } from "@/app/components/payment-fields";
import { ExpenseFiltersForm } from "@/features/expenses/components/expense-filters";
import { ExpenseTable } from "@/features/expenses/components/expense-table";
import { expenseListUrl as buildExpenseListUrl, parseExpenseFilters } from "@/features/expenses/filters";
import { MonthlyDashboard } from "@/features/dashboard/components/monthly-dashboard";
import { MonthlyDashboardSkeleton, MonthlySummarySkeleton } from "@/features/dashboard/components/dashboard-skeletons";
import { MonthlySummary } from "@/features/dashboard/components/monthly-summary";
import { requireAuthorizedUser } from "@/lib/auth/server";

type SearchParams = Promise<{ month?: string; edit?: string; page?: string; payer?: string; status?: string; settlement?: string }>;

export const dynamic = "force-dynamic";

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

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function decimalValue(value: Prisma.Decimal) {
  return value.toNumber();
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAuthorizedUser();
  const params = await searchParams;
  const month = parseMonth(params.month);
  const filters = parseExpenseFilters(params);
  const page = Math.max(1, Number(params.page) || 1);
  const { start, end } = monthBounds(month);

  await ensureInitialCategories();
  await ensureRecurringExpensesForMonth(month);
  const monthWhere: Prisma.ExpenseWhereInput = { occurredOn: { gte: start, lt: end } };
  const listWhere: Prisma.ExpenseWhereInput = { ...monthWhere, payer: filters.payer, status: filters.status, settlementStatus: filters.settlement };
  const [categories, recurringRules, filteredExpenses, filteredExpenseCount, editExpense] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.recurringRule.findMany({ where: { active: true }, include: { category: true }, orderBy: { description: "asc" } }),
    prisma.expense.findMany({ where: listWhere, include: { category: true }, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }], skip: (page - 1) * expensesPerPage, take: expensesPerPage }),
    prisma.expense.count({ where: listWhere }),
    params.edit ? prisma.expense.findUnique({ where: { id: params.edit } }) : null,
  ]);

  const expenseListUrl = buildExpenseListUrl(month, filters);
  const totalExpensePages = Math.max(1, Math.ceil(filteredExpenseCount / expensesPerPage));

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
        </form><LogoutButton /></div>
      </header>

      <Suspense fallback={<MonthlySummarySkeleton />}>
        <MonthlySummary month={month} />
      </Suspense>
      <Suspense fallback={<MonthlyDashboardSkeleton />}>
        <MonthlyDashboard month={month} />
      </Suspense>

      <section className="grid content-grid">
        <aside className="card" id="expense-form">
          {editExpense && <EditAnchorScroller expenseId={editExpense.id} />}
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
            <PaymentFields defaultPaymentType={editExpense?.paymentType} defaultInstallments={editExpense?.installmentNumber ? 1 : undefined} defaultMonth={editExpense ? editExpense.occurredOn.toISOString().slice(0, 7) : month} editing={Boolean(editExpense)} />
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
          <p className="note">O resumo e o acerto compartilhado são carregados no dashboard acima.</p>
          <ExpenseFiltersForm filters={filters} month={month} />
          {filteredExpenses.length === 0 ? <p className="empty">Nenhuma despesa encontrada com estes filtros.</p> : <ExpenseTable key={`${month}:${page}:${filters.payer ?? ""}:${filters.status ?? ""}:${filters.settlement ?? ""}`} expenses={filteredExpenses.map((expense) => ({ id: expense.id, description: expense.description, occurredOn: expense.occurredOn.toISOString(), categoryName: expense.category.name, payer: expense.payer, sharingType: expense.sharingType, status: expense.status, settlementStatus: expense.settlementStatus, paymentType: expense.paymentType, amount: decimalValue(expense.amount) }))} expenseListUrl={expenseListUrl} month={month} />}
          {totalExpensePages > 1 && <nav className="pagination" aria-label="Paginação de despesas"><span>Página {page} de {totalExpensePages}</span>{page > 1 && <Link className="button secondary" href={`${expenseListUrl}&page=${page - 1}#expenses`}>Anterior</Link>}{page < totalExpensePages && <Link className="button secondary" href={`${expenseListUrl}&page=${page + 1}#expenses`}>Próxima</Link>}</nav>}
        </section>
      </section>

      <section className="management" id="management">
        <div>
          <h2>Despesas recorrentes</h2>
          <p className="note">Cadastre compromissos recorrentes uma vez; as despesas mensais são criadas na lista automaticamente.</p>
        </div>
        <div className="grid management-grid">
          <details className="card"><summary>Adicionar despesa recorrente</summary><form action={createRecurringRule}><input type="hidden" name="month" value={month} /><div className="field"><label htmlFor="recurringDescription">Descrição</label><input id="recurringDescription" name="recurringDescription" required placeholder="Ex.: Aluguel" /></div><div className="two-columns"><div className="field"><label htmlFor="recurringAmount">Valor</label><input id="recurringAmount" name="recurringAmount" type="number" min="0.01" step="0.01" required /></div><div className="field"><label htmlFor="dueDay">Dia do vencimento</label><input id="dueDay" name="dueDay" type="number" min="1" max="31" required defaultValue="1" /></div></div><div className="field"><label htmlFor="recurringCategoryId">Categoria</label><select id="recurringCategoryId" name="recurringCategoryId">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="two-columns"><div className="field"><label htmlFor="recurringPayer">Quem paga</label><select id="recurringPayer" name="recurringPayer"><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div><div className="field"><label htmlFor="recurringSharingType">Natureza</label><select id="recurringSharingType" name="recurringSharingType"><option value="COMPARTILHADA">Compartilhada</option><option value="INDIVIDUAL">Individual</option></select></div></div><div className="field"><label htmlFor="recurringPaymentType">Forma de pagamento</label><select id="recurringPaymentType" name="recurringPaymentType"><option value="DEBITO_PIX">Débito / Pix</option><option value="CREDITO">Crédito</option></select></div><div className="two-columns"><div className="field"><label htmlFor="startsOn">Inicia em</label><input id="startsOn" name="startsOn" type="date" required defaultValue={`${month}-01`} /></div><div className="field"><label htmlFor="endsOn">Termina em</label><input id="endsOn" name="endsOn" type="date" /></div></div><SubmitButton className="button" pendingLabel="Criando recorrência…">Criar recorrência</SubmitButton></form>{recurringRules.length > 0 && <p className="note list-note">Ativas: {recurringRules.map((rule) => rule.description).join(", ")}</p>}</details>
        </div>
      </section>
      </div>
    </main>
  );
}
