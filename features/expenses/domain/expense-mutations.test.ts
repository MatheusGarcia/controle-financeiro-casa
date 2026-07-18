import { describe, expect, it } from "vitest";
import { parseExpenseMutationScope } from "./expense-mutations";

describe("parseExpenseMutationScope", () => {
  it("usa somente o lançamento atual quando o alcance não é informado", () => {
    expect(parseExpenseMutationScope(null)).toBe("CURRENT");
  });

  it("aceita o parcelamento completo", () => {
    expect(parseExpenseMutationScope("INSTALLMENT_PLAN")).toBe("INSTALLMENT_PLAN");
  });

  it("rejeita valores desconhecidos", () => {
    expect(() => parseExpenseMutationScope("FUTURE")).toThrow("Alcance da alteração inválido");
  });
});
