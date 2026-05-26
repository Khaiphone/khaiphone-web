import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Phone, MessageCircle, MapPin, Clock, CheckCircle, Truck, Banknote, Search, ChevronRight } from "lucide-react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khaiphone.com";

// ─── Location data ────────────────────────────────────────────────────────────

const locations = {
  rangsit: {
    slug: "rangsit",
    name: "รังสิต",
    province: "ปทุมธานี",
    fullName: "รังสิต ปทุมธานี",
    h1: "รับซื้อ iPhone รังสิต ให้ราคาสูง จ่ายเงินสดทันที",
    heroDesc:
      "บริการรับซื้อ iPhone, iPad, MacBook, Apple Watch ในพื้นที่รังสิตและธัญบุรี รับถึงที่ ราคาดี ไม่ต้องเดินทางออกนอกพื้นที่",
    serviceAreas: ["รังสิต", "ธัญบุรี", "คลองสี่", "คลองห้า", "คลองหก", "ลำผักชี", "บึงยี่โถ"],
    landmarks: ["Future Park รังสิต", "มหาวิทยาลัยธรรมศาสตร์ รังสิต", "โรงพยาบาลธรรมศาสตร์", "ตลาดรังสิต", "นิคมอุตสาหกรรมนวนคร"],
    areaBlurb:
      "ให้บริการครอบคลุมทั่วรังสิต ธัญบุรี และพื้นที่ใกล้เคียง ไม่ว่าจะอยู่คอนโดย่าน Future Park หรือหมู่บ้านลึกสุดในคลองหก เราเข้าถึงได้หมด ไม่มีค่าบริการเพิ่มเติม",
    uniqueFact: "พื้นที่รังสิต-ธัญบุรีเป็นเขตที่เราให้บริการหลัก เดินทางถึงไวที่สุด มักนัดหมายได้ภายในวันเดียวกัน",
    faqs: [
      {
        q: "รับซื้อ iPhone ในรังสิตได้เร็วแค่ไหน?",
        a: "เนื่องจากรังสิตเป็นพื้นที่หลักที่เราตั้งอยู่ สามารถนัดหมายรับซื้อถึงที่ได้ภายในวันเดียวกัน หรือแม้แต่ 1-2 ชั่วโมง ขึ้นอยู่กับเวลาที่สะดวก",
      },
      {
        q: "ให้บริการรับซื้อถึงที่ในธัญบุรีและคลองหกด้วยไหม?",
        a: "ใช่ครับ ครอบคลุมทั้งรังสิต ธัญบุรี คลองสี่ คลองห้า คลองหก และย่านนวนคร ไม่มีค่าเดินทางเพิ่มเติม",
      },
      {
        q: "ถ้าอยู่คอนโดในรังสิต นัดรับที่ห้องได้เลยไหม?",
        a: "ได้เลยครับ นัดรับที่คอนโด หมู่บ้าน หรือสถานที่ที่สะดวก เจ้าหน้าที่จะขึ้นไปถึงที่ ไม่ต้องลงมาข้างล่าง",
      },
      {
        q: "นักศึกษาธรรมศาสตร์รังสิตสามารถขาย iPhone ได้ไหม?",
        a: "ได้ครับ นักศึกษาใช้บัตรนักศึกษาแทนบัตรประชาชนได้ สามารถนัดรับที่หอพักหรือแถวมหาวิทยาลัยได้เลย",
      },
      {
        q: "ขาย MacBook ที่ซื้อมาจาก iStudio Future Park ได้ไหม?",
        a: "ได้ครับ รับซื้อ MacBook ทุกรุ่นทุกแหล่งที่มา ทั้ง Air และ Pro ทุก chip ตรวจสอบและให้ราคาในวันที่นัดหมาย",
      },
    ],
  },

  pathumthani: {
    slug: "pathumthani",
    name: "ปทุมธานี",
    province: "ปทุมธานี",
    fullName: "ปทุมธานี",
    h1: "รับซื้อ iPhone ปทุมธานี ให้ราคาสูง จ่ายเงินสดทันที",
    heroDesc:
      "บริการรับซื้อ iPhone, iPad, MacBook, Apple Watch ในเขตปทุมธานีและพื้นที่ใกล้เคียง รับถึงที่ ไม่ต้องเดินทางไกล ได้เงินทันที",
    serviceAreas: ["เมืองปทุมธานี", "สามโคก", "ลาดหลุมแก้ว", "ธัญบุรี", "หนองเสือ", "คลองหลวง", "บึงยี่โถ"],
    landmarks: ["ตลาดไท", "เซ็นทรัล ปทุม", "โรงพยาบาลปทุมธานี", "ศาลากลางจังหวัดปทุมธานี", "นิคมอุตสาหกรรมบางกะดี"],
    areaBlurb:
      "ให้บริการทั่วอำเภอเมืองปทุมธานีและอำเภอใกล้เคียง ทั้งสามโคก ลาดหลุมแก้ว และธัญบุรี ไม่มีค่าเดินทางเพิ่มเติมสำหรับพื้นที่ในจังหวัด",
    uniqueFact: "ปทุมธานีเป็นจังหวัดที่เราอยู่และให้บริการมาตั้งแต่เริ่มต้น คนในพื้นที่รู้จักเราดี สั่งสมความไว้วางใจมาอย่างต่อเนื่อง",
    faqs: [
      {
        q: "รับซื้อ iPhone ในเมืองปทุมธานีได้ไหม?",
        a: "ได้เลยครับ ให้บริการทั่วอำเภอเมืองปทุมธานี รับถึงที่ฟรีไม่มีค่าเดินทาง สามารถนัดหมายได้ตั้งแต่ 09:00 – 00:00 น.",
      },
      {
        q: "คนทำงานในนิคมอุตสาหกรรมปทุมธานีขายไอโฟนได้ไหม?",
        a: "ได้ครับ สามารถนัดหมายรับที่หน้านิคมหรือที่พักใกล้เคียงได้เลย ไม่ต้องเสียเวลาออกไปไกล",
      },
      {
        q: "ถ้าอยู่ย่านตลาดไทหรือบางกะดี รับซื้อได้ไหม?",
        a: "ได้ครับ ตลาดไท บางกะดี และแถวนั้นอยู่ในพื้นที่บริการ นัดหมายได้เลยโดยไม่มีค่าใช้จ่ายเพิ่ม",
      },
      {
        q: "ขาย iPad ที่ซื้อมาหลายปีแล้วยังได้ราคาอยู่ไหม?",
        a: "ได้ครับ iPad ทุกรุ่นยังมีมูลค่า ราคาขึ้นอยู่กับรุ่น ความจุ และสภาพเครื่อง ประเมินออนไลน์ก่อนได้เลย",
      },
      {
        q: "ต้องเดินทางมาส่งเองไหม?",
        a: "ไม่ต้องครับ เจ้าหน้าที่เดินทางไปรับถึงที่ในเขตปทุมธานีฟรี หรือถ้าสะดวกจะส่งพัสดุมาก็ได้เช่นกัน",
      },
    ],
  },

  lamlukka: {
    slug: "lamlukka",
    name: "ลำลูกกา",
    province: "ปทุมธานี",
    fullName: "ลำลูกกา ปทุมธานี",
    h1: "รับซื้อ iPhone ลำลูกกา ให้ราคาสูง จ่ายเงินสดทันที",
    heroDesc:
      "บริการรับซื้อ iPhone, iPad, MacBook, Apple Watch ในย่านลำลูกกาและพื้นที่ใกล้เคียง รับถึงบ้าน จ่ายเงินสด ไม่ต้องรอ",
    serviceAreas: ["ลำลูกกา", "คูคต", "ลาดสวาย", "บึงคำพร้อย", "บึงทองหลาง", "ระแหง", "พืชอุดม"],
    landmarks: ["BigC ลำลูกกา", "โลตัส ลำลูกกา", "หมู่บ้านศรีวารี", "ตลาดนัดลำลูกกา", "SCB PARK ลำลูกกา"],
    areaBlurb:
      "ให้บริการครอบคลุมทั้งตำบลลำลูกกา คูคต ลาดสวาย และพื้นที่โดยรอบ รวมถึงหมู่บ้านจัดสรรต่างๆ ในย่านลำลูกกาที่กำลังขยายตัว",
    uniqueFact: "ย่านลำลูกกาเป็นพื้นที่ที่มีหมู่บ้านจัดสรรหนาแน่น ลูกค้าหลายรายในพื้นที่นี้นิยมส่งต่อ iPhone เพื่ออัปเกรดรุ่นใหม่",
    faqs: [
      {
        q: "รับซื้อ iPhone ที่ลำลูกกาได้ไหม? มีค่าเดินทางไหม?",
        a: "รับซื้อได้ครับ และไม่มีค่าเดินทางสำหรับพื้นที่ลำลูกกาและใกล้เคียง นัดหมายได้ตั้งแต่ 09:00 – 00:00 น. ทุกวัน",
      },
      {
        q: "อยู่หมู่บ้านในคูคต รับซื้อถึงที่ได้ไหม?",
        a: "ได้ครับ คูคตอยู่ในพื้นที่บริการหลัก นัดหมายได้เลย ไม่ว่าจะหมู่บ้านไหนหรือคอนโดย่านนั้น",
      },
      {
        q: "ขาย Apple Watch ที่ยังมีประกันอยู่ได้ราคาดีกว่าไหม?",
        a: "ได้ราคาดีกว่าครับ Apple Watch ที่ยังมีประกัน AppleCare+ จะให้ราคาสูงขึ้นประมาณ 500-1,500 บาท ขึ้นอยู่กับเวลาที่เหลือ",
      },
      {
        q: "ขาย iPhone ที่ซื้อผ่อนจาก BigC หรือโลตัสได้ไหม?",
        a: "ได้ครับ รับซื้อเครื่องที่ผ่อนหมดแล้ว สำหรับเครื่องที่ยังผ่อนอยู่ต้องแจ้งให้ทราบก่อน เพื่อดำเนินการอย่างถูกต้อง",
      },
      {
        q: "นัดหมายรับซื้อในคืนได้ไหม เลิกงานดึก?",
        a: "ได้ครับ เปิดบริการถึง 00:00 น. ทุกวัน เหมาะกับคนที่เลิกงานดึกหรือสะดวกในช่วงกลางคืน",
      },
    ],
  },

  donmueang: {
    slug: "donmueang",
    name: "ดอนเมือง",
    province: "กรุงเทพมหานคร",
    fullName: "ดอนเมือง กรุงเทพฯ",
    h1: "รับซื้อ iPhone ดอนเมือง ให้ราคาสูง จ่ายเงินสดทันที",
    heroDesc:
      "บริการรับซื้อ iPhone, iPad, MacBook, Apple Watch ในย่านดอนเมืองและพื้นที่โดยรอบสนามบิน รับถึงที่ จ่ายเงินสดทันที",
    serviceAreas: ["ดอนเมือง", "สีกัน", "สนามบิน", "หลักสี่", "อนุสาวรีย์ชัย", "บางเขน", "ลาดพร้าว"],
    landmarks: ["สนามบินดอนเมือง", "ตลาดยิ่งเจริญ", "ห้าง The Paseo ดอนเมือง", "โรงพยาบาลภูมิพล", "ถนนวิภาวดีรังสิต"],
    areaBlurb:
      "ให้บริการครอบคลุมเขตดอนเมือง ทั้งย่านสนามบิน สีกัน หลักสี่ และพื้นที่ริมวิภาวดี เชื่อมต่อสะดวกทั้งจากฝั่ง กทม. และปทุมธานี",
    uniqueFact: "ดอนเมืองเป็นจุดเชื่อมต่อระหว่าง กทม. และปทุมธานี ลูกค้าหลายรายเลือกนัดรับในย่านนี้เพราะสะดวกทั้งขาไปและขากลับ",
    faqs: [
      {
        q: "รับซื้อ iPhone แถวดอนเมืองได้ไหม? ใกล้สนามบิน?",
        a: "ได้เลยครับ ให้บริการทั่วเขตดอนเมือง ทั้งย่านสนามบิน สีกัน และหลักสี่ ไม่มีค่าเดินทางเพิ่มเติม",
      },
      {
        q: "อยู่แถวตลาดยิ่งเจริญหรือ The Paseo ดอนเมือง นัดรับได้ไหม?",
        a: "ได้ครับ สามารถนัดจุดพบกันแถวนั้นหรือให้เจ้าหน้าที่มารับที่บ้านก็ได้ตามความสะดวก",
      },
      {
        q: "ซื้อ iPhone ที่สนามบินดอนเมืองมา (Duty Free) ขายได้ราคาดีไหม?",
        a: "ราคาขึ้นอยู่กับรุ่นและสภาพครับ iPhone จาก Duty Free มักเป็นโมเดลอเมริกา (LL/A) ซึ่งรับซื้อได้แต่ราคาอาจปรับลงเล็กน้อยตามราคาตลาด",
      },
      {
        q: "ทำงานกะดึกแถวดอนเมือง ขายช่วงดึกได้ไหม?",
        a: "ได้ครับ เปิดบริการทุกวันถึง 00:00 น. เหมาะสำหรับพนักงานกะดึกหรือคนที่ทำงานแถวสนามบิน",
      },
      {
        q: "MacBook ที่ใช้ทำงานแล้วมีรอยขีดข่วน ขายได้ราคาแค่ไหน?",
        a: "รอยขีดข่วนเล็กน้อยกระทบราคาน้อยมากครับ ราคาหลักขึ้นอยู่กับรุ่น chip (M1/M2/M3/M4) และสภาพจอ แนะนำประเมินออนไลน์เพื่อดูราคาก่อน",
      },
    ],
  },

  bangkhen: {
    slug: "bangkhen",
    name: "บางเขน",
    province: "กรุงเทพมหานคร",
    fullName: "บางเขน กรุงเทพฯ",
    h1: "รับซื้อ iPhone บางเขน ให้ราคาสูง จ่ายเงินสดทันที",
    heroDesc:
      "บริการรับซื้อ iPhone, iPad, MacBook, Apple Watch ในย่านบางเขนและพื้นที่ใกล้เคียง รับถึงที่ จ่ายเงินสดทันที ไม่ต้องรอ",
    serviceAreas: ["บางเขน", "อนุสาวรีย์ชัยสมรภูมิ", "ท่าแร้ง", "รามอินทรา", "วังทองหลาง", "ลาดปลาเค้า", "หลักสี่"],
    landmarks: ["มหาวิทยาลัยราชภัฏพระนคร", "ห้างแฟชั่นไอส์แลนด์ (ใกล้เคียง)", "ตลาดยิ่งเจริญ", "โลตัส รามอินทรา", "ถนนพหลโยธิน"],
    areaBlurb:
      "ให้บริการครอบคลุมเขตบางเขน ท่าแร้ง รามอินทรา และพื้นที่ริมถนนพหลโยธิน เชื่อมต่อสะดวกทั้งจากใจกลางเมืองและย่านชานเมืองทางเหนือ",
    uniqueFact: "บางเขนมีนักศึกษาและคนรุ่นใหม่อาศัยอยู่จำนวนมาก เป็นย่านที่มีการหมุนเวียน iPhone รุ่นใหม่สูง",
    faqs: [
      {
        q: "รับซื้อ iPhone แถวบางเขนได้ไหม?",
        a: "ได้เลยครับ ให้บริการทั่วเขตบางเขน ท่าแร้ง และรามอินทรา รับถึงที่ฟรีไม่มีค่าเดินทาง",
      },
      {
        q: "นักศึกษาราชภัฏพระนครขาย iPhone ได้ไหม?",
        a: "ได้ครับ ใช้บัตรนักศึกษาแทนบัตรประชาชนได้ สามารถนัดรับแถวมหาวิทยาลัยหรือหอพักได้เลย",
      },
      {
        q: "อยู่แถวรามอินทราหรือลาดปลาเค้า รับซื้อถึงที่ได้ไหม?",
        a: "ได้ครับ รามอินทราและลาดปลาเค้าอยู่ในเขตบริการ นัดหมายได้เลยไม่มีค่าใช้จ่ายเพิ่ม",
      },
      {
        q: "iPad Pro ที่ใช้มา 2 ปีขายได้ราคาเท่าไหร่?",
        a: "ราคาขึ้นอยู่กับรุ่น ขนาดจอ ความจุ และสภาพครับ iPad Pro รุ่นล่าสุดยังมีราคาดี แนะนำประเมินออนไลน์เพื่อดูราคาก่อนตัดสินใจ",
      },
      {
        q: "ขาย iPhone พร้อมกัน 2-3 เครื่องได้ไหม?",
        a: "ได้ครับ ยิ่งขายหลายเครื่องพร้อมกันยิ่งสะดวก นัดหมายครั้งเดียวจบ เจ้าหน้าที่ตรวจและให้ราคาทุกเครื่อง",
      },
    ],
  },
} as const;

