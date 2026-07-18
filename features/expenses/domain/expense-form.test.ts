import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ExpenseFormError, parseExpenseForm } from "./expense-form";

function validForm(overrides: Record<string, string> = {}) {
  const values = {
    amount: "120.50",
    categoryId: "category-1",
    description: "Mercado",
    firstInstallmentMonth: "2026-09",
    occurredOn: "2026-08-18",
    payer: Person.MATHEUS,
    paymentType: PaymentType.DEBITO_PIX,
    settlementStatus: SettlementStatus.PENDENTE_DIVISAO,
    sharingType: SharingType.COMPARTILHADA,
    status: ExpenseStatus.PAGO,
    totalInstallments: "1",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("parseExpenseForm", () => {
  it("usa a data real como competência para Débito/Pix", () => {
    const input = parseExpenseForm(validForm());

    expect(input.firstInstallmentMonth).toBe("2026-08");
    expect(input.purchasedOn.getDate()).toBe(18);
    expect(input.totalInstallments).toBe(1);
  });

  it("mantém separadas a data da compra e a primeira competência do crédito", () => {
    const input = parseExpenseForm(validForm({ paymentType: PaymentType.CREDITO, totalInstallments: "4" }));

    expect(input.firstInstallmentMonth).toBe("2026-09");
    expect(input.purchasedOn.getMonth()).toBe(7);
    expect(input.totalInstallments).toBe(4);
  });

  it("normaliza a divisão de uma despesa individual para não aplicável", () => {
    const input = parseExpenseForm(validForm({ sharingType: SharingType.INDIVIDUAL }));

    expect(input.settlementStatus).toBe(SettlementStatus.DIVIDIDA);
  });

  it("recusa uma forma de pagamento histórica em novos lançamentos", () => {
    expect(() => parseExpenseForm(validForm({ paymentType: PaymentType.NAO_INFORMADO }))).toThrow("Escolha Débito/Pix ou Crédito");
  });

  it("recusa datas que o JavaScript normalizaria para outro mês", () => {
    expect(() => parseExpenseForm(validForm({ occurredOn: "2026-02-31" }))).toThrow("data da compra é inválida");
  });

  it("identifica o campo responsável pelo erro", () => {
    try {
      parseExpenseForm(validForm({ amount: "0" }));
      expect.fail("A validação deveria falhar.");
    } catch (error) {
      expect(error).toBeInstanceOf(ExpenseFormError);
      expect((error as ExpenseFormError).field).toBe("amount");
    }
  });

  it("valida a quantidade de parcelas antes de gravar", () => {
    expect(() => parseExpenseForm(validForm({ paymentType: PaymentType.CREDITO, totalInstallments: "0" }))).toThrow("1 e 120 parcelas");
  });
});
