insert into rider_system_settings (key, value) values
  ('sla_arrive_radius_m',   '500'),
  ('sla_dispatch_good_min', '120'),
  ('sla_dispatch_warn_min', '30'),
  ('sla_arrive_ontime_min', '5'),
  ('sla_arrive_slight_min', '20'),
  ('sla_job_fast_min',      '30'),
  ('sla_job_slight_min',    '60')
on conflict (key) do nothing;
