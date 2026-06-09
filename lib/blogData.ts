export interface BlogPost {
  id: number;
  category: string;
  date: string;        // ISO "YYYY-MM-DD" — used for sorting
  displayDate: string; // Thai display string — used for rendering
  readTime: string;
  title: string;
  excerpt: string;
  image: string;
  slug: string;
  keywords?: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 5,
    category: "วิธีขาย",
    date: "2026-05-27",
    displayDate: "27 พ.ค. 2569",
    readTime: "5 นาที",
    title: "วิธีล้างข้อมูล iPhone ก่อนขาย ให้ปลอดภัย 100%",
    excerpt: "ก่อนส่งมอบ iPhone ต้องทำ 4 ขั้นตอนนี้ให้ครบ เพื่อป้องกันข้อมูลส่วนตัวหลุด และให้เครื่องพร้อมใช้งานสำหรับผู้ซื้อทันที มีเช็กลิสต์ครบ",
    image: "/blog_iphone-delete.webp",
    slug: "erase-iphone-before-selling",
    keywords: ["วิธีล้างข้อมูล iPhone ก่อนขาย", "ออก iCloud ก่อนขาย", "factory reset iPhone ก่อนขาย", "เตรียม iPhone ก่อนขาย"],
  },
  {
    id: 1,
    category: "วิธีขาย",
    date: "2026-05-20",
    displayDate: "20 พ.ค. 2569",
    readTime: "4 นาที",
    title: "iPhone จอแตก ขายได้ไหม?",
    excerpt: "สภาพแบบนี้ยังรับซื้ออยู่หรือเปล่า มีวิธีประเมินราคายังไงบ้าง มาดูกัน",
    image: "/blog_iphone-broken.webp",
    slug: "iphone-broken-screen",
  },
  {
    id: 2,
    category: "ราคาล่าสุด",
    date: "2026-05-18",
    displayDate: "18 พ.ค. 2569",
    readTime: "3 นาที",
    title: "อัปเดตราคารับซื้อ iPhone (พฤษภาคม 2569)",
    excerpt: "เช็กราคาล่าสุดทุกรุ่น อัปเดตทุกวัน ให้คุณขายได้ในราคาที่ดีที่สุด",
    image: "/blog_iphone-price.webp",
    slug: "iphone-price-may-2024",
  },
  {
    id: 3,
    category: "ความรู้",
    date: "2026-05-17",
    displayDate: "17 พ.ค. 2569",
    readTime: "5 นาที",
    title: "ขาย iPhone ต้องลบอะไรบ้างก่อนไปขาย?",
    excerpt: "เช็กลิสต์ 5 อย่างที่ต้องทำก่อนขายเพื่อความปลอดภัยของข้อมูลคุณ",
    image: "/blog_iphone-data.webp",
    slug: "what-to-delete-before-sell",
  },
  {
    id: 4,
    category: "MacBook",
    date: "2026-05-15",
    displayDate: "15 พ.ค. 2569",
    readTime: "3 นาที",
    title: "รับซื้อ MacBook รุ่นไหนบ้างในปี 2569",
    excerpt: "รวมรุ่นที่เรารับซื้อ ราคาดี ไว ได้เงินเร็ว ไม่ต้องรอนาน",
    image: "/blog_macbook.webp",
    slug: "macbook-buyback-2024",
  },
];
