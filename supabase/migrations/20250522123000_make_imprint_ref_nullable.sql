ALTER TABLE ritual.flame_progress ADD COLUMN IF NOT EXISTS imprint_ref TEXT, ALTER COLUMN imprint_ref DROP NOT NULL;
