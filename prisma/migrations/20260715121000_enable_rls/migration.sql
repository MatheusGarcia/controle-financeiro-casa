-- The application uses the server-side Prisma connection.  Public Data API
-- access is disabled for all financial tables unless explicit policies are
-- added in a future authenticated client implementation.
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallmentPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportItem" ENABLE ROW LEVEL SECURITY;
