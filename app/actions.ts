"use server";

import { ExpenseStatus, Prisma, SettlementStatus, SharingType } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardCacheTag } from "@/features/dashboard/data";
import type { ExpenseActionState } from "@/features/expenses/domain/expense-action-state";
import { ExpenseConflictError } from "@/features/expenses/domain/expense-errors";
import { ExpenseFormError, parseExpenseForm } from "@/features/expenses/domain/expense-form";
import { parseExpenseMutationScope } from "@/features/expenses/domain/expense-mutations";
import { monthKey } from "@/features/expenses/domain/installments";
import { createExpenseRecords } from "@/features/expenses/services/create-expense";
import { deleteExpenseRecords, restoreDeletedExpenseRecords } from "@/features/expenses/services/delete-expense";
import { updateExpenseRecord } from "@/features/expenses/services/update-expense";
import type { RecurringActionState } from "@/features/recurring/domain/recurring-action-state";
import { RecurringRuleConflictError } from "@/features/recurring/domain/recurring-errors";
import { parseRecurringRuleForm, RecurringRuleFormError } from "@/features/recurring/domain/recurring-rule";
import { deleteRecurringRuleByScope, endRecurringRule, saveRecurringRule, setRecurringRuleActive, type RecurringDeletionScope } from "@/features/recurring/services/manage-recurring-rule";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

function requiredText(formData: FormData, field: string) {
  const value = formData.get(field)?.toString().trim();
  if (!value) throw new Error(`O campo ${field} é obrigatório.`);
  return value;
}

function expenseFormValues(formData: FormData) {
  return Object.fromEntries(Array.from(formData.entries()).flatMap(([field, value]) => typeof value === "string" ? [[field, value]] : []));
}

