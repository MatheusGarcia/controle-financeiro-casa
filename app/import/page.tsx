import Link from "next/link";
import { SubmitButton } from "@/app/components/submit-button";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { parseImportWorkbook } from "./actions";

export default async function ImportPage() {
  await requireAuthorizedUser();
  return <main className="shell"><Link className="back-link" href="/">← Voltar</Link><p className="eyebrow">Importação assistida</p><h1>Trazer dados da planilha</h1><p className="import-intro">Envie a planilha original. Os lançamentos reconhecidos serão exibidos para conferência antes de serem gravados.</p><section className="card import-upload-card"><form action={parseImportWorkbook} className="import-upload-form"><input name="workbook" type="file" accept=".xlsx" required /><SubmitButton className="button" pendingLabel="Lendo planilha…">Ler planilha e revisar</SubmitButton></form></section></main>;
}
