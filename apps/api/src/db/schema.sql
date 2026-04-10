-- OneDegree Finance Schema
-- Run this on the database to add missing indexes

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  name TEXT,
  username TEXT,
  lang TEXT DEFAULT 'km',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  currency_base TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',
  balance_cents BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_km TEXT,
  type TEXT NOT NULL,
  icon TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  category_id UUID REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount_cents BIGINT NOT NULL,
  amount_khr BIGINT,
  exchange_rate NUMERIC(12,4),
  currency_input TEXT DEFAULT 'USD',
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'USD',
  due_date DATE,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT DEFAULT 'USD',
  due_date DATE,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_occurred ON transactions(occurred_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_transactions_company_month ON transactions(company_id, to_char(occurred_at, 'YYYY-MM'));
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(company_id, type);

CREATE INDEX IF NOT EXISTS idx_receivables_company ON receivables(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(company_id, status);

CREATE INDEX IF NOT EXISTS idx_payables_company ON payables(company_id);
CREATE INDEX IF NOT EXISTS idx_payables_status ON payables(company_id, status);

-- Additional critical performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON transactions(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_company_category ON transactions(company_id, category_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(company_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(company_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON transactions(created_at);

-- Combined filtering indexes for Reports
CREATE INDEX IF NOT EXISTS idx_report_agg ON transactions(company_id, type, amount_cents, occurred_at);

CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);

-- System default categories
INSERT INTO categories (name, name_km, type, icon, is_system) VALUES
  ('Sales', 'ការលក់', 'income', '💰', TRUE),
  ('Services', 'សេវាកម្ម', 'income', '🛠️', TRUE),
  ('Investment', 'ការវិនិយោគ', 'income', '📈', TRUE),
  ('Other Income', 'ចំណូលផ្សេងៗ', 'income', '➕', TRUE),
  ('Materials/Inputs', 'វត្ថុធាតុដើម', 'expense', '📦', TRUE),
  ('Labor', 'កម្មករ', 'expense', '👷', TRUE),
  ('Transport', 'ដឹកជញ្ជូន', 'expense', '🚛', TRUE),
  ('Rent', 'ជួល', 'expense', '🏠', TRUE),
  ('Utilities', 'ទឹក/អគ្គិសនី', 'expense', '💡', TRUE),
  ('Admin', 'រដ្ឋបាល', 'expense', '📋', TRUE),
  ('Loan Repayment', 'សងប្រាក់កម្ចី', 'expense', '🏦', TRUE),
  ('Other Expense', 'ចំណាយផ្សេងៗ', 'expense', '➖', TRUE)
ON CONFLICT DO NOTHING;

-- Inventory tables (added for v2)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_km TEXT,
  unit TEXT DEFAULT 'ឯកការា',
  current_qty NUMERIC DEFAULT 0,
  avg_cost_cents BIGINT DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  qty NUMERIC NOT NULL,
  cost_per_unit_cents BIGINT DEFAULT 0,
  note TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_company ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company ON inventory_movements(company_id);
