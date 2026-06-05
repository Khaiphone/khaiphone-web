-- ============================================================
-- Phase 1: Rider Tracking — Foundation
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

-- ─── rider_profiles ─────────────────────────────────────────
create table if not exists rider_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  is_rider             boolean default false,
  consent_location     boolean default false,
  consent_granted_at   timestamptz,
  consent_revoked_at   timestamptz,
  consent_version      int default 1,
  work_zones           jsonb default '[]',
  max_concurrent_jobs  int default 1,
  vehicle_type         text default 'motorcycle',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

alter table rider_profiles enable row level security;

create policy "rider_own_profile" on rider_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin_read_rider_profiles" on rider_profiles
  for select using (
    exists(select 1 from admin_users where user_id = auth.uid() and role in ('owner','staff'))
  );

create policy "admin_update_rider_profiles" on rider_profiles
  for update using (
    exists(select 1 from admin_users where user_id = auth.uid() and role in ('owner'))
  );

-- ─── rider_shifts ────────────────────────────────────────────
create table if not exists rider_shifts (
  id                 uuid primary key default gen_random_uuid(),
  rider_id           uuid not null references auth.users(id) on delete cascade,
  clocked_in_at      timestamptz default now(),
  clocked_out_at     timestamptz,
  clock_in_lat       double precision,
  clock_in_lng       double precision,
  clock_out_lat      double precision,
  clock_out_lng      double precision,
  jobs_completed     int default 0,
  jobs_declined      int default 0,
  total_distance_km  double precision default 0,
  ended_reason       text,
  created_at         timestamptz default now()
);

create index if not exists rider_shifts_rider_idx on rider_shifts(rider_id, clocked_in_at desc);
create index if not exists rider_shifts_open_idx  on rider_shifts(rider_id) where clocked_out_at is null;

alter table rider_shifts enable row level security;

create policy "rider_own_shifts" on rider_shifts
  for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

create policy "admin_read_shifts" on rider_shifts
  for select using (
    exists(select 1 from admin_users where user_id = auth.uid() and role in ('owner','staff'))
  );

-- ─── rider_locations ─────────────────────────────────────────
create table if not exists rider_locations (
  rider_id          uuid primary key references auth.users(id) on delete cascade,
  lat               double precision not null,
  lng               double precision not null,
  accuracy_m        double precision,
  heading           double precision,
  speed_kmh         double precision,
  battery_pct       int,
  is_online         boolean default true,
  current_job_id    uuid references requests(id) on delete set null,
  shift_id          uuid references rider_shifts(id) on delete set null,
  tracking_mode     text not null default 'idle',
  app_state         text default 'foreground',
  last_heartbeat    timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists rider_locations_online_idx    on rider_locations(is_online) where is_online = true;
create index if not exists rider_locations_heartbeat_idx on rider_locations(last_heartbeat);

alter table rider_locations enable row level security;

create policy "rider_own_location" on rider_locations
  for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

create policy "admin_read_locations" on rider_locations
  for select using (
    exists(select 1 from admin_users where user_id = auth.uid() and role in ('owner','staff'))
  );

-- ─── rider_location_history ──────────────────────────────────
create table if not exists rider_location_history (
  id          bigserial primary key,
  rider_id    uuid not null references auth.users(id) on delete cascade,
  job_id      uuid references requests(id) on delete set null,
  shift_id    uuid references rider_shifts(id) on delete set null,
  lat         double precision not null,
  lng         double precision not null,
  accuracy_m  double precision,
  recorded_at timestamptz default now()
);

create index if not exists rider_history_rider_time_idx on rider_location_history(rider_id, recorded_at desc);
create index if not exists rider_history_job_idx        on rider_location_history(job_id) where job_id is not null;

alter table rider_location_history enable row level security;

create policy "admin_read_history" on rider_location_history
  for select using (
    exists(select 1 from admin_users where user_id = auth.uid() and role in ('owner','staff'))
  );

-- service role writes history (server action uses service key)

-- ─── rider_alerts ────────────────────────────────────────────
create table if not exists rider_alerts (
  id          uuid primary key default gen_random_uuid(),
  rider_id    uuid references auth.users(id) on delete cascade,
  job_id      uuid references requests(id) on delete set null,
  alert_type  text not null,
  severity    text default 'warn',
  message     text,
  resolved_at timestamptz,
  created_at  timestamptz default now()
);

create index if not exists rider_alerts_unresolved_idx on rider_alerts(rider_id) where resolved_at is null;

alter table rider_alerts enable row level security;

create policy "admin_manage_alerts" on rider_alerts
  for all using (
    exists(select 1 from admin_users where user_id = auth.uid() and role in ('owner','staff'))
  );

-- ─── Extend requests table ───────────────────────────────────
alter table requests
  add column if not exists appt_lat           double precision,
  add column if not exists appt_lng           double precision,
  add column if not exists rider_assigned_at  timestamptz,
  add column if not exists rider_enroute_at   timestamptz,
  add column if not exists rider_arrived_at   timestamptz,
  add column if not exists rider_return_at    timestamptz,
  add column if not exists rider_returned_at  timestamptz,
  add column if not exists travel_distance_km double precision;

-- ─── Enable Realtime on rider_locations ─────────────────────
-- Run in Supabase dashboard: Table Editor → rider_locations → Enable Realtime
-- Or via CLI: supabase realtime enable --table rider_locations

-- ─── Cron: mark stale riders offline (every 1 min) ──────────
-- Requires pg_cron extension enabled in Supabase dashboard first
-- select cron.schedule('mark-stale-riders-offline', '* * * * *', $$
--   update rider_locations
--   set is_online = false, tracking_mode = 'idle'
--   where is_online = true
--     and last_heartbeat < now() - interval '90 seconds';
-- $$);

-- ─── Cron: purge old location history (daily 03:00) ─────────
-- select cron.schedule('purge-old-location-history', '0 3 * * *', $$
--   delete from rider_location_history where recorded_at < now() - interval '7 days';
-- $$);

-- ─── Cron: auto-close stale shifts (every 5 min) ────────────
-- select cron.schedule('auto-close-stale-shifts', '*/5 * * * *', $$
--   update rider_shifts
--   set clocked_out_at = clocked_in_at + interval '8 hours',
--       ended_reason = 'auto_timeout'
--   where clocked_out_at is null
--     and clocked_in_at < now() - interval '16 hours';
-- $$);
