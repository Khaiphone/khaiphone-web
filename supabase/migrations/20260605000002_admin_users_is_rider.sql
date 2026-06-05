-- Add is_rider permission flag to admin_users
-- Controls who can access the /rider app
-- Owners always pass the gate regardless; staff need is_rider = true

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS is_rider boolean NOT NULL DEFAULT false;

-- Grant access to all existing users so nobody is locked out on deploy
UPDATE admin_users SET is_rider = true;
