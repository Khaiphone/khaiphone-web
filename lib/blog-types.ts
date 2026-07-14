// โครงสร้างบทความ (ใช้ร่วมกันทั้งบทความ static เดิม และบทความจาก DB pipeline)

export type Section =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }          // H2
  | { type: "subheading"; text: string }       // H3 (ลำดับหัวข้อย่อย)
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "image"; src: string; alt?: string; caption?: string }; // src "" = ช่องรูปว่าง (รอ admin ใส่)

export interface Article {
  slug: string;
  category: string;
  date: string;         // ISO "YYYY-MM-DD" — sort
  displayDate: string;  // ข้อความไทย — render
  readTime: string;
  title: string;
  excerpt: string;
  image: string;        // hero (อาจว่างสำหรับ draft)
  keywords?: string[];
  content: Section[];
  metaTitle?: string;
  metaDescription?: string;
}

// ข้อมูลย่อสำหรับการ์ด "บทความที่เกี่ยวข้อง" / รายการ
export interface ArticleCard {
  slug: string;
  category: string;
  title: string;
  image: string;
  displayDate: string;
  date: string;
  excerpt: string;
  keywords?: string[];
  readTime?: string;
}
