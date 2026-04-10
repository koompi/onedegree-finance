-- Migration 001: RBAC and Period Locking
-- Run this to add team_members and period_locks tables

-- Team members table for RBAC
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Period locks table
CREATE TABLE IF NOT EXISTS period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'), -- YYYY-MM format
  locked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, period)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_company ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(company_id, active);
CREATE INDEX IF NOT EXISTS idx_period_locks_company ON period_locks(company_id);
CREATE INDEX IF NOT EXISTS idx_period_locks_period ON period_locks(company_id, period);

-- Function to check if period is locked
CREATE OR REPLACE FUNCTION is_period_locked(company_uuid UUID, period_text TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM period_locks
    WHERE company_id = company_uuid AND period = period_text
  );
$$ LANGUAGE SQL STABLE;

-- Function to get user role in company
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID, company_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM team_members
  WHERE user_id = user_uuid AND company_id = company_uuid AND active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL STABLE;
