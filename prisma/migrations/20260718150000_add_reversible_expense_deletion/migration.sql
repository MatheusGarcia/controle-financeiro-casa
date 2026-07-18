ALTER TABLE "Expense"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletionId" TEXT;

CREATE INDEX "Expense_deletedAt_occurredOn_idx" ON "Expense"("deletedAt", "occurredOn");
CREATE INDEX "Expense_deletionId_idx" ON "Expense"("deletionId");
