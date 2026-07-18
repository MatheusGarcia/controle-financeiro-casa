import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const transaction = {
    expense: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
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

describe("updateExpenseRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aplica a edição a todas as parcelas mantendo a distância entre os meses", async () => {
    database.transaction.expense.findUniqueOrThrow
      .mockResolvedValueOnce({ installmentNumber: 2, installmentPlanId: "plan-1" })
      .mockResolvedValueOnce({ id: "expense-2", occurredOn: new Date(2027, 0, 1, 12) });
    database.transaction.expense.findMany.mockResolvedValue([
      { id: "expense-1", installmentNumber: 1 },
      { id: "expense-2", installmentNumber: 2 },
      { id: "expense-3", installmentNumber: 3 },
    ]);

    await updateExpenseRecord("expense-2", input, "INSTALLMENT_PLAN");

    const updatedMonths = database.transaction.expense.update.mock.calls.map((call) => call[0].data.occurredOn.toISOString().slice(0, 7));
    expect(updatedMonths).toEqual(["2026-12", "2027-01", "2027-02"]);
    expect(database.transaction.installmentPlan.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "plan-1" },
      data: expect.objectContaining({ installmentAmount: 50, totalAmount: 150 }),
    }));
  });

  it("impede converter uma parcela para Débito/Pix", async () => {
    database.transaction.expense.findUniqueOrThrow.mockResolvedValue({ installmentNumber: 1, installmentPlanId: "plan-1" });

    await expect(updateExpenseRecord("expense-1", { ...input, paymentType: PaymentType.DEBITO_PIX }, "CURRENT"))
      .rejects.toThrow("Uma parcela deve permanecer com a forma de pagamento Crédito");
    expect(database.transaction.expense.update).not.toHaveBeenCalled();
  });
});
