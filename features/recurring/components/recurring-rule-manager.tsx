"use client";

import { useRef, useState } from "react";
import { deleteRecurringRuleAction, endRecurringRuleAction, toggleRecurringRuleAction } from "@/app/actions";
import { AccessibleModal } from "@/app/components/accessible-modal";
import { SubmitButton } from "@/app/components/submit-button";
import { RecurringRuleForm, type RecurringRuleView } from "./recurring-rule-form";

type Props = {
  categories: Array<{ id: string; name: string }>;
  month: string;
  rules: RecurringRuleView[];
};

const statusLabels = { ACTIVE: "Ativa", ENDED: "Encerrada", PAUSED: "Pausada", SCHEDULED: "Agendada" };
const paymentLabels = { CREDITO: "Crédito", DEBITO_PIX: "Débito / Pix", NAO_INFORMADO: "Não informado" };

function HiddenRuleFields({ month, rule }: { month: string; rule: RecurringRuleView }) {
  return <><input type="hidden" name="id" value={rule.id} /><input type="hidden" name="month" value={month} /><input type="hidden" name="expectedUpdatedAt" value={rule.updatedAt} /></>;
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "Sem data final";
}

export function RecurringRuleManager({ categories, month, rules }: Props) {
  const createDetailsRef = useRef<HTMLDetailsElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletingRule = rules.find((rule) => rule.id === deletingId);
  const endingRule = rules.find((rule) => rule.id === endingId);

  return <div className="recurring-manager">
    <details className="card recurring-create" id="recurring-create" ref={createDetailsRef}><summary>Adicionar despesa recorrente</summary><RecurringRuleForm categories={categories} month={month} /></details>
    {rules.length === 0 ? <div className="card recurring-empty"><h3>Nenhuma recorrência cadastrada</h3><p>Automatize aluguel, assinaturas e outros compromissos mensais.</p><button className="button" type="button" onClick={() => { if (createDetailsRef.current) { createDetailsRef.current.open = true; createDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); requestAnimationFrame(() => createDetailsRef.current?.querySelector<HTMLInputElement>('[name="description"]')?.focus({ preventScroll: true })); } }}>Adicionar primeira recorrência</button></div> : <div className="recurring-list">
      {rules.map((rule) => <article className="card recurring-card" key={rule.id}>
        {editingId === rule.id ? <><div className="recurring-card-heading"><div><span className={`status-badge ${rule.status.toLowerCase()}`}>{statusLabels[rule.status]}</span><h3>Editar {rule.description}</h3></div></div><RecurringRuleForm categories={categories} month={month} onCancel={() => setEditingId(null)} rule={rule} /></> : <>
          <div className="recurring-card-heading"><div><span className={`status-badge ${rule.status.toLowerCase()}`}>{statusLabels[rule.status]}</span><h3>{rule.description}</h3><p>{rule.categoryName} · vence no dia {rule.dueDay}</p></div><strong>{rule.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
          <dl className="recurring-details"><div><dt>Pagador</dt><dd>{rule.payer === "MATHEUS" ? "Matheus" : "Karina"}</dd></div><div><dt>Pagamento</dt><dd>{paymentLabels[rule.paymentType]}</dd></div><div><dt>Natureza</dt><dd>{rule.sharingType === "COMPARTILHADA" ? "Compartilhada" : "Individual"}</dd></div><div><dt>Próxima geração</dt><dd>{rule.nextOccurrence ? dateLabel(rule.nextOccurrence) : "Sem nova geração"}</dd></div><div><dt>Período</dt><dd>{dateLabel(rule.startsOn)} — {dateLabel(rule.endsOn)}</dd></div></dl>
          <div className="actions recurring-actions"><button className="button secondary" type="button" onClick={() => setEditingId(rule.id)}>Editar</button>{rule.status === "PAUSED" ? <form action={toggleRecurringRuleAction}><HiddenRuleFields month={month} rule={rule} /><input type="hidden" name="active" value="true" /><SubmitButton className="button secondary" pendingLabel="Reativando…">Reativar</SubmitButton></form> : (rule.status === "ACTIVE" || rule.status === "SCHEDULED") && <form action={toggleRecurringRuleAction}><HiddenRuleFields month={month} rule={rule} /><input type="hidden" name="active" value="false" /><SubmitButton className="button secondary" pendingLabel="Pausando…">Pausar</SubmitButton></form>}{(rule.status === "ACTIVE" || rule.status === "SCHEDULED") && <button className="button secondary" type="button" onClick={() => setEndingId(rule.id)}>Encerrar</button>}<button className="button danger" type="button" onClick={() => setDeletingId(rule.id)}>Excluir</button></div>
        </>}
      </article>)}
    </div>}
    {endingRule && <AccessibleModal descriptionId="end-recurring-description" labelId="end-recurring-title" onClose={() => setEndingId(null)}><h3 id="end-recurring-title">Encerrar {endingRule.description}?</h3><p id="end-recurring-description">A regra deixará de gerar despesas a partir do mês selecionado. O histórico anterior será preservado.</p><form action={endRecurringRuleAction} className="confirmation-options"><HiddenRuleFields month={month} rule={endingRule} /><SubmitButton className="button danger danger-filled" pendingLabel="Encerrando…">Encerrar a partir deste mês</SubmitButton></form><button className="button secondary" data-initial-focus type="button" onClick={() => setEndingId(null)}>Cancelar</button></AccessibleModal>}
    {deletingRule && <AccessibleModal className="recurring-delete-dialog" descriptionId="delete-recurring-description" labelId="delete-recurring-title" onClose={() => setDeletingId(null)}><h3 id="delete-recurring-title">O que deseja excluir de {deletingRule.description}?</h3><p id="delete-recurring-description">Escolha o alcance com atenção. As despesas de meses anteriores nunca serão alteradas.</p><div className="recurring-delete-options">
      <form action={deleteRecurringRuleAction}><HiddenRuleFields month={month} rule={deletingRule} /><input type="hidden" name="scope" value="CURRENT_MONTH" /><SubmitButton className="button secondary" disabled={!deletingRule.hasCurrentExpense} pendingLabel="Excluindo mês…">Somente a despesa deste mês</SubmitButton>{!deletingRule.hasCurrentExpense && <small>Nenhuma despesa desta regra foi gerada no mês selecionado.</small>}</form>
      <form action={deleteRecurringRuleAction}><HiddenRuleFields month={month} rule={deletingRule} /><input type="hidden" name="scope" value="FROM_CURRENT" /><SubmitButton className="button danger" pendingLabel="Encerrando recorrência…">Este mês e os próximos</SubmitButton><small>Encerra a regra e remove lançamentos já gerados deste mês em diante.</small></form>
      <form action={deleteRecurringRuleAction}><HiddenRuleFields month={month} rule={deletingRule} /><input type="hidden" name="scope" value="RULE_ONLY" /><SubmitButton className="button danger danger-filled" pendingLabel="Excluindo regra…">Somente a regra</SubmitButton><small>Apaga a automação, mas preserva todas as despesas existentes.</small></form>
    </div><button className="button secondary" data-initial-focus type="button" onClick={() => setDeletingId(null)}>Cancelar</button></AccessibleModal>}
  </div>;
}
