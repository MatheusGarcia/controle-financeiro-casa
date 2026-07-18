import { PaymentType, Person, SharingType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const transaction = {
    expense: { updateMany: vi.fn() },
    recurringRule: { deleteMany: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
  };
  return {
    transaction,
    prisma: {
      $transaction: vi.fn((callback) => callback(transaction)),
      recurringRule: { create: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn() },
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: database.prisma }));

import { deleteRecurringRuleByScope, saveRecurringRule } from "./manage-recurring-rule";

const expectedUpdatedAt = new Date("2026-07-18T12:00:00.000Z");
const input = {
  amount: 100,
  categoryId: "category-1",
  description: "Internet",
  dueDay: 10,
  endsOn: null,
  payer: Person.MATHEUS,
  paymentType: PaymentType.DEBITO_PIX,
  sharingType: SharingType.COMPARTILHADA,
  startsOn: new Date(2026, 6, 1, 12),
};

describe("gestão de recorrências", () => {
  beforeEach(() => vi.clearAllMocks());

  it("impede que uma edição antiga sobrescreva a regra", async () => {
    database.prisma.recurringRule.updateMany.mockResolvedValue({ count: 0 });
    await expect(saveRecurringRule(input, "rule-1", expectedUpdatedAt)).rejects.toThrow("alterada depois");
  });

  it("exclui somente a despesa do mês e mantém a regra", async () => {
    database.transaction.recurringRule.findUniqueOrThrow.mockResolvedValue({ updatedAt: expectedUpdatedAt });
    database.transaction.expense.updateMany.mockResolvedValue({ count: 1 });

    const result = await deleteRecurringRuleByScope("rule-1", "CURRENT_MONTH", "2026-07", expectedUpdatedAt);

    expect(result).toEqual({ affectedExpenses: 1, deletionId: expect.any(String) });
    expect(database.transaction.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ recurringRuleId: "rule-1", occurredOn: expect.any(Object) }),
    }));
    expect(database.transaction.recurringRule.updateMany).not.toHaveBeenCalled();
  });

  it("encerra a regra e afeta somente o mês escolhido e os seguintes", async () => {
    database.transaction.recurringRule.findUniqueOrThrow.mockResolvedValue({ updatedAt: expectedUpdatedAt });
    database.transaction.expense.updateMany.mockResolvedValue({ count: 2 });
    database.transaction.recurringRule.updateMany.mockResolvedValue({ count: 1 });

    await deleteRecurringRuleByScope("rule-1", "FROM_CURRENT", "2026-07", expectedUpdatedAt);

    expect(database.transaction.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null, occurredOn: { gte: new Date(2026, 6, 1, 12) }, recurringRuleId: "rule-1" },
    }));
    expect(database.transaction.recurringRule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ endsOn: new Date(2026, 5, 30, 12) }),
    }));
  });

  it("remove apenas a automação e desvincula o histórico", async () => {
    database.transaction.recurringRule.findUniqueOrThrow.mockResolvedValue({ updatedAt: expectedUpdatedAt });
    database.transaction.expense.updateMany.mockResolvedValue({ count: 8 });
    database.transaction.recurringRule.deleteMany.mockResolvedValue({ count: 1 });

    await deleteRecurringRuleByScope("rule-1", "RULE_ONLY", "2026-07", expectedUpdatedAt);

    expect(database.transaction.expense.updateMany).toHaveBeenCalledWith({ where: { recurringRuleId: "rule-1" }, data: { recurringRuleId: null } });
    expect(database.transaction.recurringRule.deleteMany).toHaveBeenCalled();
  });
});
