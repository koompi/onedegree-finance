-- Migration 005: Recurring transactions

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  type           TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents   BIGINT NOT NULL,
  currency_input TEXT DEFAULT 'KHR',
  note           TEXT,
  frequency      TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_run_date  DATE NOT NULL,
  last_run_date  DATE,
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_company   ON recurring_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_run  ON recurring_transactions(next_run_date) WHERE active = TRUE;
