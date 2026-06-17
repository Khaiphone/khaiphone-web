-- Performance indexes for the hot lookup paths on requests / stocks.
-- These tables were created via the Supabase dashboard (not earlier migrations),
-- so filtered/ordered queries were doing full table scans. All additive + idempotent.

-- requests: dashboards, lists, appointments, rider assignment, order lookup
create index if not exists requests_status_idx        on requests(status);
create index if not exists requests_assigned_to_idx    on requests(assigned_to) where assigned_to is not null;
create index if not exists requests_rider_id_idx       on requests(rider_id)    where rider_id is not null;
create index if not exists requests_appt_date_idx      on requests(appt_date);
create index if not exists requests_created_at_idx     on requests(created_at desc);
create index if not exists requests_order_number_idx   on requests(order_number);
create index if not exists requests_source_idx         on requests(source);
create index if not exists requests_stock_item_id_idx  on requests(stock_item_id) where stock_item_id is not null;

-- stocks: inventory list, IMEI dedupe check, request linkage
create index if not exists stocks_status_idx        on stocks(status);
create index if not exists stocks_imei_idx          on stocks(imei)        where imei is not null;
create index if not exists stocks_request_ref_idx   on stocks(request_ref) where request_ref is not null;
create index if not exists stocks_received_at_idx   on stocks(received_at desc);

-- request_activity_logs: recent-activity feed scoped by order number
create index if not exists request_activity_logs_created_idx on request_activity_logs(created_at desc);
create index if not exists request_activity_logs_order_idx   on request_activity_logs(order_number);
