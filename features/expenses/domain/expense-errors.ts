export class ExpenseConflictError extends Error {
  constructor() {
    super("A despesa foi alterada depois que esta edição foi aberta.");
    this.name = "ExpenseConflictError";
  }
}
