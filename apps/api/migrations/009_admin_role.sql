-- Add 'admin' role to team_members
-- Admin = same as owner but cannot delete the company itself

ALTER TABLE team_members DROP CONSTRAINT team_members_role_check;
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'staff'::text]));
