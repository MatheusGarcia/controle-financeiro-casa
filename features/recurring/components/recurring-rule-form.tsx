"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { saveRecurringRuleAction } from "@/app/actions";
import { SubmitButton } from "@/app/components/submit-button";
import { initialRecurringActionState, type RecurringActionState } from "../domain/recurring-action-state";
import type { RecurringRuleField } from "../domain/recurring-rule";

export type RecurringRuleView = {
  active: boolean;
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  dueDay: number;
  endsOn: string | null;
  hasCurrentExpense: boolean;
  id: string;
  nextOccurrence: string | null;
  payer: "MATHEUS" | "KARINA";
  paymentType: "DEBITO_PIX" | "CREDITO" | "NAO_INFORMADO";
  sharingType: "COMPARTILHADA" | "INDIVIDUAL";
  startsOn: string;
  status: "ACTIVE" | "PAUSED" | "ENDED" | "SCHEDULED";
  updatedAt: string;
};

type Props = {
  categories: Array<{ id: string; name: string }>;
  month: string;
  onCancel?: () => void;
  rule?: RecurringRuleView;
};

function FieldError({ errors, field }: { errors: RecurringActionState["fieldErrors"]; field: RecurringRuleField }) {
  return errors[field] ? <small className="field-error" id={`recurring-error-${field}`}>{errors[field]}</small> : null;
}

export function RecurringRuleForm({ categories, month, onCancel, rule }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveRecurringRuleAction, initialRecurringActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const saved = <T extends string>(field: string, fallback: T) => (state.values?.[field] as T | undefined) ?? fallback;
  const errorProps = (field: RecurringRuleField) => ({
    "aria-describedby": state.fieldErrors[field] ? `recurring-error-${field}` : undefined,
    "aria-invalid": Boolean(state.fieldErrors[field]),
  });

  useEffect(() => {
    if (state.status !== "error") return;
    const field = Object.keys(state.fieldErrors)[0];
    if (field) formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }, [state]);

  return <form action={formAction} className="recurring-form" key={state.revision} noValidate ref={formRef}>
    <input type="hidden" name="month" value={month} />
    {rule && <><input type="hidden" name="id" value={rule.id} /><input type="hidden" name="expectedUpdatedAt" value={rule.updatedAt} /></>}
    {state.status === "error" && <div className="form-feedback error" role="alert"><strong>Não foi possível salvar.</strong><span>{state.message}</span>{state.conflict && <button className="inline-action" type="button" onClick={() => router.refresh()}>Recarregar dados atuais</button>}</div>}
    <div className="field"><label htmlFor={`recurring-description-${rule?.id ?? "new"}`}>Descrição</label><input {...errorProps("description")} id={`recurring-description-${rule?.id ?? "new"}`} name="description" defaultValue={saved("description", rule?.description ?? "")} placeholder="Ex.: Aluguel" /><FieldError errors={state.fieldErrors} field="description" /></div>
    <div className="two-columns">
      <div className="field"><label htmlFor={`recurring-amount-${rule?.id ?? "new"}`}>Valor mensal</label><input {...errorProps("amount")} id={`recurring-amount-${rule?.id ?? "new"}`} name="amount" type="number" min="0.01" step="0.01" defaultValue={saved("amount", rule ? String(rule.amount) : "")} /><FieldError errors={state.fieldErrors} field="amount" /></div>
      <div className="field"><label htmlFor={`recurring-day-${rule?.id ?? "new"}`}>Dia do vencimento</label><input {...errorProps("dueDay")} id={`recurring-day-${rule?.id ?? "new"}`} name="dueDay" type="number" min="1" max="31" defaultValue={saved("dueDay", String(rule?.dueDay ?? 1))} /><FieldError errors={state.fieldErrors} field="dueDay" /></div>
    </div>
    <div className="field"><label htmlFor={`recurring-category-${rule?.id ?? "new"}`}>Categoria</label><select {...errorProps("categoryId")} id={`recurring-category-${rule?.id ?? "new"}`} name="categoryId" defaultValue={saved("categoryId", rule?.categoryId ?? categories[0]?.id ?? "")}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><FieldError errors={state.fieldErrors} field="categoryId" /></div>
    <div className="two-columns">
      <div className="field"><label htmlFor={`recurring-payer-${rule?.id ?? "new"}`}>Quem paga</label><select {...errorProps("payer")} id={`recurring-payer-${rule?.id ?? "new"}`} name="payer" defaultValue={saved("payer", rule?.payer ?? "MATHEUS")}><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select><FieldError errors={state.fieldErrors} field="payer" /></div>
      <div className="field"><label htmlFor={`recurring-sharing-${rule?.id ?? "new"}`}>Natureza</label><select {...errorProps("sharingType")} id={`recurring-sharing-${rule?.id ?? "new"}`} name="sharingType" defaultValue={saved("sharingType", rule?.sharingType ?? "COMPARTILHADA")}><option value="COMPARTILHADA">Compartilhada</option><option value="INDIVIDUAL">Individual</option></select><FieldError errors={state.fieldErrors} field="sharingType" /></div>
    </div>
    <div className="field"><label htmlFor={`recurring-payment-${rule?.id ?? "new"}`}>Forma de pagamento</label><select {...errorProps("paymentType")} id={`recurring-payment-${rule?.id ?? "new"}`} name="paymentType" defaultValue={saved("paymentType", rule?.paymentType === "NAO_INFORMADO" ? "DEBITO_PIX" : rule?.paymentType ?? "DEBITO_PIX")}><option value="DEBITO_PIX">Débito / Pix</option><option value="CREDITO">Crédito</option></select><FieldError errors={state.fieldErrors} field="paymentType" /></div>
    <div className="two-columns">
      <div className="field"><label htmlFor={`recurring-start-${rule?.id ?? "new"}`}>Inicia em</label><input {...errorProps("startsOn")} id={`recurring-start-${rule?.id ?? "new"}`} name="startsOn" type="date" defaultValue={saved("startsOn", rule?.startsOn ?? `${month}-01`)} /><FieldError errors={state.fieldErrors} field="startsOn" /></div>
      <div className="field"><label htmlFor={`recurring-end-${rule?.id ?? "new"}`}>Termina em</label><input {...errorProps("endsOn")} id={`recurring-end-${rule?.id ?? "new"}`} name="endsOn" type="date" defaultValue={saved("endsOn", rule?.endsOn ?? "")} /><FieldError errors={state.fieldErrors} field="endsOn" /></div>
    </div>
    {rule && <p className="context-note">A edição altera somente a regra. Despesas já geradas permanecem como estão.</p>}
    <div className="actions"><SubmitButton className="button" pendingLabel={rule ? "Salvando recorrência…" : "Criando recorrência…"}>{rule ? "Salvar regra" : "Criar recorrência"}</SubmitButton>{onCancel && <button className="button secondary" type="button" onClick={onCancel}>Cancelar</button>}</div>
  </form>;
}
