import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExpenseMutationScope } from "@/features/expenses/domain/expense-mutations";

async function updatePlanTotal(transaction: Prisma.TransactionClient, installmentPlanId: string) {
  const remaining = await transaction.expense.aggregate({
    where: { deletedAt: null, installmentPlanId },
    _sum: { amount: true },
  });

  if (remaining._sum.amount) {
    await transaction.installmentPlan.update({
      where: { id: installmentPlanId },
      data: { totalAmount: remaining._sum.amount },
    });
  }
}

export async function deleteExpenseRecords(id: string, scope: ExpenseMutationScope) {
  const deletionId = randomUUID();

  return prisma.$transaction(async (transaction) => {
    const expense = await transaction.expense.findFirstOrThrow({
      where: { deletedAt: null, id },
      select: { installmentPlanId: true },
    });

    const where = scope === "INSTALLMENT_PLAN"
      ? { deletedAt: null, installmentPlanId: expense.installmentPlanId ?? "" }
      : { deletedAt: null, id };

    if (scope === "INSTALLMENT_PLAN" && !expense.installmentPlanId) {
      throw new Error("Esta despesa não pertence a um parcelamento.");
    }

    const deleted = await transaction.expense.updateMany({
      where,
      data: { deletedAt: new Date(), deletionId },
    });

    if (deleted.count === 0) throw new Error("A despesa não está mais disponível.");
    if (expense.installmentPlanId) await updatePlanTotal(transaction, expense.installmentPlanId);

    return { deletedCount: deleted.count, deletionId };
  });
}

export async function restoreDeletedExpenseRecords(deletionId: string) {
  return prisma.$transaction(async (transaction) => {
    const deleted = await transaction.expense.findMany({
      where: { deletedAt: { not: null }, deletionId },
      select: { installmentPlanId: true },
    });

    if (deleted.length === 0) throw new Error("A exclusão não está mais disponível para restauração.");

    const restored = await transaction.expense.updateMany({
      where: { deletedAt: { not: null }, deletionId },
      data: { deletedAt: null, deletionId: null },
    });

    const planIds = Array.from(new Set(deleted.flatMap((expense) => expense.installmentPlanId ? [expense.installmentPlanId] : [])));
    for (const planId of planIds) await updatePlanTotal(transaction, planId);

    return { restoredCount: restored.count };
  });
}
