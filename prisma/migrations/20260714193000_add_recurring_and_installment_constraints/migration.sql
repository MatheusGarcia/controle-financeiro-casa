-- Ensure a monthly recurring rule is generated at most once per month.
CREATE UNIQUE INDEX "Expense_recurringRuleId_occurredOn_key"
ON "Expense"("recurringRuleId", "occurredOn");

-- Ensure every installment number exists at most once in a plan.
CREATE UNIQUE INDEX "Expense_installmentPlanId_installmentNumber_key"
ON "Expense"("installmentPlanId", "installmentNumber");
