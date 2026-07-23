import Link from "next/link";
import { commitImportBatch } from "@/app/import/actions";
import { SubmitButton } from "@/app/components/submit-button";
import { ensureInitialCategories } from "@/lib/categories";
import { requireAuthorizedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ batchId: string }>;
type SearchParams = Promise<{ notice?: string }>;

export default async function Review({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  await requireAuthorizedUser();
  const [{ batchId }, query] = await Promise.all([params, searchParams]);
  await ensureInitialCategories();
  const [batch, categories] = await Promise.all([
    prisma.importBatch.findUnique({ where: { id: batchId }, include: { items: { include: { importedExpense: true }, orderBy: [{ sheetName: "asc" }, { sourceRow: "asc" }] } } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!batch) return <main className="shell error-page"><p className="eyebrow">Importação assistida</p><h1>Importação não encontrada</h1><p>Este lote pode ter sido removido ou o endereço está incompleto.</p><Link className="button" href="/import">Selecionar outra planilha</Link></main>;
  const items = batch.items.filter((item) => !item.importedExpense);

  return <main className="shell">
    <Link className="back-link" href="/import">← Selecionar outra planilha</Link>
    <p className="eyebrow">Revisão da importação</p>
    <h1>Confira os lançamentos</h1>
    <p className="import-intro">{items.length} {items.length === 1 ? "item extraído" : "itens extraídos"} de {batch.sourceFileName}. Revise os campos e desmarque o que não deseja importar.</p>
    {query.notice === "none-selected" && <p aria-live="assertive" className="form-feedback error" role="alert">Selecione ao menos um lançamento antes de confirmar a importação.</p>}
    {items.length ? <form action={commitImportBatch}>
      <input type="hidden" name="batchId" value={batch.id} />
      <div className="review-heading"><p><strong>{items.filter((item) => item.needsReview).length}</strong> {items.filter((item) => item.needsReview).length === 1 ? "linha precisa" : "linhas precisam"} de atenção antes da importação.</p><SubmitButton className="button" pendingLabel="Importando lançamentos…">Importar selecionados</SubmitButton></div>
      <div className="review-list">{items.map((item, index) => {
        const prefix = `import-${item.id}`;
        const reviewNoteId = `${prefix}-review-note`;
        return <fieldset aria-describedby={item.needsReview ? reviewNoteId : undefined} className={`review-row ${item.needsReview ? "needs-review" : ""}`} key={item.id}>
          <legend className="sr-only">Lançamento {index + 1}: {item.description}</legend>
          <label className="include-field" htmlFor={`${prefix}-keep`}><input id={`${prefix}-keep`} name={`keep-${item.id}`} type="checkbox" defaultChecked />Importar</label>
          <span className="source-cell">{item.sheetName}<small>Linha {item.sourceRow}</small>{item.needsReview && <strong className="review-warning" id={reviewNoteId}>Conferir dados</strong>}</span>
          <div className="field review-description"><label htmlFor={`${prefix}-description`}>Descrição</label><input id={`${prefix}-description`} name={`description-${item.id}`} defaultValue={item.description} required /></div>
          <div className="field"><label htmlFor={`${prefix}-amount`}>Valor</label><input id={`${prefix}-amount`} name={`amount-${item.id}`} type="number" min="0.01" step="0.01" defaultValue={item.amount.toString()} required /></div>
          <div className="field"><label htmlFor={`${prefix}-date`}>Data</label><input id={`${prefix}-date`} name={`date-${item.id}`} type="date" defaultValue={item.occurredOn.toISOString().slice(0, 10)} required /></div>
          <div className="field"><label htmlFor={`${prefix}-payer`}>Quem pagou</label><select id={`${prefix}-payer`} name={`payer-${item.id}`} defaultValue={item.payer ?? "MATHEUS"}><option value="MATHEUS">Matheus</option><option value="KARINA">Karina</option></select></div>
          <div className="field"><label htmlFor={`${prefix}-category`}>Categoria</label><select id={`${prefix}-category`} name={`category-${item.id}`} defaultValue={item.categoryName}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></div>
        </fieldset>;
      })}</div>
      <div className="review-actions"><SubmitButton className="button" pendingLabel="Importando lançamentos…">Importar selecionados</SubmitButton><Link className="button secondary" href="/">Cancelar e voltar</Link></div>
    </form> : <div className="empty-state"><h2>Importação concluída</h2><p>Este lote não possui lançamentos pendentes de revisão.</p><div className="actions"><Link className="button" href="/">Ver despesas</Link><Link className="button secondary" href="/import">Importar outra planilha</Link></div></div>}
  </main>;
}
