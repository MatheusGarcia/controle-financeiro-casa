import { prisma } from "@/lib/prisma";
import type { ExpenseMutationScope } from "@/features/expenses/domain/expense-mutations";

export async function deleteExpenseRecords(id: string, scope: ExpenseMutationScope) {
  return prisma.$transaction(async (transaction) => {
    const expense = await transaction.expense.findUniqueOrThrow({
      where: { id },
      select: { installmentPlanId: true },
    });

    if (scope === "INSTALLMENT_PLAN") {
      if (!expense.installmentPlanId) throw new Error("Esta despesa não pertence a um parcelamento.");

      const deleted = await transaction.expense.deleteMany({
        where: { installmentPlanId: expense.installmentPlanId },
      });
      await transaction.installmentPlan.delete({ where: { id: expense.installmentPlanId } });
      return { deletedCount: deleted.count };
    }

    await transaction.expense.delete({ where: { id } });

    if (!expense.installmentPlanId) return { deletedCount: 1 };

    const remaining = await transaction.expense.aggregate({
      where: { installmentPlanId: expense.installmentPlanId },
      _count: { _all: true },
      _sum: { amount: true },
    });

    if (remaining._count._all === 0) {
      await transaction.installmentPlan.delete({ where: { id: expense.installmentPlanId } });
    } else if (remaining._sum.amount) {
      await transaction.installmentPlan.update({
        where: { id: expense.installmentPlanId },
        data: { totalAmount: remaining._sum.amount },
      });
    }

    return { deletedCount: 1 };
  });
}
