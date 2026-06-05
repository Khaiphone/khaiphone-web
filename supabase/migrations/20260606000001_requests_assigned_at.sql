-- Track when a rider was assigned so we can auto-reclaim jobs not accepted within N minutes

alter table requests
  add column if not exists assigned_at timestamptz;
