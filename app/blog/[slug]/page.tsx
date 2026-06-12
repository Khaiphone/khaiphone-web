import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { blogPosts } from "@/lib/blogData";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khaiphone.com";

// ── Static generation ──────────────────────────────────────────────────────────

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "ไม่พบบทความ | Khaiphone.com" };
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const ogImage = `${SITE_URL}${post.image}`;
  return {
    title: `${post.title} | Khaiphone.com`,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "th_TH",
      siteName: "Khaiphone.com",
      title: post.title,
      description: post.excerpt,
      url: canonical,
      images: [{ url: ogImage, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

// ── Article content ────────────────────────────────────────────────────────────

type Section =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "faq"; items: { q: string; a: string }[] };

const CONTENT: Record<string, Section[]> = {
  "erase-iphone-before-selling": [
    { type: "paragraph", text: "หลายคนที่จะขาย iPhone มักข้ามขั้นตอนนี้ไป หรือทำไม่ครบ ผลที่ตามมาคือข้อมูลส่วนตัวยังอยู่ในเครื่อง หรือที่เกิดขึ้นบ่อยกว่านั้นคือเครื่องติด iCloud ทำให้ผู้ซื้อไม่สามารถใช้งานได้ บทความนี้รวบรวมทุกขั้นตอนที่ต้องทำก่อนส่งมอบ iPhone พร้อมเช็กลิสต์ ทำตามได้เลยทันที" },
    { type: "heading", text: "ทำไมต้องล้างข้อมูลก่อนขาย iPhone?" },
    { type: "paragraph", text: "iPhone เก็บข้อมูลสำคัญไว้มากมาย ทั้งรหัสผ่าน บัตรเครดิต บัญชีแอปธนาคาร รูปภาพส่วนตัว และข้อความ ถ้าไม่ล้างข้อมูลให้ถูกต้อง มีความเสี่ยงสองอย่างหลัก — หนึ่งคือผู้รับเครื่องต่ออาจเข้าถึงข้อมูลส่วนตัวได้ สองคือถ้าไม่ออก iCloud เครื่องจะถูก Activation Lock ทำให้ขายไม่ได้จริงๆ" },
    { type: "heading", text: "ขั้นตอนที่ 1 — Backup ข้อมูลก่อน (อย่าข้าม)" },
    { type: "paragraph", text: "ขั้นตอนแรกที่ต้องทำก่อนทุกอย่างคือ Backup ข้อมูลทั้งหมดออกมาก่อน เพราะหลังจาก Factory Reset แล้ว ข้อมูลทุกอย่างจะหายถาวร ไม่สามารถกู้คืนได้ ทำผ่าน iCloud หรือ Mac/PC ก็ได้" },
    { type: "list", items: [
      "iCloud Backup — เปิด Settings → [ชื่อ] → iCloud → iCloud Backup → Back Up Now (ต้องต่อ Wi-Fi และชาร์จ)",
      "Mac Backup — ต่อสาย USB เปิด Finder เลือก iPhone แล้วคลิก Back Up Now",
      "PC Backup — เปิด iTunes เลือก iPhone แล้วคลิก Back Up Now",
      "รอ Backup เสร็จสมบูรณ์ก่อนไปขั้นตอนถัดไป ตรวจสอบวันเวลา Backup ล่าสุดใน Settings ให้ตรงก่อน",
    ]},
    { type: "callout", text: "อย่าข้ามขั้นตอน Backup เด็ดขาด เพราะหลังจาก Factory Reset แล้ว ข้อมูลทุกอย่างจะหายถาวร ไม่สามารถกู้คืนได้" },
    { type: "heading", text: "ขั้นตอนที่ 2 — ออก iCloud และปิด Find My iPhone (สำคัญที่สุด)" },
    { type: "paragraph", text: "นี่คือขั้นตอนที่สำคัญที่สุด และที่คนมักทำผิดพลาดมากที่สุด ถ้าไม่ออก iCloud เครื่องจะถูก Activation Lock ซึ่งทำให้ผู้ซื้อไม่สามารถตั้งค่าหรือใช้งานเครื่องได้เลย และเจ้าของเดิมเท่านั้นที่ปลด Lock ได้" },
    { type: "list", items: [
      "เปิด Settings → แตะชื่อของคุณที่ด้านบนสุด",
      "แตะ Find My → Find My iPhone → สลับปิด (Toggle OFF)",
      "กรอกรหัสผ่าน Apple ID เพื่อยืนยันการปิด",
      "กลับไปหน้าชื่อ → เลื่อนลงสุด → แตะ Sign Out",
      "เลือกข้อมูลที่ต้องการเก็บ (ถ้ามี) แล้วแตะ Sign Out",
      "รอระบบดำเนินการ — iCloud จะถูกยกเลิกการเชื่อมต่อจากเครื่องนี้",
    ]},
    { type: "callout", text: "ถ้าจำรหัสผ่าน Apple ID ไม่ได้ ให้รีเซ็ตที่ iforgot.apple.com ก่อน เป็นขั้นตอนที่ข้ามไม่ได้เด็ดขาด ร้านรับซื้อที่น่าเชื่อถือทุกร้านจะไม่รับเครื่องที่ยังมี iCloud อยู่" },
    { type: "heading", text: "ขั้นตอนที่ 3 — Factory Reset (Erase All Content and Settings)" },
    { type: "paragraph", text: "หลังออก iCloud สำเร็จแล้ว ให้ทำ Factory Reset เพื่อลบข้อมูลทั้งหมดออกจากเครื่องอย่างสมบูรณ์ ขั้นตอนนี้ iPhone จะล้างข้อมูลทุกอย่างและกลับมาเป็นเครื่องใหม่" },
    { type: "list", items: [
      "เปิด Settings → General",
      "เลื่อนลงด้านล่าง แตะ Transfer or Reset iPhone",
      "แตะ Erase All Content and Settings",
      "อ่านคำเตือน แล้วแตะ Continue",
      "กรอก Passcode ของเครื่อง (ถ้ามี) เพื่อยืนยัน",
      "รอ iPhone รีสตาร์ทและล้างข้อมูล ใช้เวลาประมาณ 2–5 นาที",
      "เครื่องจะแสดงหน้า Hello — หมายความว่าสำเร็จแล้ว พร้อมส่งมอบ",
    ]},
    { type: "heading", text: "ขั้นตอนที่ 4 — ถอด SIM Card ออก" },
    { type: "paragraph", text: "ขั้นตอนสุดท้ายที่คนมักลืมบ่อยที่สุด ใช้ SIM Ejector Tool (เข็มถาด SIM) แทงรูเล็กด้านข้างตัวเครื่อง ถาด SIM จะดีดออกมา นำ SIM Card ออกเก็บไว้หรือย้ายไปใส่โทรศัพท์เครื่องใหม่ก่อนส่งมอบ" },
    { type: "heading", text: "เช็กลิสต์ก่อนส่งมอบ iPhone" },
    { type: "list", items: [
      "Backup ข้อมูลเรียบร้อยแล้ว (iCloud หรือ Mac/PC)",
      "Find My iPhone ปิดแล้ว",
      "ออก iCloud / Sign out Apple ID สำเร็จแล้ว",
      "Factory Reset เสร็จแล้ว (หน้า Hello แสดงอยู่)",
      "ถอด SIM Card ออกแล้ว",
      "เตรียมกล่องและอุปกรณ์เสริม (ถ้ามี)",
    ]},
    { type: "callout", text: "เมื่อทำครบทุกข้อแล้ว iPhone พร้อมส่งมอบ ผู้ซื้อสามารถตั้งค่าและใช้งานได้ทันที ไม่มีข้อมูลของคุณหลงเหลืออยู่" },
    { type: "heading", text: "คำถามที่พบบ่อยเกี่ยวกับการล้างข้อมูล iPhone ก่อนขาย" },
    { type: "faq", items: [
      { q: "ถ้าจำรหัสผ่าน Apple ID ไม่ได้ จะออก iCloud ได้ไหม?", a: "ต้องรีเซ็ตรหัสผ่านก่อนครับ เข้าที่ iforgot.apple.com แล้วรีเซ็ตผ่านเบอร์โทรหรืออีเมลสำรอง ถ้าลืมทั้งหมด Apple มีกระบวนการ Account Recovery แต่อาจใช้เวลาหลายวัน ไม่มีทางลัดสำหรับขั้นตอนนี้" },
      { q: "Factory Reset แล้ว ข้อมูลยังอยู่ไหม?", a: "ไม่ครับ Erase All Content and Settings จะลบข้อมูลทั้งหมดถาวร ไม่สามารถกู้คืนได้ นั่นคือเหตุผลที่ต้อง Backup ก่อนเสมอ" },
      { q: "iPhone ที่ยังติด iCloud อยู่ ขายที่ร้านรับซื้อได้ไหม?", a: "ไม่ได้ครับ ร้านรับซื้อที่น่าเชื่อถือทุกร้านจะไม่รับเครื่องที่ยังมี iCloud อยู่ เพราะผู้ซื้อต่อไปจะไม่สามารถใช้งานเครื่องได้เลย จำเป็นต้องออก iCloud ก่อนทุกครั้ง" },
      { q: "ทำทั้งหมดใช้เวลานานแค่ไหน?", a: "รวมทุกขั้นตอนประมาณ 15–30 นาทีครับ ส่วนใหญ่เวลาจะอยู่ที่การรอ Backup ขึ้นอยู่กับขนาดข้อมูลและความเร็ว Wi-Fi ส่วน Factory Reset ใช้เวลาประมาณ 2–5 นาที" },
      { q: "iPhone เปิดไม่ติด จะล้างข้อมูลได้ไหม?", a: "ถ้าเปิดไม่ติดเลย อาจต้องใช้ Recovery Mode ครับ ต่อ iPhone กับ Mac/PC แล้วใช้ Finder (Mac) หรือ iTunes (PC) เพื่อ Restore ถ้าเครื่องมีปัญหาหนัก แจ้งร้านรับซื้อให้ทราบก่อน หลายร้านยังรับซื้อได้แต่ราคาจะปรับตามสภาพ" },
    ]},
  ],

  "iphone-broken-screen": [
    { type: "paragraph", text: "หนึ่งในคำถามที่พบบ่อยที่สุดจากลูกค้าคือ iPhone จอแตก ยังขายได้ไหม? คำตอบคือ ได้ครับ — เรารับซื้อ iPhone จอแตกทุกรุ่น แต่ราคาจะต่างกันขึ้นอยู่กับระดับความเสียหาย" },
    { type: "heading", text: "แตกแบบไหนยังรับซื้อ?" },
    { type: "list", items: [
      "จอแตกนิ้วเดียว ยังแสดงภาพปกติ — ราคาลดเล็กน้อยจากปกติ",
      "จอแตกหลายเส้น ยังใช้งานได้ — ราคาลดปานกลาง",
      "จอแตกทั้งหน้า สัมผัสได้บ้าง — ราคาลดมากขึ้น",
      "จอดำ แสดงผลไม่ได้ — รับซื้อ แต่ต้องประเมินจากส่วนอื่น",
    ]},
    { type: "callout", text: "เครื่องที่จอแตกหนักแต่เนื้อเครื่องดี แบตดี iCloud ออกแล้ว ยังได้ราคาดีกว่าที่คิดไว้มาก" },
    { type: "heading", text: "ปัจจัยอื่นที่ส่งผลต่อราคา" },
    { type: "paragraph", text: "นอกจากสภาพจอ ยังมีปัจจัยสำคัญอื่นที่ส่งผลต่อราคารับซื้อ เช่น สภาพเนื้อเครื่อง (มีรอยกด บิดหรือเปล่า) สุขภาพแบตเตอรี่ ความจุ รุ่น และว่าออก iCloud หรือยัง" },
    { type: "heading", text: "ขั้นตอนการขาย iPhone จอแตก" },
    { type: "list", items: [
      "ประเมินราคาออนไลน์ฟรี ใช้เวลาไม่ถึง 1 นาที",
      "ออก iCloud และ Sign out Apple ID ให้เรียบร้อย",
      "นัดรับถึงที่หรือส่งพัสดุมาประเมิน",
      "ทีมงานตรวจสอบและยืนยันราคา",
      "รับเงินสดทันที",
    ]},
  ],

  "iphone-price-may-2024": [
    { type: "paragraph", text: "ราคารับซื้อ iPhone เดือนพฤษภาคม 2569 อัปเดตล่าสุด — ราคาเหล่านี้เป็นราคาประเมินเบื้องต้นสำหรับเครื่องสภาพดี ออก iCloud แล้ว มีกล่อง" },
    { type: "heading", text: "ราคารับซื้อ iPhone Series 17" },
    { type: "table", headers: ["รุ่น", "ความจุ", "ราคาสูงสุด"], rows: [
      ["iPhone 17 Pro Max", "256GB", "฿38,000"],
      ["iPhone 17 Pro",     "256GB", "฿32,000"],
      ["iPhone 17",         "128GB", "฿25,000"],
      ["iPhone 17 Air",     "128GB", "฿22,000"],
    ]},
    { type: "heading", text: "ราคารับซื้อ iPhone Series 16" },
    { type: "table", headers: ["รุ่น", "ความจุ", "ราคาสูงสุด"], rows: [
      ["iPhone 16 Pro Max", "256GB", "฿30,000"],
      ["iPhone 16 Pro",     "256GB", "฿25,000"],
      ["iPhone 16",         "128GB", "฿18,000"],
      ["iPhone 16 Plus",    "128GB", "฿19,000"],
    ]},
    { type: "callout", text: "ราคาข้างต้นเป็นราคาเบื้องต้นสำหรับเครื่องสภาพดีมาก ราคาจริงอาจสูงหรือต่ำกว่าขึ้นอยู่กับสภาพเครื่องจริง" },
    { type: "heading", text: "ปัจจัยที่ทำให้ราคาลด" },
    { type: "list", items: [
      "จอแตก รอยขีด สีซีด",
      "แบตเตอรี่ต่ำกว่า 80%",
      "ไม่มีกล่อง ไม่มีอุปกรณ์",
      "ยังติด iCloud (ราคาลดมาก)",
      "เครื่อง ZP/A หรือ TH/A บางรุ่นต่างกัน",
    ]},
  ],

  "what-to-delete-before-sell": [
    { type: "paragraph", text: "ก่อนส่งมอบ iPhone ให้ผู้รับซื้อ มีสิ่งสำคัญที่ต้องทำให้ครบทุกข้อ เพื่อปกป้องข้อมูลส่วนตัวและให้การขายราบรื่น" },
    { type: "heading", text: "เช็กลิสต์ 5 อย่างก่อนขาย iPhone" },
    { type: "list", items: [
      "Backup ข้อมูลขึ้น iCloud หรือ Mac/PC — เพื่อให้นำข้อมูลไปใช้บน iPhone เครื่องใหม่ได้",
      "ปิด Find My iPhone (ออก iCloud) — สำคัญมาก ถ้าไม่ออก iCloud จะขายไม่ได้",
      "Sign out Apple ID จากทุก App — Settings → [ชื่อ] → Sign Out",
      "Factory Reset (ลบข้อมูลทั้งหมด) — Settings → General → Transfer or Reset iPhone → Erase All Content",
      "นำ SIM การ์ดออก — อย่าลืม ก่อนส่งมอบเครื่อง",
    ]},
    { type: "callout", text: "ขั้นตอนสำคัญที่สุดคือออก iCloud ก่อนเสมอ มิฉะนั้นเครื่องจะถูก Activation Lock และขายไม่ได้" },
    { type: "heading", text: "ขั้นตอนการออก iCloud แบบละเอียด" },
    { type: "list", items: [
      "เปิด Settings → แตะชื่อของคุณด้านบน",
      "เลื่อนลงมาด้านล่างสุด แตะ Sign Out",
      "กรอกรหัสผ่าน Apple ID",
      "เลือกว่าต้องการเก็บข้อมูลอะไรไว้ใน iPhone แล้วแตะ Sign Out",
      "ยืนยัน — iPhone จะออกจาก iCloud และ Find My จะปิดโดยอัตโนมัติ",
    ]},
    { type: "heading", text: "หลังจากทำครบแล้ว" },
    { type: "paragraph", text: "เมื่อ Factory Reset เสร็จ iPhone จะรีสตาร์ทและแสดงหน้าต้อนรับ (Hello Screen) พร้อมสำหรับผู้ซื้อรายใหม่ ตอนนี้สามารถส่งมอบเครื่องได้อย่างปลอดภัยแล้ว" },
  ],

  "macbook-buyback-2024": [
    { type: "paragraph", text: "ปี 2569 เรารับซื้อ MacBook ทุกรุ่นที่ใช้ชิป Apple Silicon (M1 ขึ้นไป) รวมถึง Intel รุ่นใหม่ๆ ด้วย ราคาดี ประเมินไว จ่ายเงินสดทันที" },
    { type: "heading", text: "MacBook รุ่นที่รับซื้อและราคาประมาณ" },
    { type: "table", headers: ["รุ่น", "ชิป", "ราคาสูงสุด"], rows: [
      ["MacBook Pro 16\" M3 Max", "M3 Max", "฿75,000"],
      ["MacBook Pro 14\" M3 Pro", "M3 Pro", "฿55,000"],
      ["MacBook Pro 13\" M2",     "M2",     "฿32,000"],
      ["MacBook Air 15\" M3",     "M3",     "฿38,000"],
      ["MacBook Air 13\" M2",     "M2",     "฿28,000"],
      ["MacBook Air 13\" M1",     "M1",     "฿20,000"],
    ]},
    { type: "callout", text: "ราคาขึ้นอยู่กับ RAM, Storage, สภาพเครื่อง และ Battery Cycle Count — ยิ่งน้อยยิ่งดี" },
    { type: "heading", text: "สิ่งที่ต้องเตรียมก่อนขาย MacBook" },
    { type: "list", items: [
      "Sign out Apple ID และ iCloud ใน System Settings",
      "ปิด Find My Mac",
      "Erase All Content and Settings (macOS Ventura ขึ้นไป) หรือ Erase via Recovery Mode",
      "ชาร์จแบตให้เต็มก่อนส่งมอบ",
      "เตรียมกล่องและสายชาร์จถ้ามี",
    ]},
    { type: "heading", text: "ทำไมต้องเช็ก Battery Cycle Count?" },
    { type: "paragraph", text: "Battery Cycle Count บอกว่าแบตใช้มาแล้วกี่รอบ Apple ออกแบบแบตให้ทนได้ 1,000 cycles โดยยังรักษาความจุ 80% MacBook ที่ Cycle Count ต่ำ (ไม่เกิน 300) จะได้ราคาดีกว่าอย่างชัดเจน" },
  ],

  "when-to-sell-iphone-best-price": [
    { type: "paragraph", text: "ลูกค้าที่มาขาย iPhone 14 Pro Max กับเราเมื่อต้นปีได้ไป 17,000 บาท คนที่ขายเครื่องเดียวกันเมื่อปลายปีก่อนได้ 19,500 บาท ต่างกัน 2,500 บาท แค่เพราะถือไว้นานกว่า 6 เดือน เรื่องนี้เกิดขึ้นทุกรุ่น ทุกปี — iPhone ราคาตกไม่ใช่แค่ตามอายุ แต่ตามช่วงเวลาของปีด้วย" },
    { type: "heading", text: "ตัวเลขจริงจากราคารับซื้อวันนี้" },
    { type: "paragraph", text: "ดูจาก Pro Max lineup ที่เราจ่ายอยู่ตอนนี้ เทียบกับราคาเปิดตัว จะเห็นภาพชัดขึ้นว่าเงินหายไปเท่าไหร่ในแต่ละปี" },
    { type: "table", headers: ["รุ่น", "ราคาเปิดตัว 256GB", "ราคารับซื้อวันนี้", "เหลือ %"], rows: [
      ["iPhone 17 Pro Max", "48,900 บาท", "39,000 บาท", "80%"],
      ["iPhone 16 Pro Max", "48,900 บาท", "28,500 บาท", "58%"],
      ["iPhone 15 Pro Max", "48,900 บาท", "22,200 บาท", "45%"],
      ["iPhone 14 Pro Max", "44,900 บาท", "17,000 บาท", "38%"],
      ["iPhone 13 Pro Max", "46,900 บาท", "13,000 บาท", "28%"],
      ["iPhone 11 Pro Max", "45,900 บาท", "4,800 บาท",  "10%"],
    ]},
    { type: "paragraph", text: "การตกที่หนักที่สุดอยู่ในช่วงปีแรกถึงปีที่สอง iPhone 16 Pro Max อายุยังไม่ครบปีแต่ราคาหายไปแล้วกว่า 20,000 บาท หลังจากนั้นราคาตกช้าลงเรื่อยๆ แต่ไม่หยุด iPhone 11 Pro Max อายุหกปียังขายได้อยู่ เพราะยังใช้งานได้จริง ยังรับ iOS ล่าสุดได้ และยังมีคนต้องการ" },
    { type: "heading", text: "สามช่วงที่ราคาตกเร็วกว่าปกติ" },
    { type: "paragraph", text: "ราคาไม่ได้ตกเป็นเส้นตรง มีช่วงที่ราคาดิ่งแบบเห็นได้ชัด ถ้าถือเครื่องข้ามช่วงเหล่านี้ไป ราคาที่หายไปจะรู้สึกได้" },
    { type: "list", items: [
      "มิถุนายน–กรกฎาคม — ข่าว iPhone รุ่นถัดไปเริ่มออกมา ตลาดมือสองเริ่มระมัดระวัง ราคารับซื้อรุ่นปัจจุบันเริ่มขยับลง 5–10%",
      "กันยายน (วัน Apple Event) — ราคาตกทันทีในวันเดียวกับที่ Apple ประกาศรุ่นใหม่ บางรุ่นตก 2,000–5,000 บาทภายในสัปดาห์เดียว",
      "หลังอายุ 2 ปี (25–30 เดือน) — เป็นจุดที่รุ่นนั้นห่างจาก lineup ปัจจุบันสองรุ่นแล้ว ราคาตกสม่ำเสมอและไม่กลับขึ้นมาอีก",
    ]},
    { type: "callout", text: "ถ้ากำลังคิดจะขาย เดือนพฤษภาคม–กรกฎาคมคือช่วงดีที่สุดของปี ก่อนกระแส iPhone ใหม่จะมา ราคายังไม่ถูกกดลงจากข่าว" },
    { type: "heading", text: "ขายตอนไหนถึงจะคุ้มที่สุด" },
    { type: "paragraph", text: "ไม่มีคำตอบเดียวที่ใช้ได้กับทุกคน ขึ้นอยู่กับว่าซื้อมาตั้งใจถือนานแค่ไหน แต่จากประสบการณ์ที่เราเห็นทุกวัน นี่คือ pattern ของคนที่ขายได้ราคาดีที่สุด" },
    { type: "list", items: [
      "ซื้อตอน release กันยายน → ขายก่อนกรกฎาคมปีถัดไป = ถือ 10 เดือน ยังได้ราคาดีมาก ต้นทุนการใช้งานต่อเดือนถูกที่สุด",
      "ถ้าจะถือ 2 ปี → ขายก่อน Apple Event ของปีที่สอง (สิงหาคม) ดีกว่ารอหลัง event เพราะราคาจะตกทันที",
      "ถือมาแล้ว 3 ปีขึ้นไป → ขายเลย อย่ารอ ราคาจะตกต่อเรื่อยๆ และไม่มีช่วงที่กลับขึ้นมาแล้ว",
    ]},
    { type: "heading", text: "สิ่งที่ทำให้ราคาตกเร็วกว่าปกติ" },
    { type: "paragraph", text: "นอกจากเวลา สภาพเครื่องมีผลโดยตรงต่อราคาที่ได้ สามอย่างนี้ทำให้ราคาต่ำกว่าที่ควรได้บ่อยที่สุด" },
    { type: "list", items: [
      "แบตเตอรี่ต่ำกว่า 80% — ราคาลด 1,500–3,000 บาทขึ้นอยู่กับรุ่น เช็คได้ที่ Settings → Battery → Battery Health & Charging",
      "ประวัติซ่อมนอกศูนย์ โดยเฉพาะจอหรือแบต — ราคาลด 10–20% เพราะชิ้นส่วนไม่ใช่ของแท้ Apple",
      "ไม่มีกล่อง — ต่างกันประมาณ 500–1,000 บาทแล้วแต่รุ่น เก็บกล่องไว้ถ้ายังมีอยู่",
    ]},
    { type: "faq", items: [
      { q: "iPhone อายุ 2 ปี ยังได้ราคาดีไหม?", a: "ได้ครับ แต่ขึ้นอยู่กับรุ่น iPhone Pro หรือ Pro Max อายุ 2 ปียังได้ราคากว่า 45–55% ของราคาเปิดตัว ส่วนรุ่นมาตรฐานตกเร็วกว่าเล็กน้อย ประเมินราคาก่อนตัดสินใจเสมอ" },
      { q: "ราคารับซื้อเปลี่ยนทุกวันไหม?", a: "ราคาเราอัปเดตตามตลาดเป็นประจำ ช่วงที่ขยับมากที่สุดคือก่อนและหลัง Apple Event เดือนกันยายน ราคาที่แสดงบนเว็บเป็นราคาปัจจุบันเสมอ" },
      { q: "แบตต่ำกว่า 80% ควรเปลี่ยนแบตก่อนขายไหม?", a: "ไม่แนะนำครับ ค่าเปลี่ยนแบต Apple แท้อยู่ที่ 1,500–2,500 บาท แต่ราคาที่ได้เพิ่มขึ้นมาอาจไม่คุ้ม ยกเว้นถ้าแบตต่ำมากๆ เช่น 70% ลงไป ลองประเมินราคาเปรียบเทียบก่อนตัดสินใจ" },
    ]},
  ],

  "battery-health-iphone-price": [
    { type: "paragraph", text: "ลูกค้าถามเรื่องนี้เกือบทุกวัน \"แบตเหลือ 78% ราคาจะตกเยอะไหม?\" คำตอบสั้นๆ คือ ใช่ แต่ตกไม่เท่ากันทุกกรณี และส่วนใหญ่ไม่คุ้มที่จะเปลี่ยนแบตก่อนขาย" },
    { type: "heading", text: "ตัวเลขจริงจากระบบประเมินราคาของเรา" },
    { type: "paragraph", text: "เราคำนวณราคารับซื้อโดยหักตามสุขภาพแบตแบบนี้" },
    { type: "table", headers: ["สุขภาพแบต", "หักจากราคาปกติ"], rows: [
      ["100%",                        "ไม่หัก"],
      ["มากกว่า 90%",                 "-200 บาท"],
      ["85–90%",                      "-500 บาท"],
      ["80–84%",                      "-1,000 บาท"],
      ["ต่ำกว่า 80% (Service Recommend)", "-2,000 บาท"],
    ]},
    { type: "paragraph", text: "ตัวเลขนี้คือส่วนต่างที่แท้จริง ไม่ใช่แค่เกรดคุณภาพ แบต 79% กับ 81% ต่างกันถึง 1,000 บาทในทางราคา" },
    { type: "heading", text: "เปลี่ยนแบตก่อนขายคุ้มไหม?" },
    { type: "paragraph", text: "นี่คือคำถามสำคัญ ค่าเปลี่ยนแบตแท้ที่ iCare (Apple Authorized Service Provider) ปัจจุบันอยู่ที่" },
    { type: "table", headers: ["รุ่น", "ค่าเปลี่ยนแบต (iCare)"], rows: [
      ["iPhone 13 series",     "~3,290 บาท"],
      ["iPhone 14–15 series",  "~3,690 บาท"],
      ["iPhone 16 / 16 Plus",  "~3,690 บาท"],
      ["iPhone 16 Pro / Max",  "~4,590 บาท"],
    ]},
    { type: "paragraph", text: "เทียบกัน: จ่ายค่าเปลี่ยนแบต 3,290–4,590 บาท แต่ราคาขายได้เพิ่มขึ้นแค่ 2,000 บาท — ขาดทุนทุกกรณี เว้นแต่สองสถานการณ์นี้" },
    { type: "list", items: [
      "แบตต่ำกว่า 70% และเครื่องราคาสูง เช่น iPhone 15 Pro Max ราคา 22,000 บาท — ส่วนต่างอาจคุ้มขึ้นมาได้",
      "ต้องการขายด้วยตัวเองในราคาสูงกว่าร้านรับซื้อ เช่นลง Marketplace แล้วราคาสูงกว่า 3,000 บาท",
    ]},
    { type: "callout", text: "สรุปง่ายๆ: ถ้าจะขายให้ร้านรับซื้อ ไม่ต้องเปลี่ยนแบต ขายเลยดีกว่า ประหยัดทั้งเงินและเวลา" },
    { type: "heading", text: "แบตที่เท่าไหร่ถือว่า \"ยังโอเค\"?" },
    { type: "paragraph", text: "Apple เองระบุว่าแบต iPhone ออกแบบมาให้ยังใช้งานได้ดีที่ 80% หลังชาร์จครบ 500 รอบ ในทางราคารับซื้อ เราแบ่งเป็น 3 กลุ่ม" },
    { type: "list", items: [
      "85% ขึ้นไป — ราคาแทบไม่กระทบ หักน้อยมาก (200–500 บาท)",
      "80–84% — หัก 1,000 บาท ยังขายได้สบาย ไม่ต้องกังวล",
      "ต่ำกว่า 80% — หัก 2,000 บาท ยังขายได้อยู่ แต่ราคาจะต่ำกว่าปกติชัดเจน",
    ]},
    { type: "heading", text: "เช็คสุขภาพแบตยังไง?" },
    { type: "list", items: [
      "ตั้งค่า → Battery → Battery Health & Charging → ดูตัวเลข Maximum Capacity",
      "ถ้าขึ้น \"Service Recommended\" แสดงว่าต่ำกว่า 80% แล้ว",
      "เวลาเอามาขายที่ร้าน เราตรวจแบตให้ด้วยเครื่องมือ ไม่ต้องเดา",
    ]},
    { type: "faq", items: [
      { q: "แบต 79% กับ 80% ต่างกันมากไหม?", a: "ต่างกัน 1,000 บาทเลยครับ เพราะ 79% เข้าเกณฑ์ Service Recommend ซึ่งหักเพิ่ม 2,000 บาท แทนที่จะหักแค่ 1,000 บาทของกลุ่ม 80-84% ถ้าแบตอยู่ที่ 79-80% ลองชาร์จให้เต็มแล้วมาตรวจที่ร้านได้เลย เราดูตัวเลขจริงก่อนประเมิน" },
      { q: "ถ้าแบตแค่ 65% ยังขายได้ไหม?", a: "ขายได้ครับ แต่ราคาจะต่ำกว่าปกติ 2,000 บาท ถ้าเครื่องยังสภาพดีในส่วนอื่น ราคาก็ยังโอเค ถ้าแบตต่ำขนาดนี้และอยากได้ราคาดีกว่า อาจลองคำนวณว่าเปลี่ยนแบตก่อนแล้วขายใน Marketplace คุ้มกว่าไหม" },
      { q: "เราดูแลแบตยังไงไม่ให้เสื่อมเร็ว?", a: "หลีกเลี่ยงชาร์จทิ้งไว้ 100% ค้างคืนบ่อยๆ เปิด Optimized Battery Charging ใน iOS ไว้เสมอ และหลีกเลี่ยงให้แบตหมดจนเหลือ 0% บ่อยๆ แค่นี้แบตก็อยู่ได้นาน" },
    ]},
  ],

  "trade-in-vs-sell-iphone": [
    { type: "paragraph", text: "หลายคนที่คิดจะเปลี่ยน iPhone ใหม่ มักนึกถึงการเทรดอินกับศูนย์บริการ Apple อย่าง Studio7 หรือ iStudio เป็นตัวเลือกแรก เพราะดูสะดวกและน่าเชื่อถือ แต่ก่อนตัดสินใจ ลองเปรียบเทียบตัวเลขจริงก่อนว่าวิธีไหนได้เงินมากกว่า" },
    { type: "heading", text: "เทรดอินกับศูนย์ Apple คืออะไร?" },
    { type: "paragraph", text: "การเทรดอินกับ Studio7 หรือ iStudio คือการนำ iPhone เก่าไปแลกเป็น 'ส่วนลด' เพื่อซื้อ iPhone เครื่องใหม่ที่ร้าน ราคาที่ได้จากการเทรดอินไม่ใช่เงินสด — ใช้ได้เฉพาะเป็นส่วนลดซื้อเครื่องใหม่ที่ร้านนั้นเท่านั้น ถ้าไม่ได้ซื้อเครื่องใหม่ ก็ใช้ไม่ได้เลย" },
    { type: "callout", text: "ราคาเทรดอินที่ศูนย์ Apple = ส่วนลดซื้อเครื่องใหม่เท่านั้น ไม่ใช่เงินสด ถ้าอยากได้เงินสดจริง ต้องขายที่ร้านรับซื้อโดยตรง" },
    { type: "heading", text: "เปรียบเทียบราคา iPhone 17 Series" },
    { type: "table", headers: ["รุ่น (ความจุต่ำสุด)", "Studio7 เทรดอิน", "ร้านรับซื้อ (เงินสด)", "ได้เพิ่ม"], rows: [
      ["iPhone 17 256GB", "฿18,000", "฿22,500", "+฿4,500"],
      ["iPhone 17 Air 256GB", "฿20,500", "฿22,200", "+฿1,700"],
      ["iPhone 17 Pro 256GB", "฿28,500", "฿34,000", "+฿5,500"],
      ["iPhone 17 Pro Max 256GB", "฿35,000", "฿39,000", "+฿4,000"],
      ["iPhone 17e 128GB", "ไม่รับซื้อ", "฿15,000", "—"],
    ]},
    { type: "heading", text: "เปรียบเทียบราคา iPhone 16 Series" },
    { type: "table", headers: ["รุ่น (ความจุต่ำสุด)", "Studio7 เทรดอิน", "ร้านรับซื้อ (เงินสด)", "ได้เพิ่ม"], rows: [
      ["iPhone 16 128GB", "฿15,500", "฿18,000", "+฿2,500"],
      ["iPhone 16 Plus 128GB", "฿18,000", "฿21,000", "+฿3,000"],
      ["iPhone 16 Pro 128GB", "฿19,500", "฿22,500", "+฿3,000"],
      ["iPhone 16 Pro Max 256GB", "฿24,000", "฿28,500", "+฿4,500"],
    ]},
    { type: "heading", text: "เปรียบเทียบราคา iPhone 15 Series" },
    { type: "table", headers: ["รุ่น (ความจุต่ำสุด)", "Studio7 เทรดอิน", "ร้านรับซื้อ (เงินสด)", "ได้เพิ่ม"], rows: [
      ["iPhone 15 128GB", "฿11,000", "฿14,700", "+฿3,700"],
      ["iPhone 15 Plus 128GB", "฿13,000", "฿16,000", "+฿3,000"],
      ["iPhone 15 Pro 128GB", "฿14,500", "฿18,700", "+฿4,200"],
      ["iPhone 15 Pro Max 256GB", "฿17,000", "฿22,200", "+฿5,200"],
    ]},
    { type: "heading", text: "เปรียบเทียบราคา iPhone 14 Series" },
    { type: "table", headers: ["รุ่น (ความจุต่ำสุด)", "Studio7 เทรดอิน", "ร้านรับซื้อ (เงินสด)", "ได้เพิ่ม"], rows: [
      ["iPhone 14 128GB", "฿8,500", "฿10,500", "+฿2,000"],
      ["iPhone 14 Plus 128GB", "฿9,500", "฿12,500", "+฿3,000"],
      ["iPhone 14 Pro 128GB", "฿12,000", "฿15,700", "+฿3,700"],
      ["iPhone 14 Pro Max 128GB", "฿13,500", "฿17,000", "+฿3,500"],
    ]},
    { type: "heading", text: "เปรียบเทียบราคา iPhone 13 Series" },
    { type: "table", headers: ["รุ่น (ความจุต่ำสุด)", "Studio7 เทรดอิน", "ร้านรับซื้อ (เงินสด)", "ได้เพิ่ม"], rows: [
      ["iPhone 13 128GB", "฿7,000", "฿8,500", "+฿1,500"],
      ["iPhone 13 Pro 128GB", "฿8,000", "฿12,000", "+฿4,000"],
      ["iPhone 13 Pro Max 128GB", "฿9,500", "฿13,000", "+฿3,500"],
    ]},
    { type: "heading", text: "สรุป: เทรดอินหรือขายเอง ทางไหนได้คุ้มกว่า?" },
    { type: "paragraph", text: "จากตัวเลขข้างต้น การขายที่ร้านรับซื้อโดยตรงให้เงินสดมากกว่าการเทรดอินที่ศูนย์เฉลี่ย 1,500 – 5,500 บาท ขึ้นอยู่กับรุ่น ยิ่งรุ่น Pro และ Pro Max ส่วนต่างยิ่งมาก" },
    { type: "list", items: [
      "เทรดอินที่ศูนย์ — สะดวก ได้ส่วนลดซื้อเครื่องใหม่ทันที แต่ราคาต่ำกว่าตลาดและใช้ได้เฉพาะซื้อเครื่องใหม่ที่ร้านนั้นเท่านั้น",
      "ขายที่ร้านรับซื้อ — ได้เงินสดจริง นำไปใช้ได้ทุกอย่าง ซื้อเครื่องใหม่ที่ไหนก็ได้ในราคาที่ดีกว่า",
    ]},
    { type: "callout", text: "ถ้าคุณวางแผนซื้อ iPhone ใหม่อยู่แล้ว และไม่ได้รีบ แนะนำให้ขายเครื่องเก่าที่ร้านรับซื้อก่อน จะได้เงินสดเพิ่มขึ้น 1,500 – 5,500 บาท แล้วค่อยนำไปซื้อเครื่องใหม่ได้ตามใจชอบ ไม่ต้องผูกกับร้านใดร้านหนึ่ง" },
    { type: "faq", items: [
      { q: "เทรดอินที่ Studio7 หรือ iStudio ราคาต่างกันไหม?", a: "ต่างกันเล็กน้อยครับ แต่โดยรวมอยู่ในระดับใกล้เคียงกัน เพราะทั้งคู่เป็น Apple Authorized Reseller และมีโปรแกรมเทรดอินที่คล้ายกัน ราคาจริงอาจปรับตามโปรโมชั่นช่วงนั้น" },
      { q: "เทรดอินได้ทุกสภาพไหม?", a: "ศูนย์ Apple รับเทรดอินเครื่องที่อยู่ในสภาพดีถึงปานกลาง ถ้าเครื่องมีรอยแตกหนักหรือความเสียหายมาก มักถูกปฏิเสธหรือได้ราคาต่ำมากครับ" },
      { q: "ขายที่ร้านรับซื้อต้องเตรียมอะไรบ้าง?", a: "เตรียม iPhone ที่ออก iCloud แล้ว พร้อมบัตรประชาชน สภาพเครื่องยิ่งดีได้ราคาสูงกว่า กล่องและอุปกรณ์เสริมช่วยเพิ่มราคาได้เล็กน้อยครับ" },
      { q: "ราคาในตารางนี้ใช้ได้นานแค่ไหน?", a: "ราคารับซื้อเปลี่ยนแปลงตามตลาด ข้อมูลในบทความนี้อ้างอิงจากราคา Studio7 และร้านรับซื้อ ณ มิถุนายน 2569 แนะนำให้ประเมินราคาจริงก่อนตัดสินใจเสมอครับ" },
    ]},
  ],
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const sections = CONTENT[slug] ?? [];
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);
  const canonical = `${SITE_URL}/blog/${post.slug}`;

  const faqItems = sections
    .filter((s): s is Extract<typeof s, { type: "faq" }> => s.type === "faq")
    .flatMap((s) => s.items);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    image: `${SITE_URL}${post.image}`,
    url: canonical,
    author: { "@type": "Organization", name: "Khaiphone.com", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Khaiphone.com", url: SITE_URL },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "บทความ", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  const faqSchema = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <Header />

      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
          <Link href="/" className="hover:text-black transition-colors">หน้าแรก</Link>
          <ChevronRight size={12} />
          <Link href="/blog" className="hover:text-black transition-colors">บทความ</Link>
          <ChevronRight size={12} />
          <span
            className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
            style={{ background: "#B8860B" }}
          >
            {post.category}
          </span>
        </div>
      </div>

      {/* Article header */}
      <div className="px-4 py-10 md:py-14" style={{ background: "#f9f9f7", borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-black leading-snug mb-5">
            {post.title}
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: "#6B7280" }}>
            {post.excerpt}
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
              <Calendar size={13} />{post.displayDate}
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
              <Clock size={13} />{post.readTime}
            </span>
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div className="px-4 pb-2" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt={post.title} className="w-full rounded-2xl" style={{ display: "block", maxHeight: 480, objectFit: "contain" }} />
        </div>
      </div>

      {/* Article body */}
      <article className="px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">

          {sections.map((section, i) => {
            if (section.type === "heading") {
              return (
                <h2 key={i} className="text-xl md:text-2xl font-bold text-black mt-8 mb-3 leading-snug">
                  {section.text}
                </h2>
              );
            }
            if (section.type === "paragraph") {
              return (
                <p key={i} className="text-sm md:text-base leading-relaxed mb-4" style={{ color: "#374151" }}>
                  {section.text}
                </p>
              );
            }
            if (section.type === "list") {
              return (
                <ul key={i} className="flex flex-col gap-2.5 mb-5 pl-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm md:text-base" style={{ color: "#374151" }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5" style={{ background: "#B8860B" }}>
                        {j + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }
            if (section.type === "callout") {
              return (
                <div key={i} className="flex items-start gap-3 rounded-2xl px-5 py-4 my-5" style={{ background: "rgba(184,134,11,0.07)", border: "1.5px solid rgba(184,134,11,0.2)" }}>
                  <span className="flex-shrink-0 text-base mt-0.5">💡</span>
                  <p className="text-sm leading-relaxed font-medium" style={{ color: "#374151" }}>{section.text}</p>
                </div>
              );
            }
            if (section.type === "faq") {
              return (
                <div key={i} className="mt-2 mb-5">
                  {section.items.map(({ q, a }, j) => (
                    <details key={j} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <summary
                        className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none"
                        style={{ listStyle: "none" }}
                      >
                        <span className="font-semibold text-black text-sm md:text-base leading-snug">{q}</span>
                        <span className="flex-shrink-0 font-bold text-lg" style={{ color: "#B8860B" }}>+</span>
                      </summary>
                      <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
                    </details>
                  ))}
                </div>
              );
            }
            if (section.type === "table") {
              return (
                <div key={i} className="rounded-xl overflow-hidden my-5" style={{ border: "1px solid #E5E7EB" }}>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                        {section.headers.map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#374151" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: ri < section.rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-3" style={{ color: ci === row.length - 1 ? "#B8860B" : "#374151", fontWeight: ci === row.length - 1 ? 700 : ci === 0 ? 500 : 400 }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })}

          {/* CTA inline */}
          <div className="mt-10 rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{ background: "rgba(184,134,11,0.07)", border: "1.5px solid rgba(184,134,11,0.2)" }}>
            <div className="flex-1">
              <p className="font-bold text-black mb-1">อยากรู้ราคาขายเครื่องของคุณ?</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>ประเมินฟรีภายใน 1 นาที ไม่มีค่าใช้จ่าย ไม่ผูกมัด</p>
            </div>
            <a
              href="/sell"
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: "#B8860B" }}
            >
              ประเมินราคาฟรี →
            </a>
          </div>

          {/* Back link */}
          <div className="mt-8 pt-8" style={{ borderTop: "1px solid #F3F4F6" }}>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-black"
              style={{ color: "#6B7280" }}
            >
              <ArrowLeft size={14} />
              กลับไปหน้าบทความทั้งหมด
            </Link>
          </div>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="px-4 pb-12 md:pb-16" style={{ borderTop: "1px solid #F3F4F6", background: "#f9f9f7" }}>
          <div className="max-w-3xl mx-auto pt-10">
            <h2 className="text-lg font-bold text-black mb-6">บทความที่เกี่ยวข้อง</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col gap-2.5"
                  style={{ textDecoration: "none" }}
                >
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span
                      className="absolute bottom-2.5 left-2.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                      style={{ background: "#B8860B" }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-black leading-snug line-clamp-2 group-hover:text-[#B8860B] transition-colors">
                    {p.title}
                  </p>
                  <span className="text-xs" style={{ color: "#6B7280" }}>{p.displayDate}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
