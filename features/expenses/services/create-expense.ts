import { PaymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExpenseInput } from "@/features/expenses/domain/expense-form";
import { buildInstallmentSchedule } from "@/features/expenses/domain/installments";

export async function createExpenseRecords(input: ExpenseInput) {
  const schedule = buildInstallmentSchedule(input.amount, input.totalInstallments, input.firstInstallmentMonth);
  const normalizedTotalAmount = schedule.reduce((total, installment) => total + installment.amount, 0);
  const commonData = {
    categoryId: input.categoryId,
    description: input.description,
    notes: input.notes,
    payer: input.payer,
    paymentType: input.paymentType,
    purchasedOn: input.purchasedOn,
    settlementStatus: input.settlementStatus,
    sharingType: input.sharingType,
    status: input.status,
  };

  if (schedule.length === 1) {
    return prisma.expense.create({
      data: {
        ...commonData,
        amount: schedule[0].amount,
        occurredOn: input.paymentType === PaymentType.CREDITO ? schedule[0].occurredOn : input.purchasedOn,
      },
    });
  }

  if (input.paymentType !== PaymentType.CREDITO) throw new Error("Somente despesas no crédito podem ser parceladas.");

  return prisma.$transaction(async (transaction) => {
    const plan = await transaction.installmentPlan.create({
      data: {
        categoryId: input.categoryId,
        description: input.description,
        firstDueOn: schedule[0].occurredOn,
        installmentAmount: schedule[0].amount,
        payer: input.payer,
        purchasedOn: input.purchasedOn,
        sharingType: input.sharingType,
        status: input.status,
        totalAmount: normalizedTotalAmount,
        totalInstallments: input.totalInstallments,
      },
    });

    await transaction.expense.createMany({
      data: schedule.map((installment) => ({
        ...commonData,
        amount: installment.amount,
        installmentNumber: installment.number,
        installmentPlanId: plan.id,
        occurredOn: installment.occurredOn,
      })),
    });

    return plan;
  });
}
