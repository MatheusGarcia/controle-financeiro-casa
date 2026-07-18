import { PaymentType, Person, SharingType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { nextRecurringOccurrence, parseRecurringRuleForm, recurringRuleStatus } from "./recurring-rule";

function validForm(overrides: Record<string, string> = {}) {
  const values = {
    amount: "120.50",
    categoryId: "category-1",
    description: "Assinatura",
    dueDay: "31",
    endsOn: "",
    payer: Person.MATHEUS,
    paymentType: PaymentType.DEBITO_PIX,
    sharingType: SharingType.COMPARTILHADA,
    startsOn: "2026-07-01",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("regras recorrentes", () => {
  it("valida e converte o formulário da recorrência", () => {
    const input = parseRecurringRuleForm(validForm());
    expect(input.amount).toBe(120.5);
    expect(input.dueDay).toBe(31);
    expect(input.startsOn.getMonth()).toBe(6);
  });

  it("recusa uma data final anterior à inicial", () => {
    expect(() => parseRecurringRuleForm(validForm({ endsOn: "2026-06-30" }))).toThrow("igual ou posterior");
  });

  it("calcula a próxima geração ignorando meses já criados", () => {
    const next = nextRecurringOccurrence(
      { active: true, dueDay: 31, endsOn: null, startsOn: new Date(2026, 6, 1, 12) },
      "2026-07",
      [new Date(2026, 6, 31, 12)],
    );
    expect(next?.toISOString().slice(0, 10)).toBe("2026-08-31");
  });

  it("não apresenta próxima geração para regra pausada ou encerrada", () => {
    const rule = { active: false, dueDay: 10, endsOn: null, startsOn: new Date(2026, 0, 1, 12) };
    expect(nextRecurringOccurrence(rule, "2026-07", [])).toBeNull();
    expect(recurringRuleStatus(rule, "2026-07")).toBe("PAUSED");
    expect(recurringRuleStatus({ ...rule, active: true, endsOn: new Date(2026, 5, 30, 12) }, "2026-07")).toBe("ENDED");
  });

  it("não gera uma cobrança retroativa quando o início ocorre após o vencimento", () => {
    const next = nextRecurringOccurrence(
      { active: true, dueDay: 5, endsOn: null, startsOn: new Date(2026, 6, 20, 12) },
      "2026-07",
      [],
    );
    expect(next?.toISOString().slice(0, 10)).toBe("2026-08-05");
  });
});
