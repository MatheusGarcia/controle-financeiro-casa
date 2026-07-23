import Link from "next/link";
import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { undoDeleteExpense } from "@/app/actions";
import { ensureInitialCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { ensureRecurringExpensesForMonth } from "@/lib/recurring-expenses";
import { SideNavigation } from "@/app/components/side-navigation";
import { SubmitButton } from "@/app/components/submit-button";
import { LogoutButton } from "@/app/components/logout-button";
import { EditAnchorScroller } from "@/app/components/edit-anchor-scroller";
import { ExpenseForm } from "@/features/expenses/components/expense-form";
import { ExpenseFiltersForm } from "@/features/expenses/components/expense-filters";
import { ExpenseTable } from "@/features/expenses/components/expense-table";
import { expenseListUrl as buildExpenseListUrl, hasExpenseFilters, parseExpenseFilters } from "@/features/expenses/filters";
import { MonthlyDashboard } from "@/features/dashboard/components/monthly-dashboard";
import { MonthlyDashboardSkeleton, MonthlySummarySkeleton } from "@/features/dashboard/components/dashboard-skeletons";
import { MonthlySummary } from "@/features/dashboard/components/monthly-summary";
import { RecurringRuleManager } from "@/features/recurring/components/recurring-rule-manager";
import { nextRecurringOccurrence, recurringRuleStatus } from "@/features/recurring/domain/recurring-rule";
import { requireAuthorizedUser } from "@/lib/auth/server";

type SearchParams = Promise<{ category?: string; edit?: string; month?: string; notice?: string; page?: string; payer?: string; payment?: string; q?: string; settlement?: string; status?: string; undo?: string }>;

export const dynamic = "force-dynamic";

const expensesPerPage = 20;
const noticeMessages: Record<string, string> = {
  created: "Despesa adicionada com sucesso.",
  "delete-error": "Não foi possível excluir a despesa. Verifique sua conexão e tente novamente.",
  "delete-missing": "A despesa já havia sido removida ou não está mais disponível.",
  deleted: "Despesa excluída com sucesso.",
  restored: "Despesa restaurada com sucesso.",
  "restore-error": "Não foi possível restaurar a despesa. A ação pode não estar mais disponível.",
  "recurring-created": "Recorrência criada com sucesso.",
  "recurring-deleted": "Regra excluída; as despesas existentes foram preservadas.",
  "recurring-ended": "Recorrência encerrada a partir do mês selecionado.",
  "recurring-error": "Não foi possível concluir a operação na recorrência. Atualize a página e tente novamente.",
  "recurring-future-deleted": "Recorrência encerrada e lançamentos deste mês em diante removidos.",
  "recurring-month-deleted": "Despesa recorrente do mês excluída.",
  "recurring-paused": "Recorrência pausada. Nenhum novo lançamento será gerado.",
  "recurring-reactivated": "Recorrência reativada com sucesso.",
  "recurring-updated": "Regra de recorrência atualizada; o histórico foi preservado.",
  updated: "Alterações salvas com sucesso.",
};

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
  const monthWhere: Prisma.ExpenseWhereInput = { deletedAt: null, occurredOn: { gte: start, lt: end } };
  const listWhere: Prisma.ExpenseWhereInput = {
    ...monthWhere,
    categoryId: filters.categoryId,
    description: filters.query ? { contains: filters.query, mode: "insensitive" } : undefined,
    payer: filters.payer,
    paymentType: filters.paymentType,
    settlementStatus: filters.settlement,
    status: filters.status,
  };
  const [categories, recurringRules, filteredExpenses, filteredExpenseCount, monthExpenseCount, editExpense] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.recurringRule.findMany({ include: { category: true, expenses: { where: { occurredOn: { gte: start } }, select: { deletedAt: true, occurredOn: true }, orderBy: { occurredOn: "asc" } } }, orderBy: { description: "asc" } }),
    prisma.expense.findMany({ where: listWhere, include: { category: true, installmentPlan: { select: { totalInstallments: true } } }, orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }], skip: (page - 1) * expensesPerPage, take: expensesPerPage }),
    prisma.expense.count({ where: listWhere }),
    prisma.expense.count({ where: monthWhere }),
    params.edit ? prisma.expense.findFirst({ where: { deletedAt: null, id: params.edit }, include: { installmentPlan: { select: { totalInstallments: true } } } }) : null,
  ]);

  const expenseListUrl = buildExpenseListUrl(month, filters, page);
  const expenseReturnUrl = `${expenseListUrl}#expenses`;
  const totalExpensePages = Math.max(1, Math.ceil(filteredExpenseCount / expensesPerPage));
  const noticeMessage = params.notice ? noticeMessages[params.notice] : undefined;
  const errorNotice = params.notice === "delete-error" || params.notice === "delete-missing" || params.notice === "restore-error" || params.notice === "recurring-error";
  const undoAvailable = (params.notice === "deleted" || params.notice === "recurring-month-deleted") && params.undo;

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

      {noticeMessage && (
        <div aria-atomic="true" aria-live={errorNotice ? "assertive" : "polite"} className={`operation-feedback ${errorNotice ? "error" : "success"}`} role={errorNotice ? "alert" : "status"}>
          {noticeMessage}
          {undoAvailable && <form action={undoDeleteExpense}>
            <input type="hidden" name="deletionId" value={undoAvailable} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="returnTo" value={expenseReturnUrl} />
            <SubmitButton className="inline-action" pendingLabel="Restaurando…">Desfazer</SubmitButton>
          </form>}
        </div>
      )}

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
          <p className="note">Informe os dados da compra; os campos se ajustam à forma de pagamento e à natureza escolhidas.</p>
          <ExpenseForm
            categories={categories.map(({ id, name }) => ({ id, name }))}
            expense={editExpense ? {
              amount: decimalValue(editExpense.amount), categoryId: editExpense.categoryId, description: editExpense.description, id: editExpense.id,
              installmentNumber: editExpense.installmentNumber, notes: editExpense.notes, occurredMonth: editExpense.occurredOn.toISOString().slice(0, 7),
              payer: editExpense.payer, paymentType: editExpense.paymentType, purchasedOn: dateInputValue(editExpense.purchasedOn), settlementStatus: editExpense.settlementStatus,
              sharingType: editExpense.sharingType, status: editExpense.status, totalInstallments: editExpense.installmentPlan?.totalInstallments ?? null,
              updatedAt: editExpense.updatedAt.toISOString(),
            } : undefined}
            expenseListUrl={expenseReturnUrl}
            key={editExpense ? `${editExpense.id}-${editExpense.updatedAt.toISOString()}` : "new-expense"}
            month={month}
          />
        </aside>

        <section className="card" id="expenses">
          <h2>Despesas de {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start)}</h2>
          <p className="note">O resumo e o acerto compartilhado são carregados no dashboard acima.</p>
          <ExpenseFiltersForm categories={categories.map(({ id, name }) => ({ id, name }))} filters={filters} month={month} resultCount={filteredExpenseCount} />
          {filteredExpenses.length === 0 ? monthExpenseCount === 0 ? <div className="empty-state"><h3>Nenhuma despesa neste mês</h3><p>Adicione a primeira despesa para começar a acompanhar os totais e o acerto da casa.</p><Link className="button" href="#expense-form">Adicionar primeira despesa</Link></div> : hasExpenseFilters(filters) ? <div className="empty-state"><h3>Nenhum resultado encontrado</h3><p>As despesas deste mês não correspondem à busca e aos filtros selecionados.</p><Link className="button secondary" href={`/?month=${month}#expenses`}>Remover filtros</Link></div> : <p className="empty">Nenhuma despesa disponível nesta página.</p> : <ExpenseTable key={`${month}:${page}:${filters.query ?? ""}:${filters.categoryId ?? ""}:${filters.paymentType ?? ""}:${filters.payer ?? ""}:${filters.status ?? ""}:${filters.settlement ?? ""}`} expenses={filteredExpenses.map((expense) => ({ id: expense.id, description: expense.description, occurredOn: expense.occurredOn.toISOString(), categoryName: expense.category.name, payer: expense.payer, sharingType: expense.sharingType, status: expense.status, settlementStatus: expense.settlementStatus, paymentType: expense.paymentType, installmentNumber: expense.installmentNumber, totalInstallments: expense.installmentPlan?.totalInstallments ?? null, amount: decimalValue(expense.amount) }))} expenseListUrl={expenseListUrl} month={month} />}
          {totalExpensePages > 1 && <nav className="pagination" aria-label="Paginação de despesas"><span>Página {page} de {totalExpensePages}</span>{page > 1 && <Link className="button secondary" href={`${buildExpenseListUrl(month, filters, page - 1)}#expenses`}>Anterior</Link>}{page < totalExpensePages && <Link className="button secondary" href={`${buildExpenseListUrl(month, filters, page + 1)}#expenses`}>Próxima</Link>}</nav>}
        </section>
      </section>

      <section className="management" id="management">
        <div>
          <h2>Despesas recorrentes</h2>
          <p className="note">Cadastre compromissos recorrentes uma vez; as despesas mensais são criadas na lista automaticamente.</p>
        </div>
        <RecurringRuleManager
          categories={categories.map(({ id, name }) => ({ id, name }))}
          month={month}
          rules={recurringRules.map((rule) => ({
            active: rule.active,
            amount: decimalValue(rule.amount),
            categoryId: rule.categoryId,
            categoryName: rule.category.name,
            description: rule.description,
            dueDay: rule.dueDay,
            endsOn: rule.endsOn?.toISOString().slice(0, 10) ?? null,
            hasCurrentExpense: rule.expenses.some((expense) => !expense.deletedAt && expense.occurredOn >= start && expense.occurredOn < end),
            id: rule.id,
            nextOccurrence: nextRecurringOccurrence(rule, month, rule.expenses.map((expense) => expense.occurredOn))?.toISOString() ?? null,
            payer: rule.payer,
            paymentType: rule.paymentType,
            sharingType: rule.sharingType,
            startsOn: rule.startsOn.toISOString().slice(0, 10),
            status: recurringRuleStatus(rule, month),
            updatedAt: rule.updatedAt.toISOString(),
          }))}
        />
      </section>
      <a className="quick-expense-action" href={params.edit ? `${buildExpenseListUrl(month, filters)}#expense-form` : "#expense-form"}>+ Nova despesa</a>
      </div>
    </main>
  );
}
