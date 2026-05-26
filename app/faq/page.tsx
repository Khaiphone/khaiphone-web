import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Phone, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: "คำถามที่พบบ่อย (FAQ)",
  description: "รวมคำถามที่พบบ่อยเกี่ยวกับการขาย iPhone iPad MacBook กับขายไอโฟน.com ขั้นตอนการขาย ราคา การนัดหมาย และการจ่ายเงิน",
  alternates: { canonical: "/faq" },
  openGraph: { title: "คำถามที่พบบ่อย | ขายไอโฟน.com", description: "รวมคำถามที่พบบ่อยเกี่ยวกับการขาย iPhone iPad MacBook", url: "/faq" },
};

const faqGroups = [
  {
    group: "เกี่ยวกับการรับซื้อ",
    items: [
      { q: "รับซื้อ iPhone รุ่นไหนบ้าง?", a: "รับซื้อ iPhone ทุกรุ่น ตั้งแต่ iPhone 11 ถึง iPhone 17 Series ทั้ง Pro Max, Pro, Plus, Air รวมถึง iPad, MacBook และ Apple Watch ทุกรุ่น ทั้งเครื่อง TH/A และ ZP/A" },
      { q: "รับซื้อ Apple Watch ได้ไหม?", a: "รับซื้อ Apple Watch ทุก Series ครับ ตั้งแต่ Series 4 ขึ้นไป รวมถึง Apple Watch SE และ Ultra ราคาขึ้นอยู่กับรุ่น ขนาด และสภาพเครื่อง สามารถประเมินราคาออนไลน์ได้เลย" },
      { q: "MacBook ที่แบตเสื่อมหรือมีปัญหา ขายได้ไหม?", a: "ขายได้ครับ รับ MacBook ทุกสภาพ ทั้ง Air และ Pro ทุก chip (Intel, M1, M2, M3, M4) หากแบตเสื่อมหรือมีปัญหาเล็กน้อย ราคาจะถูกปรับลงตามสภาพจริง แนะนำแจ้งรายละเอียดตอนประเมินเพื่อให้ราคาแม่นยำที่สุด" },
      { q: "รับซื้อเครื่องผ่อนได้ไหม?", a: "ได้ครับ รับซื้อทั้งเครื่องที่ผ่อนหมดแล้วและยังผ่อนอยู่ (กรณีที่มีหน้าร้านสามารถให้เจ้าหน้าที่เข้าไปไถ่ถอนให้ได้) โดยเครื่องที่ยังผ่อนอยู่จะต้องแจ้งให้ทราบก่อน และราคาจะถูกปรับตามสถานะและอาจจะมีค่าบริการเพิ่มเติม" },
      { q: "เครื่อง TH/A กับ ZP/A ต่างกันไหม? รับซื้อเครื่องนำเข้าไหม?", a: "TH/A และ ZP/A เป็นเครื่องศูนย์ไทยทั้งคู่ครับ โดย iPhone 11–13 จะเป็น TH/A และ iPhone 14–17 จะเป็น ZP/A รับซื้อทั้งสองรุ่น ส่วนเครื่องนำเข้าจากต่างประเทศ (โมเดลอื่น เช่น LL/A, J/A) รับซื้อได้เช่นกัน แต่ราคาจะปรับลงตามราคาตลาด" },
      { q: "หน้าจอแตก ขายได้ไหม?", a: "ขายได้ครับ ขึ้นอยู่กับสภาพความเสียหาย หากเสียหายมากจนไม่คุ้มซ่อมอาจไม่รับ แต่โดยทั่วไปราคาจะปรับลงตามระดับความเสียหาย แนะนำให้แจ้งสภาพตามจริงตอนประเมินออนไลน์ เพื่อให้ราคาที่ได้รับใกล้เคียงกับราคาจริงมากที่สุด" },
      { q: "ไม่มีกล่องหรืออุปกรณ์ครบ ขายได้ไหม?", a: "ได้ครับ ไม่มีกล่องก็ขายได้ แต่ราคาอาจปรับลงเล็กน้อย อุปกรณ์ที่มีผลต่อราคาได้แก่ กล่อง, สายชาร์จ และหูฟัง" },
    ],
  },
  {
    group: "การเตรียมตัวก่อนขาย",
    items: [
      { q: "ต้องเตรียมอะไรบ้างก่อนขาย?", a: "เตรียม 3 อย่าง — (1) ออก iCloud / Apple ID ออกจากเครื่องให้เรียบร้อย (2) เตรียมกล่องและอุปกรณ์ที่มีไว้ (3) บัตรประชาชนตัวจริงหรือสำเนา เพื่อทำสัญญาซื้อขาย" },
      { q: "เครื่องติด iCloud ขายได้ไหม?", a: "ไม่ได้ครับ ต้องออก iCloud ออกจากเครื่องก่อนส่งมอบทุกครั้ง หากออกไม่ได้หรือลืม Apple ID สามารถแจ้งเจ้าหน้าที่เพื่อขอคำแนะนำได้" },
      { q: "ต้อง backup ข้อมูลก่อนไหม?", a: "แนะนำให้ backup ข้อมูลไว้ก่อนเสมอครับ ผ่าน iCloud หรือ iTunes เพราะหลังจากขายเครื่องจะถูกล้างข้อมูลทั้งหมด" },
      { q: "ข้อมูลในเครื่องจะถูกลบอย่างไร?", a: "ลูกค้า backup และลบข้อมูลเองก่อนส่งมอบ และเจ้าหน้าที่จะทำการ factory reset อีกครั้งหลังรับเครื่อง เพื่อความปลอดภัยของข้อมูลลูกค้า" },
    ],
  },
  {
    group: "การรับซื้อถึงที่และส่งพัสดุ",
    items: [
      { q: "รับซื้อถึงที่ครอบคลุมพื้นที่ไหนบ้าง?", a: "ทั่ว กทม. และปริมณฑล ไม่มีค่าใช้จ่ายเพิ่มเติม สามารถเลือกวันและเวลาที่สะดวกได้ตั้งแต่ 09:00 – 00:00 น. ทุกวัน" },
      { q: "ถ้าอยู่ต่างจังหวัด ขายได้ไหม?", a: "ได้ครับ สามารถส่งพัสดุมาได้ทั่วไทย โดยเจ้าหน้าที่จะตรวจสอบเครื่องและโอนเงินให้หลังจากตรวจสอบเสร็จ ค่าขนส่งขาไปฝั่งลูกค้าออก ขาคืน (กรณียกเลิก) เราออกให้" },
      { q: "ส่งพัสดุมา ต้องทำประกันไหม?", a: "แนะนำให้ทำประกันพัสดุไว้ครับ เพื่อความปลอดภัย โดยเฉพาะสินค้ามูลค่าสูง บริษัทขนส่งส่วนใหญ่มีบริการประกันสินค้าเพิ่มเติม" },
    ],
  },
  {
    group: "ราคาและการจ่ายเงิน",
    items: [
      { q: "ราคาที่ประเมินออนไลน์ตรงกับราคาจริงไหม?", a: "ราคาออนไลน์เป็นราคาประมาณการเบื้องต้น ราคาจริงขึ้นอยู่กับสภาพเครื่องจริงหลังตรวจสอบ หากข้อมูลที่กรอกตรงตามสภาพจริง ราคาจะใกล้เคียงหรือตรงตามที่ประเมินไว้" },
      { q: "ได้รับเงินเร็วแค่ไหน?", a: "ได้รับเงินทันทีหลังตรวจสอบเครื่องและตกลงราคาแล้ว ทั้งเงินสดและโอนเข้าบัญชี ปกติใช้เวลาไม่เกิน 30 นาทีหลังนัดหมาย ไม่ต้องรอหลายวันเหมือนบางที่" },
      { q: "จ่ายเงินเมื่อไหร่?", a: "จ่ายทันทีหลังตรวจสอบเครื่องและตกลงราคากันแล้ว ทั้งเงินสดและโอนเข้าบัญชี ไม่ต้องรอ" },
      { q: "ยกเลิกหลังประเมินออนไลน์แล้วได้ไหม?", a: "ได้ครับ การประเมินออนไลน์ไม่มีผูกมัดใดๆ ยกเลิกได้ทุกเวลาโดยไม่มีค่าใช้จ่าย แม้แต่หลังนัดหมายแล้ว หากตรวจสอบเครื่องจริงแล้วราคาไม่ตรงใจ ไม่ต้องขายก็ได้" },
      { q: "มีสัญญาซื้อขายไหม?", a: "มีครับ ทุกการซื้อขายจะมีสัญญาซื้อขายให้ลงนามทั้งสองฝ่าย เพื่อความโปร่งใสและปลอดภัยทั้งลูกค้าและร้าน" },
      { q: "ต่อรองราคาได้ไหม?", a: "ราคาที่เสนอเป็นราคาที่ดีที่สุดที่เราให้ได้แล้วครับ แต่หากมีข้อสงสัยเรื่องราคาสามารถสอบถามเหตุผลได้เสมอ เราโปร่งใสทุกขั้นตอน" },
    ],
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqGroups.flatMap(({ items }) =>
    items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    }))
  ),
};

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />

      {/* Hero */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-8 md:py-14">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium mb-2" style={{ color: "#B8860B" }}>มีข้อสงสัย?</p>
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3">คำถามที่พบบ่อย</h1>
          <p className="text-sm md:text-base text-gray-500">รวมคำถามและคำตอบที่ลูกค้าถามบ่อย หากไม่พบคำตอบสามารถติดต่อเราได้โดยตรง</p>
        </div>
      </div>

      {/* FAQ Groups */}
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-14">
        <div className="flex flex-col gap-10">
          {faqGroups.map(({ group, items }) => (
            <div key={group}>
              <h2 className="text-base font-bold mb-4 pb-2 border-b-2" style={{ color: "#B8860B", borderColor: "#B8860B" }}>
                {group}
              </h2>
              <div>
                {items.map(({ q, a }) => (
                  <details key={q} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <summary
                      className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none"
                      style={{ listStyle: "none" }}
                    >
                      <span className="font-semibold text-black text-sm md:text-base leading-snug">{q}</span>
                      <ChevronDown size={18} className="flex-shrink-0" style={{ color: "#B8860B" }} />
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 rounded-2xl p-6 md:p-8 text-center" style={{ background: "#f5f5f7" }}>
          <p className="font-bold text-black text-lg mb-1">ยังมีข้อสงสัยอยู่?</p>
          <p className="text-sm text-gray-500 mb-5">ติดต่อทีมงานได้โดยตรง พร้อมตอบทุกคำถาม</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://line.me/R/ti/p/@khaiphone"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-full text-white text-sm"
              style={{ background: "#06C755" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              LINE @khaiphone
            </a>
            <a
              href="tel:0955535167"
              className="flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-full text-white text-sm"
              style={{ background: "#111111" }}
            >
              <Phone size={15} />
              095-553-5167
            </a>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <section className="py-8 md:py-14 px-4" style={{ backgroundColor: "#B8860B" }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">พร้อมขายแล้ว?</h3>
            <p className="text-white mt-1 text-sm md:text-base">ประเมินราคาฟรี ไม่ผูกมัด ไม่ต้องกรอกข้อมูลส่วนตัว</p>
          </div>
          <a
            href="/sell"
            className="flex items-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-full hover:bg-gray-900 transition-colors text-base whitespace-nowrap"
          >
            ประเมินราคาฟรี →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
