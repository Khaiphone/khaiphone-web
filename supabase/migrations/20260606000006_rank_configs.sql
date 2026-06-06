-- Rank config: one row per tier, admin-editable
CREATE TABLE IF NOT EXISTS rank_configs (
  tier                 TEXT PRIMARY KEY CHECK (tier IN ('bronze','silver','gold','diamond')),
  label_th             TEXT NOT NULL,
  min_jobs_month       INT  NOT NULL DEFAULT 0,    -- jobs this month to reach this tier
  commission_rate      NUMERIC(5,4) NOT NULL DEFAULT 0,   -- e.g. 0.08 = 8%
  fuel_rate_per_km     NUMERIC(6,2) NOT NULL DEFAULT 0,   -- baht per km
  bonus_multiplier     NUMERIC(4,2) NOT NULL DEFAULT 1,   -- multiply monthly bonus by this
  job_target_reduction INT  NOT NULL DEFAULT 0             -- reduce monthly job target by N
);

INSERT INTO rank_configs (tier, label_th, min_jobs_month, commission_rate, fuel_rate_per_km, bonus_multiplier, job_target_reduction)
VALUES
  ('bronze',  'บรอนซ์',   0,  0, 0, 1, 0),
  ('silver',  'ซิลเวอร์', 10, 0, 0, 1, 0),
  ('gold',    'โกลด์',    25, 0, 0, 1, 0),
  ('diamond', 'ไดมอนด์',  40, 0, 0, 1, 0)
ON CONFLICT (tier) DO NOTHING;

-- Admin can manually override a rider's monthly rank
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS rank_tier_override TEXT
    CHECK (rank_tier_override IN ('bronze','silver','gold','diamond'));
