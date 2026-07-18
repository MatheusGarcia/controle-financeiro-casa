import { PaymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExpenseInput } from "@/features/expenses/domain/expense-form";
import { buildInstallmentSchedule } from "@/features/expenses/domain/installments";

export async function updateExpenseRecord(id: string, input: ExpenseInput) {
  const competence = buildInstallmentSchedule(input.amount, 1, input.firstInstallmentMonth)[0];

  return prisma.$transaction(async (transaction) => {
    const currentExpense = await transaction.expense.findUniqueOrThrow({
      where: { id },
      select: { installmentPlanId: true },
    });

    const updatedExpense = await transaction.expense.update({
      where: { id },
      data: {
        amount: input.amount,
        categoryId: input.categoryId,
        description: input.description,
        notes: input.notes,
        occurredOn: input.paymentType === PaymentType.CREDITO ? competence.occurredOn : input.purchasedOn,
        payer: input.payer,
        paymentType: input.paymentType,
        purchasedOn: input.purchasedOn,
        settlementStatus: input.settlementStatus,
        sharingType: input.sharingType,
        status: input.status,
      },
    });

    if (currentExpense.installmentPlanId) {
      const installments = await transaction.expense.aggregate({
        where: { installmentPlanId: currentExpense.installmentPlanId },
        _sum: { amount: true },
      });

      if (installments._sum.amount) {
        await transaction.installmentPlan.update({
          where: { id: currentExpense.installmentPlanId },
          data: { totalAmount: installments._sum.amount },
        });
      }
    }

    return updatedExpense;
  });
}
