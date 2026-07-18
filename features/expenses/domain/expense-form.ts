import { ExpenseStatus, PaymentType, Person, SettlementStatus, SharingType } from "@prisma/client";

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

function requiredText(formData: FormData, field: string) {
  const value = formData.get(field)?.toString().trim();
  if (!value) throw new Error(`O campo ${field} é obrigatório.`);
  return value;
}

function localDate(value: string, field: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`O campo ${field} contém uma data inválida.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error(`O campo ${field} contém uma data inválida.`);
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

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("O valor deve ser maior que zero.");
  if (!Object.values(Person).includes(payer)) throw new Error("Pagador inválido.");
  if (!Object.values(PaymentType).includes(paymentType) || paymentType === PaymentType.NAO_INFORMADO) throw new Error("Forma de pagamento inválida.");
  if (!Object.values(SharingType).includes(sharingType)) throw new Error("Natureza inválida.");
  if (!Object.values(ExpenseStatus).includes(status)) throw new Error("Status inválido.");
  if (!Object.values(SettlementStatus).includes(requestedSettlementStatus)) throw new Error("Status de divisão inválido.");

  const totalInstallments = paymentType === PaymentType.CREDITO ? Number(formData.get("totalInstallments")) : 1;
  const firstInstallmentMonth = paymentType === PaymentType.CREDITO
    ? requiredText(formData, "firstInstallmentMonth")
    : `${purchasedOn.getFullYear()}-${String(purchasedOn.getMonth() + 1).padStart(2, "0")}`;

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
