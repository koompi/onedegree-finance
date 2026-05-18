-- Migration: add transfer support and is_personal/receipt_url columns
-- Run once against the production database

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES accounts(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_personal ON transactions(company_id, is_personal);