type LocationSlug = keyof typeof locations;

// ─── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return (Object.keys(locations) as LocationSlug[]).map((slug) => ({ location: slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location } = await params;
  const loc = locations[location as LocationSlug];
  if (!loc) return {};

  const title = `รับซื้อ iPhone ${loc.name} ราคาสูง จ่ายสดทันที`;
  const description = `รับซื้อ iPhone, iPad, MacBook, Apple Watch ในพื้นที่${loc.fullName} รับถึงที่ฟรี ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด จ่ายเงินสดทันที ขายง่าย ได้เงินไว — ขายไอโฟน.com`;
  const canonical = `${SITE_URL}/area/${loc.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `รับซื้อ iPhone ${loc.name}`,
      `ขายไอโฟน${loc.name}`,
      `รับซื้อ iPad ${loc.name}`,
      `รับซื้อ MacBook ${loc.name}`,
      `ขายมือถือ${loc.name}`,
      `รับซื้อ Apple Watch ${loc.name}`,
    ],
    openGraph: {
      title: `${title} | ขายไอโฟน.com`,
      description,
      url: canonical,
      type: "website",
      locale: "th_TH",
      siteName: "ขายไอโฟน.com",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const devices = [
  { name: "iPhone", icon: "📱", desc: "ทุกรุ่น ตั้งแต่ 11 ถึง 17 Series", priceNote: "สูงสุด 45,000+ บาท" },
  { name: "iPad", icon: "🖥️", desc: "ทุกรุ่น Air, Pro, mini, standard", priceNote: "สูงสุด 30,000+ บาท" },
  { name: "MacBook", icon: "💻", desc: "Air & Pro ทุก chip M1–M4", priceNote: "สูงสุด 55,000+ บาท" },
  { name: "Apple Watch", icon: "⌚", desc: "Series 4 ขึ้นไป, SE, Ultra", priceNote: "สูงสุด 15,000+ บาท" },
];

const trustPoints = [
  { icon: <Banknote size={22} className="flex-shrink-0" style={{ color: "#B8860B" }} />, title: "ราคาสูงกว่าที่อื่น", desc: "เปรียบเทียบราคาได้ก่อนตัดสินใจ" },
  { icon: <Truck size={22} className="flex-shrink-0" style={{ color: "#B8860B" }} />, title: "รับถึงที่ฟรี", desc: "ไม่ต้องเดินทาง เจ้าหน้าที่ออกรับ" },
  { icon: <Search size={22} className="flex-shrink-0" style={{ color: "#B8860B" }} />, title: "โปร่งใส ตรวจสอบได้", desc: "แจ้งราคาก่อนตกลง ไม่มีกลลวง" },
  { icon: <CheckCircle size={22} className="flex-shrink-0" style={{ color: "#B8860B" }} />, title: "จ่ายทันที ไม่ต้องรอ", desc: "เงินสดหรือโอนทันทีหลังตรวจ" },
];

const steps = [
  { no: "01", title: "ประเมินราคาออนไลน์", desc: "เลือกรุ่น ระบุสภาพ รู้ราคาทันที ฟรีและไม่ผูกมัด" },
  { no: "02", title: "นัดหมายรับซื้อ", desc: "เลือกวันเวลาที่สะดวก เจ้าหน้าที่เดินทางมาถึงที่" },
  { no: "03", title: "ตรวจสอบและยืนยันราคา", desc: "ตรวจเครื่องจริงอย่างโปร่งใส แจ้งราคาสุดท้าย" },
  { no: "04", title: "รับเงินทันที", desc: "เงินสดหรือโอนเข้าบัญชีทันที ไม่ต้องรอ" },
];

export default async function LocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const loc = locations[location as LocationSlug];
  if (!loc) notFound();

  const canonical = `${SITE_URL}/area/${loc.slug}`;

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "ขายไอโฟน.com",
    alternateName: "KhaiPhone",
    description: `รับซื้อ iPhone iPad MacBook Apple Watch ในพื้นที่${loc.fullName} ให้ราคาสูง จ่ายเงินสดทันที`,
    url: SITE_URL,
    telephone: "+66-95-553-5167",
    priceRange: "฿฿",
    currenciesAccepted: "THB",
    paymentAccepted: "Cash, Bank Transfer, PromptPay",
    areaServed: [
      { "@type": "AdministrativeArea", name: loc.name },
      ...loc.serviceAreas.map((area) => ({ "@type": "AdministrativeArea", name: area })),
    ],
    serviceType: ["รับซื้อ iPhone", "รับซื้อ iPad", "รับซื้อ MacBook", "รับซื้อ Apple Watch"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "09:00",
      closes: "00:00",
    },
    sameAs: [],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: loc.faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `รับซื้อ iPhone ${loc.name}`, item: canonical },
    ],
  };

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <Header />

      {/* Breadcrumb */}
      <nav className="max-w-5xl mx-auto px-4 pt-4 pb-0" aria-label="breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs" style={{ color: "#9CA3AF" }}>
          <li><a href="/" className="hover:text-gray-600 transition-colors">หน้าหลัก</a></li>
          <li><ChevronRight size={12} /></li>
          <li style={{ color: "#B8860B" }}>รับซื้อ iPhone {loc.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-white px-4 pt-8 pb-10 md:pt-14 md:pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} style={{ color: "#B8860B" }} />
            <span className="text-sm font-medium" style={{ color: "#B8860B" }}>{loc.fullName}</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-black leading-tight mb-4">
            {loc.h1}
          </h1>
          <p className="text-sm md:text-base text-gray-500 mb-6 max-w-2xl leading-relaxed">
            {loc.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/sell"
              className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3.5 rounded-full text-white text-sm"
              style={{ background: "#B8860B" }}
            >
              ประเมินราคาฟรี →
            </a>
            <a
              href="https://line.me/R/ti/p/@khaiphone"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3.5 rounded-full text-white text-sm"
              style={{ background: "#06C755" }}
            >
              <MessageCircle size={15} />
              LINE @khaiphone
            </a>
            <a
              href="tel:0955535167"
              className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3.5 rounded-full text-sm border"
              style={{ borderColor: "#e5e7eb", color: "#111" }}
            >
              <Phone size={15} />
              095-553-5167
            </a>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="bg-gray-50 border-y border-gray-100 px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-black mb-6 text-center">
            ทำไมต้องขายกับ ขายไอโฟน.com ใน{loc.name}?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {trustPoints.map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-start gap-2 bg-white rounded-2xl p-5 shadow-sm">
                {icon}
                <p className="font-bold text-black text-sm">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Devices we buy */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">
            อุปกรณ์ที่รับซื้อใน{loc.name}
          </h2>
          <p className="text-sm text-gray-500 mb-8">รับซื้อทุกรุ่น ทุกสภาพ ประเมินราคาออนไลน์ฟรี</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {devices.map(({ name, icon, desc, priceNote }) => (
              <a
                key={name}
                href="/sell"
                className="group flex flex-col gap-2 rounded-2xl border p-5 hover:border-yellow-600 hover:shadow-md transition-all"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="text-3xl">{icon}</span>
                <p className="font-bold text-black text-sm group-hover:text-yellow-700 transition-colors">{name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                <p className="text-xs font-semibold mt-auto" style={{ color: "#B8860B" }}>{priceNote}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How to sell */}
      <section className="bg-gray-50 border-y border-gray-100 px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">
            ขายง่ายใน 4 ขั้นตอน
          </h2>
          <p className="text-sm text-gray-500 mb-8">รวดเร็ว โปร่งใส ได้เงินทันที</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {steps.map(({ no, title, desc }) => (
              <div key={no} className="flex flex-col gap-3">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full w-fit"
                  style={{ background: "#B8860B", color: "#fff" }}
                >
                  {no}
                </span>
                <p className="font-bold text-black text-sm">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service area detail */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">
            พื้นที่ให้บริการใน{loc.name}
          </h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed max-w-2xl">{loc.areaBlurb}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {loc.serviceAreas.map((area) => (
              <span
                key={area}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "#fef9ee", color: "#B8860B", border: "1px solid #f5e8b8" }}
              >
                {area}
              </span>
            ))}
          </div>
          <div className="rounded-2xl p-5 bg-gray-50 border border-gray-100">
            <div className="flex items-start gap-3">
              <Clock size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
              <div>
                <p className="text-sm font-semibold text-black mb-1">สถานที่ใกล้เคียงที่รู้จักกันดี</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {loc.landmarks.join(" · ")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <MapPin size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
              <p className="text-xs text-gray-500 leading-relaxed">{loc.uniqueFact}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 border-y border-gray-100 px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">
            คำถามที่พบบ่อยสำหรับ{loc.name}
          </h2>
          <p className="text-sm text-gray-500 mb-8">คำตอบเฉพาะสำหรับลูกค้าในพื้นที่{loc.name}</p>
          <div>
            {loc.faqs.map(({ q, a }) => (
              <details key={q} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <summary
                  className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none"
                  style={{ listStyle: "none" }}
                >
                  <span className="font-semibold text-black text-sm md:text-base leading-snug">{q}</span>
                  <span className="flex-shrink-0 text-lg" style={{ color: "#B8860B" }}>+</span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 text-center">
            <a href="/faq" className="text-sm font-medium hover:underline" style={{ color: "#B8860B" }}>
              ดูคำถามที่พบบ่อยทั้งหมด →
            </a>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-10 md:py-16 px-4" style={{ backgroundColor: "#B8860B" }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">พร้อมขายแล้วใช่ไหม?</h2>
            <p className="text-white mt-1 text-sm md:text-base opacity-90">
              รับซื้อใน{loc.name} · ประเมินฟรี ไม่ผูกมัด · รับถึงที่
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <a
              href="/sell"
              className="inline-flex items-center justify-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-full hover:bg-gray-900 transition-colors text-sm whitespace-nowrap"
            >
              ประเมินราคาฟรี →
            </a>
            <a
              href="https://line.me/R/ti/p/@khaiphone"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-bold px-8 py-4 rounded-full text-white text-sm whitespace-nowrap"
              style={{ background: "#06C755" }}
            >
              <MessageCircle size={15} />
              LINE @khaiphone
            </a>
          </div>
        </div>
      </section>

      {/* Internal links to other locations */}
      <section className="px-4 py-8 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">พื้นที่ให้บริการอื่นๆ</p>
          <div className="flex flex-wrap gap-2">
            {(Object.values(locations) as (typeof locations)[LocationSlug][]).filter((l) => l.slug !== loc.slug).map((l) => (
              <a
                key={l.slug}
                href={`/area/${l.slug}`}
                className="text-sm hover:underline transition-colors"
                style={{ color: "#B8860B" }}
              >
                รับซื้อ iPhone {l.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
