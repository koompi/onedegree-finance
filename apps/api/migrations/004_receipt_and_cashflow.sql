-- Migration 004: receipt photos + daily summary log

-- Add receipt photo URL to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Store Telegram chat_id on users (same as telegram_id for DMs, but explicit)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Track which companies have received daily summaries to avoid duplicate sends
CREATE TABLE IF NOT EXISTS daily_summary_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  summary_date DATE NOT NULL,
  UNIQUE(company_id, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_log_date ON daily_summary_log(summary_date);
