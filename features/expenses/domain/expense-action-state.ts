export type ExpenseFormField =
  | "amount"
  | "categoryId"
  | "description"
  | "firstInstallmentMonth"
  | "occurredOn"
  | "payer"
  | "paymentType"
  | "settlementStatus"
  | "sharingType"
  | "status"
  | "totalInstallments";

export type ExpenseActionState = {
  conflict?: boolean;
  fieldErrors: Partial<Record<ExpenseFormField, string>>;
  message?: string;
  revision: number;
  status: "idle" | "error";
  values?: Record<string, string>;
};

export const initialExpenseActionState: ExpenseActionState = {
  fieldErrors: {},
  revision: 0,
  status: "idle",
};
