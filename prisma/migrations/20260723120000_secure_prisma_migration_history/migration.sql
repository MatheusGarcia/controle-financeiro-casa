-- Prisma accesses its migration history through the database owner. The Data API
-- roles must not be able to inspect or modify this internal table.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
ON TABLE public."_prisma_migrations"
FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = '_prisma_migrations'
      AND policyname = 'deny_anon_migration_history_access'
  ) THEN
    CREATE POLICY "deny_anon_migration_history_access"
    ON public."_prisma_migrations"
    FOR ALL TO anon
    USING (false)
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = '_prisma_migrations'
      AND policyname = 'deny_authenticated_migration_history_access'
  ) THEN
    CREATE POLICY "deny_authenticated_migration_history_access"
    ON public."_prisma_migrations"
    FOR ALL TO authenticated
    USING (false)
    WITH CHECK (false);
  END IF;
END
$$;

-- This application uses Prisma exclusively on the server. Keep future tables
-- private by default so a new migration cannot accidentally expose them through
-- the Supabase Data API before RLS and explicit policies are configured.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES
FROM anon, authenticated;
