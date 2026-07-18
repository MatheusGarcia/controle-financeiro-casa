"use client";

import { useState } from "react";
import { deleteExpense } from "@/app/actions";
import { SubmitButton } from "@/app/components/submit-button";

type Props = {
  description: string;
  expenseId: string;
  installmentNumber: number | null;
  month: string;
  totalInstallments: number | null;
};

export function DeleteExpenseControl({ description, expenseId, installmentNumber, month, totalInstallments }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isInstallment = Boolean(installmentNumber && totalInstallments);

  return <>
    <button className="button danger" type="button" onClick={() => setIsOpen(true)}>Excluir</button>
    {isOpen && <div className="confirmation-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
      <section aria-labelledby={`delete-title-${expenseId}`} aria-modal="true" className="confirmation-dialog" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
        <h3 id={`delete-title-${expenseId}`}>Excluir {description}?</h3>
        {isInstallment ? <>
          <p>Esta é a parcela {installmentNumber} de {totalInstallments}. Escolha exatamente o que deseja remover.</p>
          <div className="confirmation-options">
            <form action={deleteExpense}>
              <input type="hidden" name="id" value={expenseId} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="mutationScope" value="CURRENT" />
              <SubmitButton className="button danger" pendingLabel="Excluindo parcela…">Somente esta parcela</SubmitButton>
            </form>
            <form action={deleteExpense}>
              <input type="hidden" name="id" value={expenseId} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="mutationScope" value="INSTALLMENT_PLAN" />
              <SubmitButton className="button danger danger-filled" pendingLabel="Excluindo parcelamento…">Todas as parcelas</SubmitButton>
            </form>
          </div>
        </> : <>
          <p>Essa ação remove a despesa definitivamente.</p>
          <form action={deleteExpense} className="confirmation-options">
            <input type="hidden" name="id" value={expenseId} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="mutationScope" value="CURRENT" />
            <SubmitButton className="button danger danger-filled" pendingLabel="Excluindo…">Confirmar exclusão</SubmitButton>
          </form>
        </>}
        <button className="button secondary" type="button" autoFocus onClick={() => setIsOpen(false)}>Cancelar</button>
      </section>
    </div>}
  </>;
}
