export type Installment = {
  amount: number;
  number: number;
  occurredOn: Date;
};

const monthPattern = /^(\d{4})-(\d{2})$/;

export function buildInstallmentSchedule(totalAmount: number, totalInstallments: number, firstInstallmentMonth: string): Installment[] {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("O valor deve ser maior que zero.");
  if (!Number.isInteger(totalInstallments) || totalInstallments < 1 || totalInstallments > 120) throw new Error("Informe entre 1 e 120 parcelas.");

  const monthMatch = monthPattern.exec(firstInstallmentMonth);
  if (!monthMatch) throw new Error("Mês da primeira parcela inválido.");

  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  if (month < 1 || month > 12) throw new Error("Mês da primeira parcela inválido.");

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / totalInstallments);
  if (baseCents < 1) throw new Error("O valor total é insuficiente para o número de parcelas.");

  return Array.from({ length: totalInstallments }, (_, index) => ({
    amount: (baseCents + (index === totalInstallments - 1 ? totalCents % totalInstallments : 0)) / 100,
    number: index + 1,
    occurredOn: new Date(year, month - 1 + index, 1, 12),
  }));
}

export function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
