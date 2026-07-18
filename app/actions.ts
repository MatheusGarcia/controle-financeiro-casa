"use server";

import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardCacheTag } from "@/features/dashboard/data";
import { parseExpenseForm } from "@/features/expenses/domain/expense-form";
import { monthKey } from "@/features/expenses/domain/installments";
import { createExpenseRecords } from "@/features/expenses/services/create-expense";
import { updateExpenseRecord } from "@/features/expenses/services/update-expense";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

function requiredText(formData: FormData, field: string) {
  const value = formData.get(field)?.toString().trim();
  if (!value) throw new Error(`O campo ${field} é obrigatório.`);
  return value;
}

function optionalDate(formData: FormData, field: string) {
  const value = formData.get(field)?.toString();
  return value ? new Date(`${value}T12:00:00`) : null;
}

export async function createExpense(formData: FormData) {
  await requireAuthorizedUser();
  const input = parseExpenseForm(formData);
  await createExpenseRecords(input);
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${input.firstInstallmentMonth}`);
}

export async function updateExpense(formData: FormData) {
  await requireAuthorizedUser();
  const id = requiredText(formData, "id");
  const input = parseExpenseForm(formData);
  const updated = await updateExpenseRecord(id, input);
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${monthKey(updated.occurredOn)}`);
}

export async function deleteExpense(formData: FormData) {
  await requireAuthorizedUser();
  const id = requiredText(formData, "id");
  const month = requiredText(formData, "month");
  await prisma.expense.delete({ where: { id } });
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${month}`);
}

export async function bulkUpdateExpenses(input: { ids: string[]; status?: string; settlementStatus?: string }) {
  await requireAuthorizedUser();
  const ids = Array.from(new Set(Array.isArray(input.ids) ? input.ids.filter((id) => typeof id === "string" && id.length > 0) : []));
  const status = input.status as ExpenseStatus | undefined;
  const settlementStatus = input.settlementStatus as SettlementStatus | undefined;

  if (ids.length === 0) throw new Error("Selecione ao menos uma despesa.");
  if (ids.length > 20) throw new Error("A edição em massa está limitada às 20 despesas da página atual.");
  if (status && !Object.values(ExpenseStatus).includes(status)) throw new Error("Status inválido.");
  if (settlementStatus && !Object.values(SettlementStatus).includes(settlementStatus)) throw new Error("Status de divisão inválido.");
  if (!status && !settlementStatus) throw new Error("Escolha ao menos um campo para alterar.");

  const result = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.expense.findMany({ where: { id: { in: ids } }, select: { id: true, sharingType: true } });
    if (existing.length !== ids.length) throw new Error("Uma ou mais despesas não estão mais disponíveis. Atualize a página e tente novamente.");

    if (status) await transaction.expense.updateMany({ where: { id: { in: ids } }, data: { status } });
    const sharedIds = existing.filter((expense) => expense.sharingType === SharingType.COMPARTILHADA).map((expense) => expense.id);
    if (settlementStatus && sharedIds.length > 0) {
      await transaction.expense.updateMany({ where: { id: { in: sharedIds } }, data: { settlementStatus } });
    }

    return { updatedCount: existing.length, skippedDivisionCount: settlementStatus ? existing.length - sharedIds.length : 0 };
  });

  updateTag(dashboardCacheTag);
  revalidatePath("/");
  return result;
}

export async function createRecurringRule(formData: FormData) {
  await requireAuthorizedUser();
  const month = requiredText(formData, "month");
  const description = requiredText(formData, "recurringDescription");
  const amount = Number(formData.get("recurringAmount"));
  const dueDay = Number(formData.get("dueDay"));
  const categoryId = requiredText(formData, "recurringCategoryId");
  const payer = requiredText(formData, "recurringPayer") as Person;
  const sharingType = requiredText(formData, "recurringSharingType") as SharingType;
  const paymentType = requiredText(formData, "recurringPaymentType") as PaymentType;
  const startsOn = optionalDate(formData, "startsOn");

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("O valor deve ser maior que zero.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("O dia de vencimento deve estar entre 1 e 31.");
  if (!startsOn) throw new Error("A data inicial é obrigatória.");
  if (!Object.values(Person).includes(payer)) throw new Error("Pagador inválido.");
  if (!Object.values(SharingType).includes(sharingType)) throw new Error("Natureza inválida.");
  if (paymentType !== PaymentType.DEBITO_PIX && paymentType !== PaymentType.CREDITO) throw new Error("Forma de pagamento inválida.");

  await prisma.recurringRule.create({
    data: {
      description,
      amount,
      dueDay,
      payer,
      sharingType,
      paymentType,
      startsOn,
      endsOn: optionalDate(formData, "endsOn"),
      categoryId,
      paymentMethodId: formData.get("recurringPaymentMethodId")?.toString() || null,
    },
  });
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${month}`);
}
