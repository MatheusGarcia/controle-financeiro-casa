export class RecurringRuleConflictError extends Error {
  constructor() {
    super("A recorrência foi alterada depois que esta edição foi aberta.");
    this.name = "RecurringRuleConflictError";
  }
}
