-- Add receipt_url and note to receivables
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS receipt_url TEXT;
-- note column already exists from create, just ensure it's there
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS note TEXT;
