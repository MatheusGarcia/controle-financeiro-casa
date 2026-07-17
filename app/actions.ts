"use server";

import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardCacheTag } from "@/features/dashboard/data";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

function monthFromDate(value: string) {
  return value.slice(0, 7);
}

function requiredText(formData: FormData, field: string) {
  const value = formData.get(field)?.toString().trim();
  if (!value) throw new Error(`O campo ${field} é obrigatório.`);
  return value;
}

function expenseData(formData: FormData) {
  const description = requiredText(formData, "description");
  const occurredOnValue = requiredText(formData, "occurredOn");
  const amount = Number(formData.get("amount"));
  const categoryId = requiredText(formData, "categoryId");
  const payer = requiredText(formData, "payer");
  const sharingType = requiredText(formData, "sharingType");
  const status = requiredText(formData, "status");
  const settlementStatus = requiredText(formData, "settlementStatus");
  const paymentType = requiredText(formData, "paymentType");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }
  if (!Object.values(Person).includes(payer as Person)) throw new Error("Pagador inválido.");
  if (!Object.values(SharingType).includes(sharingType as SharingType)) throw new Error("Natureza inválida.");
  if (!Object.values(ExpenseStatus).includes(status as ExpenseStatus)) throw new Error("Status inválido.");
  if (!Object.values(SettlementStatus).includes(settlementStatus as SettlementStatus)) throw new Error("Status de divisão inválido.");
  if (paymentType !== PaymentType.DEBITO_PIX && paymentType !== PaymentType.CREDITO) throw new Error("Forma de pagamento inválida.");

  return {
    description,
    amount,
    occurredOn: new Date(`${occurredOnValue}T12:00:00`),
    categoryId,
    paymentType: paymentType as PaymentType,
    payer: payer as Person,
    sharingType: sharingType as SharingType,
    status: status as ExpenseStatus,
    settlementStatus: settlementStatus as SettlementStatus,
    notes: formData.get("notes")?.toString().trim() || null,
  };
}

function optionalDate(formData: FormData, field: string) {
  const value = formData.get(field)?.toString();
  return value ? new Date(`${value}T12:00:00`) : null;
}

export async function createExpense(formData: FormData) {
  await requireAuthorizedUser();
  const data = expenseData(formData);
  const occurredOnValue = requiredText(formData, "occurredOn");
  const totalInstallments = data.paymentType === PaymentType.CREDITO ? Number(formData.get("totalInstallments")) : 1;
  const firstInstallmentMonth = data.paymentType === PaymentType.CREDITO ? requiredText(formData, "firstInstallmentMonth") : monthFromDate(occurredOnValue);

  if (!Number.isInteger(totalInstallments) || totalInstallments < 1 || totalInstallments > 120) throw new Error("Informe entre 1 e 120 parcelas.");
  if (!/^\d{4}-\d{2}$/.test(firstInstallmentMonth)) throw new Error("Mês da primeira parcela inválido.");

  if (totalInstallments === 1) {
    await prisma.expense.create({
      data: { ...data, occurredOn: data.paymentType === PaymentType.CREDITO ? new Date(`${firstInstallmentMonth}-01T12:00:00`) : data.occurredOn },
    });
  } else {
    const totalCents = Math.round(Number(data.amount) * 100);
    const baseInstallmentCents = Math.floor(totalCents / totalInstallments);
    if (baseInstallmentCents < 1) throw new Error("O valor total é insuficiente para o número de parcelas.");
    const [year, month] = firstInstallmentMonth.split("-").map(Number);
    const firstDueOn = new Date(year, month - 1, 1, 12);

    await prisma.$transaction(async (transaction) => {
      const plan = await transaction.installmentPlan.create({
        data: {
          description: data.description,
          installmentAmount: baseInstallmentCents / 100,
          totalInstallments,
          firstDueOn,
          payer: data.payer,
          sharingType: data.sharingType,
          status: data.status,
          categoryId: data.categoryId,
        },
      });
      await transaction.expense.createMany({
        data: Array.from({ length: totalInstallments }, (_, index) => ({
          ...data,
          description: `${data.description} (${index + 1}/${totalInstallments})`,
          amount: (baseInstallmentCents + (index === totalInstallments - 1 ? totalCents % totalInstallments : 0)) / 100,
          occurredOn: new Date(year, month - 1 + index, 1, 12),
          installmentPlanId: plan.id,
          installmentNumber: index + 1,
        })),
      });
    });
  }
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${firstInstallmentMonth}`);
}

export async function updateExpense(formData: FormData) {
  await requireAuthorizedUser();
  const id = requiredText(formData, "id");
  const data = expenseData(formData);
  if (data.paymentType === PaymentType.CREDITO) {
    const installmentMonth = requiredText(formData, "firstInstallmentMonth");
    if (!/^\d{4}-\d{2}$/.test(installmentMonth)) throw new Error("Mês da parcela inválido.");
    data.occurredOn = new Date(`${installmentMonth}-01T12:00:00`);
  }
  await prisma.expense.update({ where: { id }, data });
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${monthFromDate(data.occurredOn.toISOString())}`);
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

export async function createInstallmentPlan(formData: FormData) {
  await requireAuthorizedUser();
  const month = requiredText(formData, "month");
  const description = requiredText(formData, "installmentDescription");
  const installmentAmount = Number(formData.get("installmentAmount"));
  const totalInstallments = Number(formData.get("totalInstallments"));
  const firstDueOn = optionalDate(formData, "firstDueOn");
  const categoryId = requiredText(formData, "installmentCategoryId");
  const payer = requiredText(formData, "installmentPayer") as Person;
  const sharingType = requiredText(formData, "installmentSharingType") as SharingType;

  if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) throw new Error("O valor da parcela deve ser maior que zero.");
  if (!Number.isInteger(totalInstallments) || totalInstallments < 2 || totalInstallments > 120) throw new Error("Informe entre 2 e 120 parcelas.");
  if (!firstDueOn) throw new Error("A data da primeira parcela é obrigatória.");
  if (!Object.values(Person).includes(payer)) throw new Error("Pagador inválido.");
  if (!Object.values(SharingType).includes(sharingType)) throw new Error("Natureza inválida.");

  const plan = await prisma.installmentPlan.create({
    data: {
      description,
      installmentAmount,
      totalInstallments,
      firstDueOn,
      payer,
      sharingType,
      categoryId,
      paymentMethodId: formData.get("installmentPaymentMethodId")?.toString() || null,
    },
  });

  await prisma.expense.createMany({
    data: Array.from({ length: totalInstallments }, (_, index) => {
      const dueDate = new Date(firstDueOn.getFullYear(), firstDueOn.getMonth() + index, firstDueOn.getDate(), 12);
      return {
        description: `${description} (${index + 1}/${totalInstallments})`,
        amount: installmentAmount,
        occurredOn: dueDate,
        payer,
        sharingType,
        status: ExpenseStatus.PENDENTE,
        settlementStatus: SettlementStatus.PENDENTE_DIVISAO,
        categoryId,
        paymentMethodId: formData.get("installmentPaymentMethodId")?.toString() || null,
        installmentPlanId: plan.id,
        installmentNumber: index + 1,
      };
    }),
  });

  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${month}`);
}
