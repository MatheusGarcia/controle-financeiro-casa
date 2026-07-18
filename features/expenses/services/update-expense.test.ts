import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";
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

import { updateExpenseRecord } from "./update-expense";

const input = {
  amount: 50,
  categoryId: "category-1",
  description: "Compra",
  firstInstallmentMonth: "2027-01",
  notes: null,
  payer: Person.MATHEUS,
  paymentType: PaymentType.CREDITO,
  purchasedOn: new Date(2026, 10, 15, 12),
  settlementStatus: SettlementStatus.PENDENTE_DIVISAO,
  sharingType: SharingType.COMPARTILHADA,
  status: ExpenseStatus.PENDENTE,
  totalInstallments: 3,
};
const expectedUpdatedAt = new Date("2026-07-18T12:00:00.000Z");

describe("updateExpenseRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aplica a edição a todas as parcelas mantendo a distância entre os meses", async () => {
    database.transaction.expense.findFirstOrThrow
      .mockResolvedValueOnce({ installmentNumber: 2, installmentPlanId: "plan-1", updatedAt: expectedUpdatedAt })
      .mockResolvedValueOnce({ id: "expense-2", occurredOn: new Date(2027, 0, 1, 12) });
    database.transaction.expense.findMany.mockResolvedValue([
      { id: "expense-1", installmentNumber: 1 },
      { id: "expense-2", installmentNumber: 2 },
      { id: "expense-3", installmentNumber: 3 },
    ]);
    database.transaction.expense.updateMany.mockResolvedValue({ count: 1 });

    await updateExpenseRecord("expense-2", input, expectedUpdatedAt, "INSTALLMENT_PLAN");

    const updatedMonths = database.transaction.expense.updateMany.mock.calls.map((call) => call[0].data.occurredOn.toISOString().slice(0, 7));
    expect(updatedMonths).toEqual(expect.arrayContaining(["2026-12", "2027-01", "2027-02"]));
    expect(database.transaction.installmentPlan.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "plan-1" },
      data: expect.objectContaining({ installmentAmount: 50, totalAmount: 150 }),
    }));
  });

  it("impede converter uma parcela para Débito/Pix", async () => {
    database.transaction.expense.findFirstOrThrow.mockResolvedValue({ installmentNumber: 1, installmentPlanId: "plan-1", updatedAt: expectedUpdatedAt });

    await expect(updateExpenseRecord("expense-1", { ...input, paymentType: PaymentType.DEBITO_PIX }, expectedUpdatedAt, "CURRENT"))
      .rejects.toThrow("Uma parcela deve permanecer com a forma de pagamento Crédito");
    expect(database.transaction.expense.updateMany).not.toHaveBeenCalled();
  });

  it("recusa salvar sobre uma versão mais recente", async () => {
    database.transaction.expense.findFirstOrThrow.mockResolvedValue({
      installmentNumber: null,
      installmentPlanId: null,
      updatedAt: new Date("2026-07-18T12:05:00.000Z"),
    });

    await expect(updateExpenseRecord("expense-1", input, expectedUpdatedAt, "CURRENT"))
      .rejects.toThrow("alterada depois que esta edição foi aberta");
    expect(database.transaction.expense.updateMany).not.toHaveBeenCalled();
  });
});
