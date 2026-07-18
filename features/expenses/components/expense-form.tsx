"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { createExpense, updateExpense } from "@/app/actions";
import { PaymentFields } from "@/app/components/payment-fields";
import { SubmitButton } from "@/app/components/submit-button";
import { initialExpenseActionState, type ExpenseFormField } from "@/features/expenses/domain/expense-action-state";
import { SharingFields } from "@/features/expenses/components/sharing-fields";

type EditableExpense = {
  amount: number;
  categoryId: string;
  description: string;
  id: string;
  installmentNumber: number | null;
  notes: string | null;
  occurredMonth: string;
  payer: "MATHEUS" | "KARINA";
  paymentType: "DEBITO_PIX" | "CREDITO" | "NAO_INFORMADO";
  purchasedOn: string;
  settlementStatus: "DIVIDIDA" | "PENDENTE_DIVISAO";
  sharingType: "COMPARTILHADA" | "INDIVIDUAL";
  status: "PAGO" | "PENDENTE";
  totalInstallments: number | null;
  updatedAt: string;
};

type Props = {
  categories: Array<{ id: string; name: string }>;
  expense?: EditableExpense;
  expenseListUrl: string;
  month: string;
};

function FieldError({ field, message }: { field: ExpenseFormField; message?: string }) {
  return message ? <small className="field-error" id={`error-${field}`}>{message}</small> : null;
}

export function ExpenseForm({ categories, expense, expenseListUrl, month }: Props) {
  const router = useRouter();
  const action = expense ? updateExpense : createExpense;
  const [state, formAction] = useActionState(action, initialExpenseActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;
    const field = Object.keys(state.fieldErrors)[0];
    const target = field ? formRef.current?.querySelector<HTMLElement>(`[name="${field}"], #${field}`) : null;
    target?.focus();
  }, [state]);

  const describedBy = (field: ExpenseFormField) => state.fieldErrors[field] ? `error-${field}` : undefined;
  const invalid = (field: ExpenseFormField) => Boolean(state.fieldErrors[field]);
  const savedValue = <T extends string>(field: string, fallback: T) => (state.values?.[field] as T | undefined) ?? fallback;
  const paymentType = savedValue("paymentType", expense?.paymentType ?? "DEBITO_PIX");
  const sharingType = savedValue("sharingType", expense?.sharingType ?? "COMPARTILHADA");
  const mutationScope = savedValue<"CURRENT" | "INSTALLMENT_PLAN">("mutationScope", "CURRENT");

  return <form action={formAction} key={state.revision} noValidate ref={formRef}>
    {expense && <input type="hidden" name="id" value={expense.id} />}
    {expense && <input type="hidden" name="expectedUpdatedAt" value={expense.updatedAt} />}
    {expense && <input type="hidden" name="returnTo" value={expenseListUrl} />}
    {expense?.totalInstallments && <fieldset className="mutation-scope">
      <legend>Aplicar alterações em</legend>
      <label><input type="radio" name="mutationScope" value="CURRENT" defaultChecked={mutationScope === "CURRENT"} />Somente esta parcela ({expense.installmentNumber} de {expense.totalInstallments})</label>
      <label><input type="radio" name="mutationScope" value="INSTALLMENT_PLAN" defaultChecked={mutationScope === "INSTALLMENT_PLAN"} />Todas as parcelas desta compra</label>
      <small>Ao escolher todas, o valor informado será aplicado a cada parcela e o mês selecionado continuará sendo o desta parcela.</small>
    </fieldset>}
    {state.status === "error" && <div className="form-feedback error" role="alert"><strong>Não foi possível salvar.</strong><span>{state.message}</span>{state.conflict && <button className="inline-action" type="button" onClick={() => router.refresh()}>Recarregar dados atuais</button>}</div>}
    <div className="field">
      <label htmlFor="description">Descrição</label>
      <input aria-describedby={describedBy("description")} aria-invalid={invalid("description")} id="description" name="description" required defaultValue={savedValue("description", expense?.description ?? "")} placeholder="Ex.: Aluguel" />
      <FieldError field="description" message={state.fieldErrors.description} />
    </div>
    <div className="two-columns">
      <div className="field">
        <label htmlFor="amount">{expense?.totalInstallments ? "Valor da parcela" : "Valor"}</label>
        <input aria-describedby={describedBy("amount")} aria-invalid={invalid("amount")} id="amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={savedValue("amount", expense ? String(expense.amount) : "")} placeholder="0,00" />
        <FieldError field="amount" message={state.fieldErrors.amount} />
      </div>
      <div className="field">
        <label htmlFor="occurredOn">Data da compra</label>
        <input aria-describedby={describedBy("occurredOn")} aria-invalid={invalid("occurredOn")} id="occurredOn" name="occurredOn" type="date" required defaultValue={savedValue("occurredOn", expense?.purchasedOn ?? `${month}-01`)} />
        <FieldError field="occurredOn" message={state.fieldErrors.occurredOn} />
      </div>
    </div>
    <div className="field">
      <label htmlFor="categoryId">Categoria</label>
      <select aria-describedby={describedBy("categoryId")} aria-invalid={invalid("categoryId")} id="categoryId" name="categoryId" required defaultValue={savedValue("categoryId", expense?.categoryId ?? categories[0]?.id ?? "")}>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <FieldError field="categoryId" message={state.fieldErrors.categoryId} />
    </div>
    <PaymentFields defaultPaymentType={paymentType} defaultInstallments={Number(savedValue("totalInstallments", String(expense?.totalInstallments ?? 1)))} defaultMonth={savedValue("firstInstallmentMonth", expense?.occurredMonth ?? month)} editing={Boolean(expense)} fieldErrors={state.fieldErrors} installmentEditing={Boolean(expense?.totalInstallments)} />
    <SharingFields defaultPayer={savedValue("payer", expense?.payer ?? "MATHEUS")} defaultSettlementStatus={savedValue("settlementStatus", expense?.settlementStatus ?? "PENDENTE_DIVISAO")} defaultSharingType={sharingType} fieldErrors={state.fieldErrors} />
    <div className="field">
      <label htmlFor="status">Status</label>
      <select aria-describedby={describedBy("status")} aria-invalid={invalid("status")} id="status" name="status" defaultValue={savedValue("status", expense?.status ?? "PAGO")}>
        <option value="PAGO">Pago</option><option value="PENDENTE">Pendente</option>
      </select>
      <FieldError field="status" message={state.fieldErrors.status} />
    </div>
    <div className="field"><label htmlFor="notes">Observação</label><textarea id="notes" name="notes" defaultValue={savedValue("notes", expense?.notes ?? "")} placeholder="Opcional" /></div>
    <div className="actions"><SubmitButton className="button" pendingLabel={expense ? "Salvando alterações…" : "Adicionando despesa…"}>{expense ? "Salvar alterações" : "Adicionar despesa"}</SubmitButton>{expense && <Link className="button secondary" href={expenseListUrl}>Cancelar</Link>}</div>
  </form>;
}
