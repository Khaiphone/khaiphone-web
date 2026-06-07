-- Staff personal info
alter table admin_users
  add column if not exists phone        text,
  add column if not exists position     text,
  add column if not exists started_at   date,
  add column if not exists note         text;

-- Rider vehicle info
alter table rider_profiles
  add column if not exists vehicle_type            text,  -- 'motorcycle' | 'car'
  add column if not exists vehicle_brand           text,
  add column if not exists vehicle_model           text,
  add column if not exists license_plate           text,
  add column if not exists driver_license_number   text,
  add column if not exists driver_license_expiry   date,
  add column if not exists vehicle_tax_expiry      date;
