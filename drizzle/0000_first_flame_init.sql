------------------------------------------------------------
--  First-Flame ritual – initial, idempotent migration
--  • Enum lives in PUBLIC (so every schema can use it)
--  • Tables live in a dedicated  ritual  schema
--  • Trigger keeps updated_at fresh
--  • All statements are IF-NOT-EXISTS-safe
------------------------------------------------------------

------------------------------
-- 0️⃣  ritual schema
------------------------------
CREATE SCHEMA IF NOT EXISTS ritual;
--> statement-breakpoint


------------------------------
-- 1️⃣  Enum (public)
------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'first_flame_stage'
  ) THEN
    CREATE TYPE public.first_flame_stage AS ENUM (
      'ritual_initiation_attempt',
      'ritual_initiation_success',
      'ritual_initiation_failure_db',
      'ritual_initiation_failure_rate_limit',
      'ritual_initiation_failure_already_active',
      'ritual_imprint_submitted',
      'ritual_day_completed',
      'ritual_completed'
    );
  END IF;
END$$;
--> statement-breakpoint


------------------------------
-- 2️⃣  Log table
------------------------------
CREATE TABLE IF NOT EXISTS ritual.first_flame_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quest_id   text                    NOT NULL,
  stage      public.first_flame_stage NOT NULL,
  context    jsonb                   NOT NULL,
  created_at timestamptz             NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_first_flame_logs_uid
  ON ritual.first_flame_logs(uid);
--> statement-breakpoint


------------------------------
-- 3️⃣  Progress table
------------------------------
CREATE TABLE IF NOT EXISTS ritual.flame_progress (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_day_target int  NOT NULL CHECK (current_day_target BETWEEN 1 AND 5),
  is_quest_complete  boolean     NOT NULL DEFAULT false,
  last_imprint_at    timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_flame_progress_user UNIQUE (user_id)
);
--> statement-breakpoint


------------------------------
-- 4️⃣  Trigger to auto-update  updated_at
------------------------------
CREATE OR REPLACE FUNCTION ritual.trg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS set_updated_at ON ritual.flame_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON ritual.flame_progress
  FOR EACH ROW EXECUTE FUNCTION ritual.trg_set_updated_at();
--> statement-breakpoint


------------------------------
-- 5️⃣  (optional) RLS policy
------------------------------
ALTER TABLE ritual.flame_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_rw ON ritual.flame_progress;
CREATE POLICY owner_rw
  ON ritual.flame_progress
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
