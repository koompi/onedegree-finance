-- Add is_personal flag to transactions for personal vs business tracking
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for filtering business-only transactions in reports
CREATE INDEX IF NOT EXISTS idx_transactions_is_personal ON transactions(company_id, is_personal);
