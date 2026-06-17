-- Supports the bounded dashboard/appointments query (active OR updated within 90d).
create index if not exists requests_updated_at_idx on requests(updated_at desc);
