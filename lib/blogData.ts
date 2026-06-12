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
    id: 8,
    category: "ราคาล่าสุด",
    date: "2026-06-15",
    displayDate: "15 มิ.ย. 2569",
    readTime: "5 นาที",
    title: "เทรดอิน iPhone กับศูนย์ Apple ได้คุ้มจริงไหม? เทียบตัวเลขก่อนตัดสินใจ",
    excerpt: "เปรียบเทียบราคาเทรดอิน Studio7 vs ร้านรับซื้อทุกรุ่น iPhone 13–17 พร้อมตัวเลขส่วนต่างที่ต่างกันสูงสุด 5,500 บาท",
    image: "/blog_iphone-price.webp",
    slug: "trade-in-vs-sell-iphone",
    keywords: ["เทรดอิน iPhone", "เทรดอิน vs ขายเอง", "Studio7 เทรดอิน ราคา", "ขาย iPhone ได้เงินมากกว่า"],
  },
  {
    id: 7,
    category: "วิธีขาย",
    date: "2026-06-12",
    displayDate: "12 มิ.ย. 2569",
    readTime: "4 นาที",
    title: "แบตต่ำกว่า 80% ราคาตกจริงไหม?",
    excerpt: "ดูตัวเลขจริงจากระบบประเมินราคาของเรา — แบตแต่ละระดับหักเท่าไหร่ และควรเปลี่ยนแบตก่อนขายไหม",
    image: "/blog_iphone-battery.webp",
    slug: "battery-health-iphone-price",
    keywords: ["แบต iPhone ต่ำกว่า 80%", "เปลี่ยนแบตก่อนขาย iPhone", "แบตเสื่อม ราคาตก"],
  },
  {
    id: 6,
    category: "ราคาล่าสุด",
    date: "2026-06-10",
    displayDate: "10 มิ.ย. 2569",
    readTime: "5 นาที",
    title: "ราคา iPhone ตกเร็วแค่ไหน และควรขายตอนไหนถึงจะได้ราคาดีที่สุด",
    excerpt: "ดูตัวเลขจริงจากราคารับซื้อวันนี้ — iPhone แต่ละรุ่นเหลือกี่เปอร์เซ็นต์ของราคาเปิดตัว และช่วงเวลาไหนที่ราคาตกเร็วที่สุดในรอบปี",
    image: "/blog_iphone-depreciation.webp",
    slug: "when-to-sell-iphone-best-price",
    keywords: ["ราคา iPhone ตก", "ควรขาย iPhone ตอนไหน", "iPhone มือสองราคาเท่าไหร่", "ขาย iPhone ได้เงินเท่าไหร่"],
  },
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
