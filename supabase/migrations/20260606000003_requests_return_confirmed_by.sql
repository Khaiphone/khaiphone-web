-- Track who at the office confirmed device return
alter table requests
  add column if not exists returned_confirmed_by_id   uuid references auth.users(id),
  add column if not exists returned_confirmed_by_name text;
