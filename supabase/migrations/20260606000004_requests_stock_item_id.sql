-- Link a request to its resulting stock item after device is returned to office
alter table requests
  add column if not exists stock_item_id text references stocks(id);
