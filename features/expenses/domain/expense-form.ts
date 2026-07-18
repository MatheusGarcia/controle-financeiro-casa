import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";
import type { ExpenseFormField } from "./expense-action-state";

export type ExpenseInput = {
  amount: number;
  categoryId: string;
  description: string;
  firstInstallmentMonth: string;
  notes: string | null;
  payer: Person;
  paymentType: PaymentType;
  purchasedOn: Date;
  settlementStatus: SettlementStatus;
  sharingType: SharingType;
  status: ExpenseStatus;
  totalInstallments: number;
};

const fieldLabels: Record<ExpenseFormField, string> = {
  amount: "Valor",
  categoryId: "Categoria",
  description: "Descrição",
  firstInstallmentMonth: "Mês da parcela",
  occurredOn: "Data da compra",
  payer: "Quem pagou",
  paymentType: "Forma de pagamento",
  settlementStatus: "Divisão",
  sharingType: "Natureza",
  status: "Status",
  totalInstallments: "Parcelas",
};

export class ExpenseFormError extends Error {
  constructor(public readonly field: ExpenseFormField, message: string) {
    super(message);
    this.name = "ExpenseFormError";
  }
}

function requiredText(formData: FormData, field: ExpenseFormField) {
  const value = formData.get(field)?.toString().trim();
  if (!value) throw new ExpenseFormError(field, `${fieldLabels[field]} é obrigatório.`);
  return value;
}

function localDate(value: string, field: "occurredOn") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new ExpenseFormError(field, "A data da compra é inválida.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new ExpenseFormError(field, "A data da compra é inválida.");
  return date;
}

export function parseExpenseForm(formData: FormData): ExpenseInput {
  const amount = Number(formData.get("amount"));
  const payer = requiredText(formData, "payer") as Person;
  const paymentType = requiredText(formData, "paymentType") as PaymentType;
  const sharingType = requiredText(formData, "sharingType") as SharingType;
  const status = requiredText(formData, "status") as ExpenseStatus;
  const requestedSettlementStatus = requiredText(formData, "settlementStatus") as SettlementStatus;
  const purchasedOn = localDate(requiredText(formData, "occurredOn"), "occurredOn");

  if (!Number.isFinite(amount) || amount <= 0) throw new ExpenseFormError("amount", "Informe um valor maior que zero.");
  if (!Object.values(Person).includes(payer)) throw new ExpenseFormError("payer", "Escolha quem pagou.");
  if (!Object.values(PaymentType).includes(paymentType) || paymentType === PaymentType.NAO_INFORMADO) throw new ExpenseFormError("paymentType", "Escolha Débito/Pix ou Crédito.");
  if (!Object.values(SharingType).includes(sharingType)) throw new ExpenseFormError("sharingType", "Escolha a natureza da despesa.");
  if (!Object.values(ExpenseStatus).includes(status)) throw new ExpenseFormError("status", "Escolha o status da despesa.");
  if (!Object.values(SettlementStatus).includes(requestedSettlementStatus)) throw new ExpenseFormError("settlementStatus", "Escolha o status da divisão.");

  const totalInstallments = paymentType === PaymentType.CREDITO ? Number(formData.get("totalInstallments")) : 1;
  const firstInstallmentMonth = paymentType === PaymentType.CREDITO
    ? requiredText(formData, "firstInstallmentMonth")
    : `${purchasedOn.getFullYear()}-${String(purchasedOn.getMonth() + 1).padStart(2, "0")}`;

  if (!Number.isInteger(totalInstallments) || totalInstallments < 1 || totalInstallments > 120) {
    throw new ExpenseFormError("totalInstallments", "Informe entre 1 e 120 parcelas.");
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(firstInstallmentMonth)) {
    throw new ExpenseFormError("firstInstallmentMonth", "Informe um mês válido.");
  }
  if (Math.round(amount * 100) < totalInstallments) {
    throw new ExpenseFormError("amount", "O valor é insuficiente para a quantidade de parcelas.");
  }

  return {
    amount,
    categoryId: requiredText(formData, "categoryId"),
    description: requiredText(formData, "description"),
    firstInstallmentMonth,
    notes: formData.get("notes")?.toString().trim() || null,
    payer,
    paymentType,
    purchasedOn,
    settlementStatus: sharingType === SharingType.INDIVIDUAL ? SettlementStatus.DIVIDIDA : requestedSettlementStatus,
    sharingType,
    status,
    totalInstallments,
  };
}