function expenseActionError(error: unknown, formData: FormData, previousState: ExpenseActionState): ExpenseActionState {
  const sharedState = { revision: previousState.revision + 1, values: expenseFormValues(formData) };
  if (error instanceof ExpenseFormError) {
    return {
      fieldErrors: { [error.field]: error.message },
      message: "Revise o campo destacado e tente novamente.",
      ...sharedState,
      status: "error",
    };
  }
  if (error instanceof ExpenseConflictError) {
    return {
      conflict: true,
      fieldErrors: {},
      message: "Esta despesa foi alterada em outra tela. Recarregue os dados atuais antes de tentar novamente.",
      ...sharedState,
      status: "error",
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return {
      fieldErrors: {},
      message: "A despesa não está mais disponível. Atualize a página e tente novamente.",
      ...sharedState,
      status: "error",
    };
  }
  console.error("Expense action failed", error instanceof Error ? { name: error.name } : { type: typeof error });
  return {
    fieldErrors: {},
    message: "Não foi possível salvar a despesa. Verifique sua conexão e tente novamente.",
    ...sharedState,
    status: "error",
  };
}

function pathWithNotice(path: string, notice: string) {
  const url = new URL(path, "http://local");
  url.searchParams.delete("edit");
  url.searchParams.set("notice", notice);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function safeReturnPath(formData: FormData) {
  const value = formData.get("returnTo")?.toString();
  return value?.startsWith("/?") && !value.startsWith("//") ? value : null;
}

export async function createExpense(previousState: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  await requireAuthorizedUser();
  let input: ReturnType<typeof parseExpenseForm>;
  try {
    input = parseExpenseForm(formData);
    await createExpenseRecords(input);
  } catch (error) {
    return expenseActionError(error, formData, previousState);
  }
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(`/?month=${input.firstInstallmentMonth}&notice=created`);
}

export async function updateExpense(previousState: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  await requireAuthorizedUser();
  let updated: Awaited<ReturnType<typeof updateExpenseRecord>>;
  try {
    const id = requiredText(formData, "id");
    const input = parseExpenseForm(formData);
    const expectedUpdatedAt = new Date(requiredText(formData, "expectedUpdatedAt"));
    if (Number.isNaN(expectedUpdatedAt.getTime())) throw new Error("A versão da despesa é inválida.");
    const scope = parseExpenseMutationScope(formData.get("mutationScope"));
    updated = await updateExpenseRecord(id, input, expectedUpdatedAt, scope);
  } catch (error) {
    return expenseActionError(error, formData, previousState);
  }
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  const returnTo = safeReturnPath(formData) ?? `/?month=${monthKey(updated.occurredOn)}`;
  redirect(pathWithNotice(returnTo, "updated"));
}

export async function deleteExpense(formData: FormData) {
  await requireAuthorizedUser();
  const id = requiredText(formData, "id");
  const month = requiredText(formData, "month");
  const scope = parseExpenseMutationScope(formData.get("mutationScope"));
  let notice = "deleted";
  let deletionId: string | null = null;
  try {
    const result = await deleteExpenseRecords(id, scope);
    deletionId = result.deletionId;
    updateTag(dashboardCacheTag);
    revalidatePath("/");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      notice = "delete-missing";
    } else {
      console.error("Expense deletion failed", error instanceof Error ? { name: error.name } : { type: typeof error });
      notice = "delete-error";
    }
  }
  const undo = deletionId ? `&undo=${encodeURIComponent(deletionId)}` : "";
  redirect(`/?month=${month}&notice=${notice}${undo}`);
}

export async function undoDeleteExpense(formData: FormData) {
  await requireAuthorizedUser();
  const month = requiredText(formData, "month");
  const deletionId = requiredText(formData, "deletionId");
  let notice = "restored";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deletionId)) {
    notice = "restore-error";
  } else {
    try {
      await restoreDeletedExpenseRecords(deletionId);
      updateTag(dashboardCacheTag);
      revalidatePath("/");
    } catch (error) {
      console.error("Expense restoration failed", error instanceof Error ? { name: error.name } : { type: typeof error });
      notice = "restore-error";
    }
  }

  redirect(`/?month=${month}&notice=${notice}`);
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
    const existing = await transaction.expense.findMany({ where: { deletedAt: null, id: { in: ids } }, select: { id: true, sharingType: true } });
    if (existing.length !== ids.length) throw new Error("Uma ou mais despesas não estão mais disponíveis. Atualize a página e tente novamente.");

    if (status) await transaction.expense.updateMany({ where: { deletedAt: null, id: { in: ids } }, data: { status } });
    const sharedIds = existing.filter((expense) => expense.sharingType === SharingType.COMPARTILHADA).map((expense) => expense.id);
    if (settlementStatus && sharedIds.length > 0) {
      await transaction.expense.updateMany({ where: { deletedAt: null, id: { in: sharedIds } }, data: { settlementStatus } });
    }

    return { updatedCount: existing.length, skippedDivisionCount: settlementStatus ? existing.length - sharedIds.length : 0 };
  });

  updateTag(dashboardCacheTag);
  revalidatePath("/");
  return result;
}

function recurringFormValues(formData: FormData) {
  return Object.fromEntries(Array.from(formData.entries()).flatMap(([field, value]) => typeof value === "string" ? [[field, value]] : []));
}

function recurringActionError(error: unknown, formData: FormData, previousState: RecurringActionState): RecurringActionState {
  const sharedState = { revision: previousState.revision + 1, values: recurringFormValues(formData) };
  if (error instanceof RecurringRuleFormError) {
    return { fieldErrors: { [error.field]: error.message }, message: "Revise o campo destacado e tente novamente.", ...sharedState, status: "error" };
  }
  if (error instanceof RecurringRuleConflictError) {
    return { conflict: true, fieldErrors: {}, message: "Esta recorrência foi alterada em outra tela. Recarregue os dados atuais.", ...sharedState, status: "error" };
  }
  console.error("Recurring rule action failed", error instanceof Error ? { name: error.name } : { type: typeof error });
  return { fieldErrors: {}, message: "Não foi possível salvar a recorrência. Verifique sua conexão e tente novamente.", ...sharedState, status: "error" };
}

