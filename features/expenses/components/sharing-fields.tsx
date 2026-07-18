"use client";

import { useState } from "react";
import type { ExpenseActionState } from "@/features/expenses/domain/expense-action-state";

type Props = {
  defaultPayer?: "MATHEUS" | "KARINA";
  defaultSettlementStatus?: "DIVIDIDA" | "PENDENTE_DIVISAO";
  defaultSharingType?: "COMPARTILHADA" | "INDIVIDUAL";
  fieldErrors?: ExpenseActionState["fieldErrors"];
};

export function SharingFields({ defaultPayer = "MATHEUS", defaultSettlementStatus = "PENDENTE_DIVISAO", defaultSharingType = "COMPARTILHADA", fieldErrors = {} }: Props) {
  const [sharingType, setSharingType] = useState(defaultSharingType);

  return <>
    <div className="two-columns">
      <div className="field">
        <label htmlFor="payer">Quem pagou</label>
        <select aria-describedby={fieldErrors.payer ? "error-payer" : undefined} aria-invalid={Boolean(fieldErrors.payer)} id="payer" name="payer" defaultValue={defaultPayer}>
          <option value="MATHEUS">Matheus</option>
          <option value="KARINA">Karina</option>
        </select>
        {fieldErrors.payer && <small className="field-error" id="error-payer">{fieldErrors.payer}</small>}
      </div>
      <div className="field">
        <label htmlFor="sharingType">Natureza</label>
        <select aria-describedby={fieldErrors.sharingType ? "error-sharingType" : undefined} aria-invalid={Boolean(fieldErrors.sharingType)} id="sharingType" name="sharingType" value={sharingType} onChange={(event) => setSharingType(event.target.value as "COMPARTILHADA" | "INDIVIDUAL")}>
          <option value="COMPARTILHADA">Compartilhada</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
        {fieldErrors.sharingType && <small className="field-error" id="error-sharingType">{fieldErrors.sharingType}</small>}
      </div>
    </div>
    {sharingType === "COMPARTILHADA" ? <div className="field">
      <label htmlFor="settlementStatus">Divisão</label>
      <select aria-describedby={fieldErrors.settlementStatus ? "error-settlementStatus" : undefined} aria-invalid={Boolean(fieldErrors.settlementStatus)} id="settlementStatus" name="settlementStatus" defaultValue={defaultSettlementStatus}>
        <option value="PENDENTE_DIVISAO">Pendente de dividir</option>
        <option value="DIVIDIDA">Já dividida</option>
      </select>
      {fieldErrors.settlementStatus && <small className="field-error" id="error-settlementStatus">{fieldErrors.settlementStatus}</small>}
      <small className="field-help">Marque “Já dividida” quando a parte de quem não pagou já tiver sido repassada.</small>
    </div> : <>
      <input type="hidden" name="settlementStatus" value="DIVIDIDA" />
      <p className="context-note">Despesa individual: não entra no acerto entre Matheus e Karina.</p>
    </>}
  </>;
}
