"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/components/submit-button";
import { parseImportWorkbook, type ImportWorkbookState } from "./actions";

const initialState: ImportWorkbookState = { message: "", status: "idle" };

export function ImportUploadForm() {
  const [state, action] = useActionState(parseImportWorkbook, initialState);

  return <form action={action} className="import-upload-form">
    {state.status === "error" && <p aria-live="assertive" className="form-feedback error" role="alert">{state.message}</p>}
    <div className="field import-file-field">
      <label htmlFor="workbook">Planilha do Excel</label>
      <input aria-describedby="workbook-help" id="workbook" name="workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
      <small className="field-help" id="workbook-help">Formato .xlsx, com até 10 MB. O arquivo será analisado antes de qualquer despesa ser criada.</small>
    </div>
    <SubmitButton className="button" pendingLabel="Lendo planilha…">Ler planilha e revisar</SubmitButton>
  </form>;
}
