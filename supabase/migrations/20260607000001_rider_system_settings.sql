create table if not exists rider_system_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

insert into rider_system_settings (key, value) values
  ('office_lat',              '14.0100'),
  ('office_lng',              '100.7197'),
  ('office_name',             'สำนักงาน Khaiphone'),
  ('shift_auto_timeout_min',  '60'),
  ('location_interval_sec',   '30'),
  ('return_radius_m',         '500')
on conflict (key) do nothing;
