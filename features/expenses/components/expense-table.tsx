"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkUpdateExpenses } from "@/app/actions";
import { DeleteExpenseControl } from "@/features/expenses/components/delete-expense-control";

type ExpenseRow = {
  id: string;
  description: string;
  occurredOn: string;
  categoryName: string;
  payer: "MATHEUS" | "KARINA";
  sharingType: "COMPARTILHADA" | "INDIVIDUAL";
  status: "PAGO" | "PENDENTE";
  settlementStatus: "DIVIDIDA" | "PENDENTE_DIVISAO";
  paymentType: "DEBITO_PIX" | "CREDITO" | "NAO_INFORMADO";
  installmentNumber: number | null;
  totalInstallments: number | null;
  amount: number;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function formatPerson(person: ExpenseRow["payer"]) {
  return person === "MATHEUS" ? "Matheus" : "Karina";
}

export function ExpenseTable({ expenses, expenseListUrl, month }: { expenses: ExpenseRow[]; expenseListUrl: string; month: string }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkSettlementStatus, setBulkSettlementStatus] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const preservedTableTopRef = useRef<number | null>(null);
  const router = useRouter();
  const allSelected = expenses.length > 0 && selectedIds.size === expenses.length;
  const selectedIndividualCount = expenses.filter((expense) => selectedIds.has(expense.id) && expense.sharingType === "INDIVIDUAL").length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedIds.size > 0 && !allSelected;
  }, [allSelected, selectedIds.size]);

  useEffect(() => {
    if (preservedTableTopRef.current === null || !tableWrapperRef.current) return;
    const previousTop = preservedTableTopRef.current;
    const frame = requestAnimationFrame(() => {
      if (tableWrapperRef.current) window.scrollBy(0, tableWrapperRef.current.getBoundingClientRect().top - previousTop);
      preservedTableTopRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [expenses]);

  function toggleExpense(id: string) {
    setFeedback(null);
    setIsConfirming(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setFeedback(null);
    setIsConfirming(false);
    setSelectedIds(allSelected ? new Set() : new Set(expenses.map((expense) => expense.id)));
  }

  function requestBulkUpdate() {
    if (!bulkStatus && !bulkSettlementStatus) {
      setFeedback({ type: "error", message: "Escolha um novo Status ou uma nova Divisão." });
      return;
    }
    setFeedback(null);
    setIsConfirming(true);
  }

  function applyBulkUpdate() {
    setFeedback(null);
    setIsConfirming(false);
    preservedTableTopRef.current = tableWrapperRef.current?.getBoundingClientRect().top ?? null;
    startTransition(async () => {
      try {
        const result = await bulkUpdateExpenses({ ids: Array.from(selectedIds), status: bulkStatus || undefined, settlementStatus: bulkSettlementStatus || undefined });
        const skipped = result.skippedDivisionCount > 0 ? ` A Divisão foi ignorada em ${result.skippedDivisionCount} ${result.skippedDivisionCount === 1 ? "despesa individual" : "despesas individuais"}.` : "";
        setFeedback({ type: "success", message: `${result.updatedCount} ${result.updatedCount === 1 ? "despesa atualizada" : "despesas atualizadas"}.${skipped}` });
        setSelectedIds(new Set());
        setBulkStatus("");
        setBulkSettlementStatus("");
        router.refresh();
      } catch {
        setFeedback({ type: "error", message: "Não foi possível atualizar as despesas. Atualize a página e tente novamente." });
      }
    });
  }

  return <>
    {selectedIds.size > 0 && <div className="selection-toolbar">
      <div className="selection-summary"><strong>{selectedIds.size} {selectedIds.size === 1 ? "despesa selecionada" : "despesas selecionadas"}</strong><button className="link-button" disabled={isPending} type="button" onClick={() => { setSelectedIds(new Set()); setFeedback(null); }}>Limpar</button></div>
      <div className="bulk-edit-controls">
        <label htmlFor="bulk-status"><span>Status</span><select id="bulk-status" value={bulkStatus} disabled={isPending} onChange={(event) => { setBulkStatus(event.target.value); setIsConfirming(false); }}><option value="">Sem alteração</option><option value="PAGO">Pago</option><option value="PENDENTE">Pendente</option></select></label>
        <label htmlFor="bulk-settlement-status"><span>Divisão</span><select id="bulk-settlement-status" value={bulkSettlementStatus} disabled={isPending} aria-describedby={bulkSettlementStatus && selectedIndividualCount > 0 ? "bulk-settlement-note" : undefined} onChange={(event) => { setBulkSettlementStatus(event.target.value); setIsConfirming(false); }}><option value="">Sem alteração</option><option value="DIVIDIDA">Já dividida</option><option value="PENDENTE_DIVISAO">Pendente de dividir</option></select></label>
        <button className="button bulk-apply-button" disabled={isPending} type="button" onClick={requestBulkUpdate}>{isPending ? "Aplicando…" : "Aplicar alterações"}</button>
      </div>
      {bulkSettlementStatus && selectedIndividualCount > 0 && <p className="bulk-selection-note" id="bulk-settlement-note">A Divisão será ignorada em {selectedIndividualCount} {selectedIndividualCount === 1 ? "despesa individual" : "despesas individuais"}.</p>}
      {isConfirming && <div className="bulk-confirmation" role="alert"><p><strong>Confirmar atualização?</strong> Serão alteradas {selectedIds.size} {selectedIds.size === 1 ? "despesa" : "despesas"}.{bulkStatus ? ` Status: ${bulkStatus === "PAGO" ? "Pago" : "Pendente"}.` : ""}{bulkSettlementStatus ? ` Divisão: ${bulkSettlementStatus === "DIVIDIDA" ? "Já dividida" : "Pendente de dividir"}.` : ""}</p><div className="bulk-confirmation-actions"><button className="button" type="button" autoFocus onClick={applyBulkUpdate}>Confirmar</button><button className="button secondary" type="button" onClick={() => setIsConfirming(false)}>Voltar</button></div></div>}
    </div>}
    {feedback && <p className={`bulk-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}
    <div className="expense-table-wrapper" aria-busy={isPending} ref={tableWrapperRef}>
      <table className="expense-table">
        <caption className="sr-only">Despesas do mês selecionado</caption>
        <thead><tr><th scope="col" className="selection-column"><input ref={selectAllRef} type="checkbox" checked={allSelected} disabled={isPending} onChange={toggleAll} aria-label="Selecionar todas as despesas desta página" /></th><th scope="col">Descrição</th><th scope="col">Data</th><th scope="col">Categoria</th><th scope="col">Pagamento</th><th scope="col">Pagador</th><th scope="col">Natureza</th><th scope="col">Status</th><th scope="col">Divisão</th><th scope="col" className="numeric-column">Valor</th><th scope="col" className="actions-column">Ações</th></tr></thead>
        <tbody>{expenses.map((expense) => (
          <tr className={selectedIds.has(expense.id) ? "selected" : undefined} key={expense.id}>
            <td className="selection-column"><input type="checkbox" checked={selectedIds.has(expense.id)} disabled={isPending} onChange={() => toggleExpense(expense.id)} aria-label={`Selecionar ${expense.description}`} /></td>
            <td className="expense-description">{expense.description}{expense.installmentNumber && expense.totalInstallments ? <small className="expense-installment">Parcela {expense.installmentNumber} de {expense.totalInstallments}</small> : null}</td>
            <td className="date-column">{dateFormatter.format(new Date(expense.occurredOn))}</td>
            <td>{expense.categoryName}</td>
            <td>{expense.paymentType === "CREDITO" ? "Crédito" : expense.paymentType === "DEBITO_PIX" ? "Débito / Pix" : "—"}</td>
            <td>{formatPerson(expense.payer)}</td>
            <td><span className="table-tag">{expense.sharingType === "COMPARTILHADA" ? "Compartilhada" : "Individual"}</span></td>
            <td><span className={`status-badge ${expense.status === "PAGO" ? "success" : "warning"}`}>{expense.status === "PAGO" ? "Pago" : "Pendente"}</span></td>
            <td>{expense.sharingType === "COMPARTILHADA" ? <span className={`status-badge ${expense.settlementStatus === "DIVIDIDA" ? "success" : "warning"}`}>{expense.settlementStatus === "DIVIDIDA" ? "Já dividida" : "Pendente"}</span> : <span className="not-applicable">—</span>}</td>
            <td className="expense-amount">{currency.format(expense.amount)}</td>
            <td><div className="expense-actions"><Link aria-disabled={isPending} className="link-button" href={`${expenseListUrl}&edit=${expense.id}#expense-form`} onClick={(event) => { if (isPending) event.preventDefault(); }}>Editar</Link><DeleteExpenseControl description={expense.description} expenseId={expense.id} installmentNumber={expense.installmentNumber} month={month} totalInstallments={expense.totalInstallments} /></div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>;
}
