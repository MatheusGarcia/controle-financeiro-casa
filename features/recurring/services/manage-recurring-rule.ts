import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { RecurringRuleConflictError } from "../domain/recurring-errors";
import { monthStart, nextMonth, previousMonthEnd, type RecurringRuleInput } from "../domain/recurring-rule";

export type RecurringDeletionScope = "CURRENT_MONTH" | "FROM_CURRENT" | "RULE_ONLY";

export async function saveRecurringRule(input: RecurringRuleInput, id?: string, expectedUpdatedAt?: Date) {
  if (!id) return prisma.recurringRule.create({ data: input });
  if (!expectedUpdatedAt) throw new RecurringRuleConflictError();

  const updated = await prisma.recurringRule.updateMany({
    where: { id, updatedAt: expectedUpdatedAt },
    data: input,
  });
  if (updated.count === 0) throw new RecurringRuleConflictError();
  return prisma.recurringRule.findUniqueOrThrow({ where: { id } });
}

export async function setRecurringRuleActive(id: string, active: boolean, expectedUpdatedAt: Date, referenceMonth: string) {
  const rule = await prisma.recurringRule.findUniqueOrThrow({ where: { id }, select: { endsOn: true, updatedAt: true } });
  if (rule.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new RecurringRuleConflictError();
  if (active && rule.endsOn && rule.endsOn < monthStart(referenceMonth)) {
    throw new Error("Uma recorrência encerrada não pode ser reativada. Edite a data final para reabri-la.");
  }

  const updated = await prisma.recurringRule.updateMany({ where: { id, updatedAt: expectedUpdatedAt }, data: { active } });
  if (updated.count === 0) throw new RecurringRuleConflictError();
}

export async function endRecurringRule(id: string, effectiveMonth: string, expectedUpdatedAt: Date) {
  const endDate = previousMonthEnd(effectiveMonth);
  const current = new Date();
  const currentMonth = new Date(current.getFullYear(), current.getMonth(), 1, 12);
  const deactivateNow = monthStart(effectiveMonth) <= currentMonth;
  const updated = await prisma.recurringRule.updateMany({
    where: { id, updatedAt: expectedUpdatedAt },
    data: { active: deactivateNow ? false : undefined, endsOn: endDate },
  });
  if (updated.count === 0) throw new RecurringRuleConflictError();
}

export async function deleteRecurringRuleByScope(
  id: string,
  scope: RecurringDeletionScope,
  effectiveMonth: string,
  expectedUpdatedAt: Date,
) {
  const start = monthStart(effectiveMonth);
  const end = nextMonth(start);
  const deletionId = randomUUID();

  return prisma.$transaction(async (transaction) => {
    const rule = await transaction.recurringRule.findUniqueOrThrow({
      where: { id },
      select: { updatedAt: true },
    });
    if (rule.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new RecurringRuleConflictError();

    if (scope === "CURRENT_MONTH") {
      const deleted = await transaction.expense.updateMany({
        where: { deletedAt: null, occurredOn: { gte: start, lt: end }, recurringRuleId: id },
        data: { deletedAt: new Date(), deletionId },
      });
      if (deleted.count === 0) throw new Error("Não existe uma despesa gerada por esta recorrência no mês selecionado.");
      return { affectedExpenses: deleted.count, deletionId };
    }

    if (scope === "FROM_CURRENT") {
      const deleted = await transaction.expense.updateMany({
        where: { deletedAt: null, occurredOn: { gte: start }, recurringRuleId: id },
        data: { deletedAt: new Date(), deletionId },
      });
      const now = new Date();
      const deactivateNow = start <= new Date(now.getFullYear(), now.getMonth(), 1, 12);
      const updated = await transaction.recurringRule.updateMany({
        where: { id, updatedAt: expectedUpdatedAt },
        data: { active: deactivateNow ? false : undefined, endsOn: previousMonthEnd(effectiveMonth) },
      });
      if (updated.count === 0) throw new RecurringRuleConflictError();
      return { affectedExpenses: deleted.count, deletionId: null };
    }

    await transaction.expense.updateMany({
      where: { recurringRuleId: id },
      data: { recurringRuleId: null },
    });
    const deleted = await transaction.recurringRule.deleteMany({ where: { id, updatedAt: expectedUpdatedAt } });
    if (deleted.count === 0) throw new RecurringRuleConflictError();
    return { affectedExpenses: 0, deletionId: null };
  });
}
