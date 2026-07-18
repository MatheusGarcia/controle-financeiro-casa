import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Migration automática ignorada fora do ambiente de produção.");
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não está definida; migration cancelada.");
  process.exit(1);
}

const migrationUrl = new URL(databaseUrl);

// Supabase transaction pooling (:6543) is suitable for the application, but
// Prisma migrations need the session pooler (:5432) for advisory locks.
if (migrationUrl.hostname.endsWith(".pooler.supabase.com") && migrationUrl.port === "6543") {
  migrationUrl.port = "5432";
}

process.env.DATABASE_URL = migrationUrl.toString();

const baselineMigrations = [
  "20260714112854_init",
  "20260714191606_add_settlement_status",
  "20260714193000_add_recurring_and_installment_constraints",
  "20260715120000_add_spreadsheet_imports",
  "20260715121000_enable_rls",
  "20260715123000_add_expense_filter_index",
  "20260715190000_secure_data_api_and_foreign_keys",
];

async function baselineExistingSchema() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const [history] = await prisma.$queryRawUnsafe(`SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS "exists"`);
    if (history.exists) {
      const [applied] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS "count" FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
      if (applied.count > 0) return;
    }

    const checks = await prisma.$queryRawUnsafe(`
      SELECT check_name AS "name", passed
      FROM (
        VALUES
          ('financial tables', (SELECT count(*) = 7 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN ('Category','PaymentMethod','Expense','RecurringRule','InstallmentPlan','ImportBatch','ImportItem'))),
          ('required columns', (SELECT count(*) = 5 FROM information_schema.columns WHERE table_schema = 'public' AND (table_name, column_name) IN (('Expense','settlementStatus'),('Expense','importItemId'),('Expense','recurringRuleId'),('Expense','installmentPlanId'),('Expense','installmentNumber')))),
          ('row level security', (SELECT count(*) = 7 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relrowsecurity AND c.relname IN ('Category','PaymentMethod','Expense','RecurringRule','InstallmentPlan','ImportBatch','ImportItem'))),
          ('deny policies', (SELECT count(*) = 14 FROM pg_policies WHERE schemaname = 'public' AND policyname IN ('deny_anon_financial_access','deny_authenticated_financial_access'))),
          ('migration indexes', (SELECT count(*) = 11 FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('Expense_recurringRuleId_occurredOn_key','Expense_installmentPlanId_installmentNumber_key','Expense_importItemId_key','ImportItem_batchId_idx','Expense_occurredOn_payer_status_settlementStatus_idx','Expense_categoryId_idx','Expense_paymentMethodId_idx','RecurringRule_categoryId_idx','RecurringRule_paymentMethodId_idx','InstallmentPlan_categoryId_idx','InstallmentPlan_paymentMethodId_idx')))
      ) AS checks(check_name, passed)
    `);
    const failed = checks.filter((check) => !check.passed).map((check) => check.name);
    if (failed.length > 0) throw new Error(`O schema existente não corresponde ao baseline esperado: ${failed.join(", ")}.`);
  } finally {
    await prisma.$disconnect();
  }

  for (const migration of baselineMigrations) {
    runPrisma(["migrate", "resolve", "--applied", migration]);
  }
}

function runPrisma(args) {
  const result = spawnSync("./node_modules/.bin/prisma", args, {
    env: { ...process.env, PGCONNECT_TIMEOUT: "15" },
    stdio: "inherit",
    timeout: 120_000,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  await baselineExistingSchema();
  runPrisma(["migrate", "deploy"]);
} catch (error) {
  console.error(`Não foi possível executar as migrations: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
