-- Add default_amount_cents to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS default_amount_cents BIGINT;
