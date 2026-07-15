import { ExpenseStatus, SettlementStatus } from "@prisma/client";
import { observe } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1, 12),
    end: new Date(year, monthNumber, 1, 12),
  };
}

function dueDate(month: string, dueDay: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return new Date(year, monthNumber - 1, Math.min(dueDay, lastDay), 12);
}

export async function ensureRecurringExpensesForMonth(month: string) {
  const { start, end } = monthBounds(month);
  const rules = await prisma.recurringRule.findMany({
    where: {
      active: true,
      startsOn: { lt: end },
      OR: [{ endsOn: null }, { endsOn: { gte: start } }],
      expenses: { none: { occurredOn: { gte: start, lt: end } } },
    },
  });

  if (rules.length === 0) return 0;

  const result = await observe("recurring_expense_generation", () => prisma.expense.createMany({
    data: rules.map((rule) => ({
      description: rule.description,
      amount: rule.amount,
      occurredOn: dueDate(month, rule.dueDay),
      payer: rule.payer,
      sharingType: rule.sharingType,
      status: ExpenseStatus.PENDENTE,
      settlementStatus: SettlementStatus.PENDENTE_DIVISAO,
      categoryId: rule.categoryId,
      paymentMethodId: rule.paymentMethodId,
      recurringRuleId: rule.id,
    })),
    skipDuplicates: true,
  }));

  return result.count;
}
