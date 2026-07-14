-- Content pipeline: บทความ blog จาก skill (draft) → รีวิว → publish
-- ของเดิม (lib/blogData.ts) ยังอยู่ static; ตารางนี้เก็บบทความใหม่จาก pipeline

CREATE TABLE IF NOT EXISTS articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  status        text NOT NULL DEFAULT 'pending_review'
                CHECK (status IN ('pending_review', 'published', 'archived')),
  title         text NOT NULL,
  excerpt       text NOT NULL DEFAULT '',
  category      text NOT NULL DEFAULT 'บทความ',
  read_time     text NOT NULL DEFAULT '5 นาที',
  keywords      text[],
  article_date  date NOT NULL DEFAULT CURRENT_DATE,
  display_date  text NOT NULL DEFAULT '',
  hero_image    text,                      -- ว่างจาก skill; admin อัปโหลดก่อน publish
  content       jsonb NOT NULL DEFAULT '[]',-- Section[] (โครงเดียวกับบทความเดิม)
  meta_title    text,
  meta_description text,
  source        text NOT NULL DEFAULT 'skill', -- 'skill' | 'manual'
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (status, article_date DESC) WHERE status = 'published';

ALTER TABLE articles ENABLE ROW LEVEL SECURITY; -- service role (server) bypass; ไม่มี policy = client อ่านไม่ได้ตรงๆ

-- Storage bucket สำหรับรูปบทความ (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog', 'blog', true)
ON CONFLICT (id) DO NOTHING;

-- อ่านรูปสาธารณะได้ (บทความบนเว็บ)
DROP POLICY IF EXISTS "blog images public read" ON storage.objects;
CREATE POLICY "blog images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog');
