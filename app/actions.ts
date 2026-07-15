"use server";

import { ExpenseStatus, PaymentMethodType, Person, SettlementStatus, SharingType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }
  if (!Object.values(Person).includes(payer as Person)) throw new Error("Pagador inválido.");
  if (!Object.values(SharingType).includes(sharingType as SharingType)) throw new Error("Natureza inválida.");
  if (!Object.values(ExpenseStatus).includes(status as ExpenseStatus)) throw new Error("Status inválido.");
  if (!Object.values(SettlementStatus).includes(settlementStatus as SettlementStatus)) throw new Error("Status de divisão inválido.");

  return {
    description,
    amount,
    occurredOn: new Date(`${occurredOnValue}T12:00:00`),
    categoryId,
    paymentMethodId: formData.get("paymentMethodId")?.toString() || null,
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
  const data = expenseData(formData);
  await prisma.expense.create({ data });
  revalidatePath("/");
  redirect(`/?month=${monthFromDate(formData.get("occurredOn")!.toString())}`);
}

export async function updateExpense(formData: FormData) {
  const id = requiredText(formData, "id");
  const data = expenseData(formData);
  await prisma.expense.update({ where: { id }, data });
  revalidatePath("/");
  redirect(`/?month=${monthFromDate(formData.get("occurredOn")!.toString())}`);
}

export async function deleteExpense(formData: FormData) {
  const id = requiredText(formData, "id");
  const month = requiredText(formData, "month");
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/");
  redirect(`/?month=${month}`);
}

export async function createPaymentMethod(formData: FormData) {
  const name = requiredText(formData, "methodName");
  const type = requiredText(formData, "methodType");
  const month = requiredText(formData, "month");
  const ownerValue = formData.get("methodOwner")?.toString() || null;

  if (!Object.values(PaymentMethodType).includes(type as PaymentMethodType)) throw new Error("Tipo de pagamento inválido.");
  if (ownerValue && !Object.values(Person).includes(ownerValue as Person)) throw new Error("Titular inválido.");

  await prisma.paymentMethod.create({
    data: { name, type: type as PaymentMethodType, owner: ownerValue as Person | null },
  });
  revalidatePath("/");
  redirect(`/?month=${month}`);
}

export async function createRecurringRule(formData: FormData) {
  const month = requiredText(formData, "month");
  const description = requiredText(formData, "recurringDescription");
  const amount = Number(formData.get("recurringAmount"));
  const dueDay = Number(formData.get("dueDay"));
  const categoryId = requiredText(formData, "recurringCategoryId");
  const payer = requiredText(formData, "recurringPayer") as Person;
  const sharingType = requiredText(formData, "recurringSharingType") as SharingType;
  const startsOn = optionalDate(formData, "startsOn");

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("O valor deve ser maior que zero.");
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) throw new Error("O dia de vencimento deve estar entre 1 e 31.");
  if (!startsOn) throw new Error("A data inicial é obrigatória.");
  if (!Object.values(Person).includes(payer)) throw new Error("Pagador inválido.");
  if (!Object.values(SharingType).includes(sharingType)) throw new Error("Natureza inválida.");

  await prisma.recurringRule.create({
    data: {
      description,
      amount,
      dueDay,
      payer,
      sharingType,
      startsOn,
      endsOn: optionalDate(formData, "endsOn"),
      categoryId,
      paymentMethodId: formData.get("recurringPaymentMethodId")?.toString() || null,
    },
  });
  revalidatePath("/");
  redirect(`/?month=${month}`);
}

export async function createInstallmentPlan(formData: FormData) {
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

  revalidatePath("/");
  redirect(`/?month=${month}`);
}
