"use client";

import { useState } from "react";

type Props = {
  defaultPayer?: "MATHEUS" | "KARINA";
  defaultSettlementStatus?: "DIVIDIDA" | "PENDENTE_DIVISAO";
  defaultSharingType?: "COMPARTILHADA" | "INDIVIDUAL";
};

export function SharingFields({ defaultPayer = "MATHEUS", defaultSettlementStatus = "PENDENTE_DIVISAO", defaultSharingType = "COMPARTILHADA" }: Props) {
  const [sharingType, setSharingType] = useState(defaultSharingType);

  return <>
    <div className="two-columns">
      <div className="field">
        <label htmlFor="payer">Quem pagou</label>
        <select id="payer" name="payer" defaultValue={defaultPayer}>
          <option value="MATHEUS">Matheus</option>
          <option value="KARINA">Karina</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="sharingType">Natureza</label>
        <select id="sharingType" name="sharingType" value={sharingType} onChange={(event) => setSharingType(event.target.value as "COMPARTILHADA" | "INDIVIDUAL")}>
          <option value="COMPARTILHADA">Compartilhada</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
      </div>
    </div>
    {sharingType === "COMPARTILHADA" ? <div className="field">
      <label htmlFor="settlementStatus">Divisão</label>
      <select id="settlementStatus" name="settlementStatus" defaultValue={defaultSettlementStatus}>
        <option value="PENDENTE_DIVISAO">Pendente de dividir</option>
        <option value="DIVIDIDA">Já dividida</option>
      </select>
      <small className="field-help">Marque “Já dividida” quando a parte de quem não pagou já tiver sido repassada.</small>
    </div> : <>
      <input type="hidden" name="settlementStatus" value="DIVIDIDA" />
      <p className="context-note">Despesa individual: não entra no acerto entre Matheus e Karina.</p>
    </>}
  </>;
}
