-- ============================================================
-- Khaiphone RLS Policies
-- รันใน Supabase Dashboard > SQL Editor
-- ============================================================

-- ── requests ────────────────────────────────────────────────
-- ลูกค้า: insert ได้อย่างเดียว (submit คำขอ)
-- Admin server actions ใช้ service_role key → bypass RLS อัตโนมัติ

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_requests" ON requests;
CREATE POLICY "anon_insert_requests" ON requests
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "authed_all_requests" ON requests;
CREATE POLICY "authed_all_requests" ON requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── estimate_events ──────────────────────────────────────────
-- ลูกค้า: insert ได้ (track events)
-- อ่านได้เฉพาะ authenticated (admin)

ALTER TABLE estimate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_estimate_events" ON estimate_events;
CREATE POLICY "anon_insert_estimate_events" ON estimate_events
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "authed_select_estimate_events" ON estimate_events;
CREATE POLICY "authed_select_estimate_events" ON estimate_events
  FOR SELECT TO authenticated USING (true);


-- ── admin_users ──────────────────────────────────────────────
-- ห้าม anon เข้าถึงเด็ดขาด — service_role เท่านั้น

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authed_all_admin_users" ON admin_users;
CREATE POLICY "authed_all_admin_users" ON admin_users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── products / pricing_config / stock_price_rules ────────────
-- อ่านได้ทุกคน (หน้า sell ต้องใช้), แก้ได้เฉพาะ authenticated

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_products" ON products;
CREATE POLICY "public_read_products" ON products FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "authed_all_products" ON products;
CREATE POLICY "authed_all_products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_pricing_config" ON pricing_config;
CREATE POLICY "public_read_pricing_config" ON pricing_config FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "authed_all_pricing_config" ON pricing_config;
CREATE POLICY "authed_all_pricing_config" ON pricing_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE stock_price_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_stock_price_rules" ON stock_price_rules;
CREATE POLICY "public_read_stock_price_rules" ON stock_price_rules FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "authed_all_stock_price_rules" ON stock_price_rules;
CREATE POLICY "authed_all_stock_price_rules" ON stock_price_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── stocks / expenses / finance_* ────────────────────────────
-- admin เท่านั้น (authenticated + service_role)

ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authed_all_stocks" ON stocks;
CREATE POLICY "authed_all_stocks" ON stocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authed_all_expenses" ON expenses;
CREATE POLICY "authed_all_expenses" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE finance_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authed_all_finance_audit_logs" ON finance_audit_logs;
CREATE POLICY "authed_all_finance_audit_logs" ON finance_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authed_all_finance_settings" ON finance_settings;
CREATE POLICY "authed_all_finance_settings" ON finance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
