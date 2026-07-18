-- Preserve existing financial records while separating the real purchase date
-- from the accounting month used by dashboards and installments.
ALTER TABLE "Expense" ADD COLUMN "purchasedOn" DATE;

UPDATE "Expense"
SET "purchasedOn" = "occurredOn"
WHERE "purchasedOn" IS NULL;

ALTER TABLE "Expense" ALTER COLUMN "purchasedOn" SET NOT NULL;

ALTER TABLE "InstallmentPlan"
  ADD COLUMN "totalAmount" DECIMAL(12, 2),
  ADD COLUMN "purchasedOn" DATE;

UPDATE "InstallmentPlan" AS plan
SET
  "totalAmount" = COALESCE(
    (SELECT SUM(expense."amount") FROM "Expense" AS expense WHERE expense."installmentPlanId" = plan."id"),
    plan."installmentAmount" * plan."totalInstallments"
  ),
  "purchasedOn" = plan."firstDueOn"
WHERE plan."totalAmount" IS NULL OR plan."purchasedOn" IS NULL;

ALTER TABLE "InstallmentPlan"
  ALTER COLUMN "totalAmount" SET NOT NULL,
  ALTER COLUMN "purchasedOn" SET NOT NULL;

ALTER TABLE "InstallmentPlan"
  ADD CONSTRAINT "InstallmentPlan_totalAmount_positive" CHECK ("totalAmount" > 0),
  ADD CONSTRAINT "InstallmentPlan_totalInstallments_positive" CHECK ("totalInstallments" > 0);
