-- Rider KPI targets stored per-rider in admin_users
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS monthly_jobs_target     int          DEFAULT 20,
  ADD COLUMN IF NOT EXISTS monthly_distance_target int          DEFAULT 500,
  ADD COLUMN IF NOT EXISTS min_acceptance_rate     numeric(3,2) DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS monthly_bonus_jobs      int,
  ADD COLUMN IF NOT EXISTS monthly_bonus_amount    int;
