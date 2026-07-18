import { PaymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExpenseInput } from "../domain/expense-form";
import type { ExpenseMutationScope } from "../domain/expense-mutations";
import { buildInstallmentSchedule } from "../domain/installments";

function monthAtOffset(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1 + offset, 1, 12);
}

export async function updateExpenseRecord(id: string, input: ExpenseInput, scope: ExpenseMutationScope = "CURRENT") {
  const competence = buildInstallmentSchedule(input.amount, 1, input.firstInstallmentMonth)[0];

  return prisma.$transaction(async (transaction) => {
    const currentExpense = await transaction.expense.findUniqueOrThrow({
      where: { id },
      select: { installmentNumber: true, installmentPlanId: true },
    });

    if (currentExpense.installmentPlanId && input.paymentType !== PaymentType.CREDITO) {
      throw new Error("Uma parcela deve permanecer com a forma de pagamento Crédito.");
    }

    if (scope === "INSTALLMENT_PLAN") {
      if (!currentExpense.installmentPlanId || !currentExpense.installmentNumber) {
        throw new Error("Esta despesa não pertence a um parcelamento.");
      }

      const installments = await transaction.expense.findMany({
        where: { installmentPlanId: currentExpense.installmentPlanId },
        select: { id: true, installmentNumber: true },
        orderBy: { installmentNumber: "asc" },
      });

      for (const installment of installments) {
        if (!installment.installmentNumber) throw new Error("O parcelamento possui uma parcela inválida.");
        await transaction.expense.update({
          where: { id: installment.id },
          data: {
            amount: input.amount,
            categoryId: input.categoryId,
            description: input.description,
            notes: input.notes,
            occurredOn: monthAtOffset(input.firstInstallmentMonth, installment.installmentNumber - currentExpense.installmentNumber),
            payer: input.payer,
            paymentType: PaymentType.CREDITO,
            purchasedOn: input.purchasedOn,
            settlementStatus: input.settlementStatus,
            sharingType: input.sharingType,
            status: input.status,
          },
        });
      }

      const firstDueOn = monthAtOffset(input.firstInstallmentMonth, 1 - currentExpense.installmentNumber);
      await transaction.installmentPlan.update({
        where: { id: currentExpense.installmentPlanId },
        data: {
          categoryId: input.categoryId,
          description: input.description,
          firstDueOn,
          installmentAmount: input.amount,
          payer: input.payer,
          purchasedOn: input.purchasedOn,
          sharingType: input.sharingType,
          status: input.status,
          totalAmount: input.amount * installments.length,
        },
      });

      return transaction.expense.findUniqueOrThrow({ where: { id } });
    }

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