function recurringPath(month: string, notice: string, undo?: string | null) {
  const undoQuery = undo ? `&undo=${encodeURIComponent(undo)}` : "";
  return `/?month=${encodeURIComponent(month)}&notice=${notice}${undoQuery}#management`;
}

function validMonth(formData: FormData) {
  const month = requiredText(formData, "month");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido.");
  return month;
}

export async function saveRecurringRuleAction(previousState: RecurringActionState, formData: FormData): Promise<RecurringActionState> {
  await requireAuthorizedUser();
  let month: string;
  let editing = false;
  try {
    month = validMonth(formData);
    const id = formData.get("id")?.toString() || undefined;
    editing = Boolean(id);
    const expectedValue = formData.get("expectedUpdatedAt")?.toString();
    const expectedUpdatedAt = expectedValue ? new Date(expectedValue) : undefined;
    if (expectedValue && (!expectedUpdatedAt || Number.isNaN(expectedUpdatedAt.getTime()))) throw new Error("Versão inválida.");
    await saveRecurringRule(parseRecurringRuleForm(formData), id, expectedUpdatedAt);
  } catch (error) {
    return recurringActionError(error, formData, previousState);
  }
  updateTag(dashboardCacheTag);
  revalidatePath("/");
  redirect(recurringPath(month, editing ? "recurring-updated" : "recurring-created"));
}

export async function toggleRecurringRuleAction(formData: FormData) {
  await requireAuthorizedUser();
  let month = new Date().toISOString().slice(0, 7);
  let notice = "recurring-error";
  try {
    month = validMonth(formData);
    const id = requiredText(formData, "id");
    const active = formData.get("active")?.toString() === "true";
    const expectedUpdatedAt = new Date(requiredText(formData, "expectedUpdatedAt"));
    await setRecurringRuleActive(id, active, expectedUpdatedAt, month);
    notice = active ? "recurring-reactivated" : "recurring-paused";
    updateTag(dashboardCacheTag);
    revalidatePath("/");
  } catch (error) {
    console.error("Recurring rule toggle failed", error instanceof Error ? { name: error.name } : { type: typeof error });
  }
  redirect(recurringPath(month, notice));
}

export async function endRecurringRuleAction(formData: FormData) {
  await requireAuthorizedUser();
  let month = new Date().toISOString().slice(0, 7);
  let notice = "recurring-error";
  try {
    month = validMonth(formData);
    const id = requiredText(formData, "id");
    const expectedUpdatedAt = new Date(requiredText(formData, "expectedUpdatedAt"));
    await endRecurringRule(id, month, expectedUpdatedAt);
    notice = "recurring-ended";
    updateTag(dashboardCacheTag);
    revalidatePath("/");
  } catch (error) {
    console.error("Recurring rule ending failed", error instanceof Error ? { name: error.name } : { type: typeof error });
  }
  redirect(recurringPath(month, notice));
}

export async function deleteRecurringRuleAction(formData: FormData) {
  await requireAuthorizedUser();
  let month = new Date().toISOString().slice(0, 7);
  let notice = "recurring-error";
  let undo: string | null = null;
  try {
    month = validMonth(formData);
    const id = requiredText(formData, "id");
    const expectedUpdatedAt = new Date(requiredText(formData, "expectedUpdatedAt"));
    const scope = requiredText(formData, "scope") as RecurringDeletionScope;
    if (!["CURRENT_MONTH", "FROM_CURRENT", "RULE_ONLY"].includes(scope)) throw new Error("Alcance inválido.");
    const result = await deleteRecurringRuleByScope(id, scope, month, expectedUpdatedAt);
    undo = result.deletionId;
    notice = scope === "CURRENT_MONTH" ? "recurring-month-deleted" : scope === "FROM_CURRENT" ? "recurring-future-deleted" : "recurring-deleted";
    updateTag(dashboardCacheTag);
    revalidatePath("/");
  } catch (error) {
    console.error("Recurring rule deletion failed", error instanceof Error ? { name: error.name } : { type: typeof error });
  }
  redirect(recurringPath(month, notice, undo));
}
