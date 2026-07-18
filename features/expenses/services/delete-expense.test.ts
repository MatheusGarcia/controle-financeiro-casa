import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const transaction = {
    expense: {
      aggregate: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    installmentPlan: { update: vi.fn() },
  };

  return {
    transaction,
    prisma: { $transaction: vi.fn((callback) => callback(transaction)) },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: database.prisma }));

import { deleteExpenseRecords, restoreDeletedExpenseRecords } from "./delete-expense";

describe("exclusão reversível de despesas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("oculta somente a parcela atual e recalcula o total restante", async () => {
    database.transaction.expense.findFirstOrThrow.mockResolvedValue({ installmentPlanId: "plan-1" });
    database.transaction.expense.updateMany.mockResolvedValue({ count: 1 });
    database.transaction.expense.aggregate.mockResolvedValue({ _sum: { amount: 80 } });

    const result = await deleteExpenseRecords("expense-2", "CURRENT");

    expect(result).toEqual({ deletedCount: 1, deletionId: expect.any(String) });
    expect(database.transaction.expense.updateMany).toHaveBeenCalledWith({
      where: { deletedAt: null, id: "expense-2" },
      data: { deletedAt: expect.any(Date), deletionId: expect.any(String) },
    });
    expect(database.transaction.installmentPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { totalAmount: 80 },
    });
  });

  it("oculta todas as parcelas sem destruir o plano necessário para restauração", async () => {
    database.transaction.expense.findFirstOrThrow.mockResolvedValue({ installmentPlanId: "plan-1" });
    database.transaction.expense.updateMany.mockResolvedValue({ count: 4 });
    database.transaction.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const result = await deleteExpenseRecords("expense-2", "INSTALLMENT_PLAN");

    expect(result.deletedCount).toBe(4);
    expect(database.transaction.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null, installmentPlanId: "plan-1" },
    }));
    expect(database.transaction.installmentPlan.update).not.toHaveBeenCalled();
  });

  it("restaura todo o conjunto identificado pela mesma exclusão", async () => {
    database.transaction.expense.findMany.mockResolvedValue([
      { installmentPlanId: "plan-1" },
      { installmentPlanId: "plan-1" },
    ]);
    database.transaction.expense.updateMany.mockResolvedValue({ count: 2 });
    database.transaction.expense.aggregate.mockResolvedValue({ _sum: { amount: 100 } });

    await expect(restoreDeletedExpenseRecords("deletion-1")).resolves.toEqual({ restoredCount: 2 });

    expect(database.transaction.expense.updateMany).toHaveBeenCalledWith({
      where: { deletedAt: { not: null }, deletionId: "deletion-1" },
      data: { deletedAt: null, deletionId: null },
    });
    expect(database.transaction.installmentPlan.update).toHaveBeenCalledTimes(1);
  });
});
