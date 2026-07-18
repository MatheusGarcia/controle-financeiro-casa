import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const transaction = {
    expense: {
      aggregate: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    installmentPlan: {
      delete: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    transaction,
    prisma: { $transaction: vi.fn((callback) => callback(transaction)) },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: database.prisma }));

import { deleteExpenseRecords } from "./delete-expense";

describe("deleteExpenseRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("remove somente a parcela atual e recalcula o total restante", async () => {
    database.transaction.expense.findUniqueOrThrow.mockResolvedValue({ installmentPlanId: "plan-1" });
    database.transaction.expense.aggregate.mockResolvedValue({ _count: { _all: 2 }, _sum: { amount: 80 } });

    await expect(deleteExpenseRecords("expense-2", "CURRENT")).resolves.toEqual({ deletedCount: 1 });

    expect(database.transaction.expense.delete).toHaveBeenCalledWith({ where: { id: "expense-2" } });
    expect(database.transaction.installmentPlan.update).toHaveBeenCalledWith({
      where: { id: "plan-1" },
      data: { totalAmount: 80 },
    });
    expect(database.transaction.installmentPlan.delete).not.toHaveBeenCalled();
  });

  it("remove todas as parcelas e depois o plano", async () => {
    database.transaction.expense.findUniqueOrThrow.mockResolvedValue({ installmentPlanId: "plan-1" });
    database.transaction.expense.deleteMany.mockResolvedValue({ count: 4 });

    await expect(deleteExpenseRecords("expense-2", "INSTALLMENT_PLAN")).resolves.toEqual({ deletedCount: 4 });

    expect(database.transaction.expense.deleteMany).toHaveBeenCalledWith({ where: { installmentPlanId: "plan-1" } });
    expect(database.transaction.installmentPlan.delete).toHaveBeenCalledWith({ where: { id: "plan-1" } });
    expect(database.transaction.expense.delete).not.toHaveBeenCalled();
  });

  it("remove o plano quando a última parcela for excluída", async () => {
    database.transaction.expense.findUniqueOrThrow.mockResolvedValue({ installmentPlanId: "plan-1" });
    database.transaction.expense.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { amount: null } });

    await deleteExpenseRecords("expense-1", "CURRENT");

    expect(database.transaction.installmentPlan.delete).toHaveBeenCalledWith({ where: { id: "plan-1" } });
  });
});
