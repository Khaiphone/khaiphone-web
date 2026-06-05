-- Add jobs_attempted column to rider_shifts
-- tracks every job a rider attended (completed + failed), enabling success rate calculation

alter table rider_shifts
  add column if not exists jobs_attempted int default 0;
