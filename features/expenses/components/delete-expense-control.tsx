"use client";

import { useState } from "react";
import { deleteExpense } from "@/app/actions";
import { AccessibleModal } from "@/app/components/accessible-modal";
import { SubmitButton } from "@/app/components/submit-button";

type Props = {
  description: string;
  expenseId: string;
  installmentNumber: number | null;
  month: string;
  returnTo: string;
  totalInstallments: number | null;
};

export function DeleteExpenseControl({ description, expenseId, installmentNumber, month, returnTo, totalInstallments }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isInstallment = Boolean(installmentNumber && totalInstallments);

  return <>
    <button className="button danger" type="button" onClick={() => setIsOpen(true)}>Excluir</button>
    {isOpen && <AccessibleModal descriptionId={`delete-description-${expenseId}`} labelId={`delete-title-${expenseId}`} onClose={() => setIsOpen(false)}>
        <h3 id={`delete-title-${expenseId}`}>Excluir {description}?</h3>
        {isInstallment ? <>
          <p id={`delete-description-${expenseId}`}>Esta é a parcela {installmentNumber} de {totalInstallments}. Escolha exatamente o que deseja remover. Você poderá desfazer a exclusão logo após.</p>
          <div className="confirmation-options">
            <form action={deleteExpense}>
              <input type="hidden" name="id" value={expenseId} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="mutationScope" value="CURRENT" />
              <SubmitButton className="button danger" pendingLabel="Excluindo parcela…">Somente esta parcela</SubmitButton>
            </form>
            <form action={deleteExpense}>
              <input type="hidden" name="id" value={expenseId} />
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="mutationScope" value="INSTALLMENT_PLAN" />
              <SubmitButton className="button danger danger-filled" pendingLabel="Excluindo parcelamento…">Todas as parcelas</SubmitButton>
            </form>
          </div>
        </> : <>
          <p id={`delete-description-${expenseId}`}>A despesa sairá da lista, mas poderá ser restaurada pela opção “Desfazer”.</p>
          <form action={deleteExpense} className="confirmation-options">
            <input type="hidden" name="id" value={expenseId} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="mutationScope" value="CURRENT" />
            <SubmitButton className="button danger danger-filled" pendingLabel="Excluindo…">Confirmar exclusão</SubmitButton>
          </form>
        </>}
        <button className="button secondary" data-initial-focus type="button" onClick={() => setIsOpen(false)}>Cancelar</button>
    </AccessibleModal>}
  </>;
}
