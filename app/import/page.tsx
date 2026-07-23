import Link from "next/link";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { ImportUploadForm } from "./import-upload-form";

export default async function ImportPage() {
  await requireAuthorizedUser();
  return <main className="shell"><Link className="back-link" href="/">← Voltar ao controle da casa</Link><p className="eyebrow">Importação assistida</p><h1>Trazer dados da planilha</h1><p className="import-intro">Importe lançamentos do modelo original com uma etapa obrigatória de revisão. Nada será incluído nas despesas sem sua confirmação.</p><ol className="import-steps" aria-label="Etapas da importação"><li><strong>Selecione</strong><span>Envie uma planilha .xlsx.</span></li><li><strong>Confira</strong><span>Revise descrições, valores e categorias.</span></li><li><strong>Confirme</strong><span>Importe somente os itens escolhidos.</span></li></ol><section aria-labelledby="import-upload-title" className="card import-upload-card"><h2 id="import-upload-title">Selecionar planilha</h2><ImportUploadForm /></section></main>;
}
