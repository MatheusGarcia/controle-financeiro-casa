import { describe, expect, it } from "vitest";
import { expenseListUrl, expenseListUrlWithoutFilter, hasExpenseFilters, parseExpenseFilters } from "./filters";

describe("filtros de despesas", () => {
  it("normaliza busca e ignora valores inválidos", () => {
    expect(parseExpenseFilters({ q: "  mercado   do mês  ", payment: "DINHEIRO", payer: "OUTRA", status: "PAGO" })).toEqual({
      categoryId: undefined,
      paymentType: undefined,
      payer: undefined,
      query: "mercado do mês",
      settlement: undefined,
      status: "PAGO",
    });
  });

  it("mantém todos os filtros e a página em uma URL compartilhável", () => {
    const url = expenseListUrl("2026-07", {
      categoryId: "categoria-1",
      paymentType: "CREDITO",
      payer: "KARINA",
      query: "energia elétrica",
      settlement: "PENDENTE_DIVISAO",
      status: "PENDENTE",
    }, 3);

    expect(url).toBe("/?month=2026-07&q=energia+el%C3%A9trica&category=categoria-1&payment=CREDITO&payer=KARINA&status=PENDENTE&settlement=PENDENTE_DIVISAO&page=3");
  });

  it("remove somente o filtro selecionado e reinicia a paginação", () => {
    const filters = { paymentType: "CREDITO" as const, query: "aluguel", status: "PAGO" as const };
    expect(hasExpenseFilters(filters)).toBe(true);
    expect(expenseListUrlWithoutFilter("2026-07", filters, "query")).toBe("/?month=2026-07&payment=CREDITO&status=PAGO");
    expect(hasExpenseFilters({})).toBe(false);
  });
});
