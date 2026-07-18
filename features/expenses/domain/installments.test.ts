import { describe, expect, it } from "vitest";
import { buildInstallmentSchedule, monthKey } from "./installments";

describe("buildInstallmentSchedule", () => {
  it("preserva o total e concentra o arredondamento na última parcela", () => {
    const schedule = buildInstallmentSchedule(10, 3, "2026-08");

    expect(schedule.map((item) => item.amount)).toEqual([3.33, 3.33, 3.34]);
    expect(schedule.reduce((total, item) => total + item.amount, 0)).toBeCloseTo(10);
  });

  it("avança corretamente entre anos", () => {
    const schedule = buildInstallmentSchedule(300, 3, "2026-12");

    expect(schedule.map((item) => monthKey(item.occurredOn))).toEqual(["2026-12", "2027-01", "2027-02"]);
  });

  it("recusa uma quantidade de parcelas maior que os centavos disponíveis", () => {
    expect(() => buildInstallmentSchedule(0.02, 3, "2026-08")).toThrow("valor total é insuficiente");
  });

  it("recusa competência mensal inválida", () => {
    expect(() => buildInstallmentSchedule(100, 2, "2026-13")).toThrow("Mês da primeira parcela inválido");
  });
});
