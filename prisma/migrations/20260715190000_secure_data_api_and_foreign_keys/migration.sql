-- This application accesses financial data exclusively through the server-side
-- Prisma connection. Do not grant Data API access until an authenticated client
-- and ownership model are introduced.
REVOKE ALL ON TABLE "Category", "PaymentMethod", "Expense", "RecurringRule", "InstallmentPlan", "ImportBatch", "ImportItem" FROM anon, authenticated;

CREATE POLICY "deny_anon_financial_access" ON "Category" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "Category" FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_financial_access" ON "PaymentMethod" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "PaymentMethod" FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_financial_access" ON "Expense" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "Expense" FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_financial_access" ON "RecurringRule" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "RecurringRule" FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_financial_access" ON "InstallmentPlan" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "InstallmentPlan" FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_financial_access" ON "ImportBatch" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "ImportBatch" FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon_financial_access" ON "ImportItem" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated_financial_access" ON "ImportItem" FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_paymentMethodId_idx" ON "Expense"("paymentMethodId");
CREATE INDEX "RecurringRule_categoryId_idx" ON "RecurringRule"("categoryId");
CREATE INDEX "RecurringRule_paymentMethodId_idx" ON "RecurringRule"("paymentMethodId");
CREATE INDEX "InstallmentPlan_categoryId_idx" ON "InstallmentPlan"("categoryId");
CREATE INDEX "InstallmentPlan_paymentMethodId_idx" ON "InstallmentPlan"("paymentMethodId");
