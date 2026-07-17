"use client";

import { useState } from "react";

type Props = {
  defaultPaymentType?: "DEBITO_PIX" | "CREDITO" | "NAO_INFORMADO";
  defaultInstallments?: number;
  defaultMonth: string;
  editing?: boolean;
};

export function PaymentFields({ defaultPaymentType = "DEBITO_PIX", defaultInstallments = 1, defaultMonth, editing = false }: Props) {
  const initialType = defaultPaymentType === "NAO_INFORMADO" ? "DEBITO_PIX" : defaultPaymentType;
  const [paymentType, setPaymentType] = useState(initialType);

  return <>
    <div className="field">
      <label htmlFor="paymentType">Forma de pagamento</label>
      <select id="paymentType" name="paymentType" value={paymentType} onChange={(event) => setPaymentType(event.target.value as "DEBITO_PIX" | "CREDITO")}>
        <option value="DEBITO_PIX">Débito / Pix</option>
        <option value="CREDITO">Crédito</option>
      </select>
    </div>
    {paymentType === "CREDITO" && <div className="two-columns">
      <div className="field">
        <label htmlFor="totalInstallments">Parcelas</label>
        <input id="totalInstallments" name="totalInstallments" type="number" min="1" max="120" required defaultValue={defaultInstallments} readOnly={editing} />
        {editing && <small className="note">O parcelamento não pode ser refeito durante a edição.</small>}
      </div>
      <div className="field">
        <label htmlFor="firstInstallmentMonth">{editing ? "Mês desta parcela" : "Mês da parcela única ou primeira"}</label>
        <input id="firstInstallmentMonth" name="firstInstallmentMonth" type="month" required defaultValue={defaultMonth} />
      </div>
    </div>}
  </>;
}
