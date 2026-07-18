"use client";

import { useState } from "react";
import type { ExpenseActionState } from "@/features/expenses/domain/expense-action-state";

type Props = {
  defaultPaymentType?: "DEBITO_PIX" | "CREDITO" | "NAO_INFORMADO";
  defaultInstallments?: number;
  defaultMonth: string;
  editing?: boolean;
  fieldErrors?: ExpenseActionState["fieldErrors"];
  installmentEditing?: boolean;
};

export function PaymentFields({ defaultPaymentType = "DEBITO_PIX", defaultInstallments = 1, defaultMonth, editing = false, fieldErrors = {}, installmentEditing = false }: Props) {
  const initialType = defaultPaymentType === "NAO_INFORMADO" ? "DEBITO_PIX" : defaultPaymentType;
  const [paymentType, setPaymentType] = useState(initialType);

  return <>
    <div className="field">
      <label htmlFor="paymentType">Forma de pagamento</label>
      {installmentEditing && <input type="hidden" name="paymentType" value="CREDITO" />}
      <select aria-describedby={fieldErrors.paymentType ? "error-paymentType" : undefined} aria-invalid={Boolean(fieldErrors.paymentType)} id="paymentType" name={installmentEditing ? undefined : "paymentType"} value={paymentType} disabled={installmentEditing} onChange={(event) => setPaymentType(event.target.value as "DEBITO_PIX" | "CREDITO")}>
        <option value="DEBITO_PIX">Débito / Pix</option>
        <option value="CREDITO">Crédito</option>
      </select>
      {fieldErrors.paymentType && <small className="field-error" id="error-paymentType">{fieldErrors.paymentType}</small>}
    </div>
    {paymentType === "CREDITO" && <div className="two-columns">
      <div className="field">
        <label htmlFor="totalInstallments">Parcelas</label>
        <input aria-describedby={fieldErrors.totalInstallments ? "error-totalInstallments" : undefined} aria-invalid={Boolean(fieldErrors.totalInstallments)} id="totalInstallments" name="totalInstallments" type="number" min="1" max="120" required defaultValue={defaultInstallments} readOnly={editing} />
        {fieldErrors.totalInstallments && <small className="field-error" id="error-totalInstallments">{fieldErrors.totalInstallments}</small>}
        {editing && <small className="note">O parcelamento não pode ser refeito durante a edição.</small>}
      </div>
      <div className="field">
        <label htmlFor="firstInstallmentMonth">{editing ? "Mês desta parcela" : "Mês da parcela única ou primeira"}</label>
        <input aria-describedby={fieldErrors.firstInstallmentMonth ? "error-firstInstallmentMonth" : undefined} aria-invalid={Boolean(fieldErrors.firstInstallmentMonth)} id="firstInstallmentMonth" name="firstInstallmentMonth" type="month" required defaultValue={defaultMonth} />
        {fieldErrors.firstInstallmentMonth && <small className="field-error" id="error-firstInstallmentMonth">{fieldErrors.firstInstallmentMonth}</small>}
      </div>
    </div>}
  </>;
}
