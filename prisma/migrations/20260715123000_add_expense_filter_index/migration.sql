-- Supports monthly expense lists filtered by payer, payment status and settlement status.
CREATE INDEX "Expense_occurredOn_payer_status_settlementStatus_idx"
  ON "Expense"("occurredOn", "payer", "status", "settlementStatus");
