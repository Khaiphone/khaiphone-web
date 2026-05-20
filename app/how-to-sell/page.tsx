import Header from "../components/Header";
import Footer from "../components/Footer";
import { CheckCircle2, Clock, ShieldCheck, Banknote } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "ประเมินราคาออนไลน์",
    desc: "เลือกรุ่นและกรอกสภาพเครื่องของคุณ ระบบจะแสดงราคาประเมินเบื้องต้นทันที ฟรี ไม่ผูกมัด ไม่ต้องกรอกข้อมูลส่วนตัว",
    img: "/step-1-estimate.webp",
    tips: ["ไม่มีค่าใช้จ่ายในการประเมิน", "รู้ราคาทันทีภายใน 5 นาที", "ไม่ต้องผูกมัด ไม่ต้องตัดสินใจตอนนี้"],
  },
  {
    step: "02",
    title: "นัดหมายหรือส่งเครื่อง",
    desc: "เลือกได้ 3 แบบตามความสะดวก — นัดให้เจ้าหน้าที่มารับถึงที่ทั่ว กทม. และปริมณฑล, เดินทางมาขายด้วยตัวเองที่สาขารังสิต หรือส่งพัสดุมาที่ร้านโดยไม่มีค่าใช้จ่ายเพิ่มเติม",
    img: "/step-2-pickup.webp",
    tips: ["รับถึงที่ทั่ว กทม. และปริมณฑล", "มาขายด้วยตัวเองที่สาขารังสิต", "ส่งพัสดุได้ทั่วไทย ไม่มีค่าจัดส่ง"],
  },
  {
    step: "03",
    title: "ตรวจเช็คและยืนยันราคา",
    desc: "เจ้าหน้าที่จะตรวจสอบสภาพเครื่องจริงอย่างละเอียด และแจ้งราคาสุดท้ายอย่างโปร่งใส หากราคาตรงตามที่ประเมินไว้ ก็ดำเนินการต่อได้เลย",
    img: "/step-3-inspect.webp",
    tips: ["ตรวจสอบอย่างมาตรฐาน โปร่งใส", "แจ้งราคาสุดท้ายก่อนตัดสินใจ", "ไม่พอใจราคา ยกเลิกได้ทันที"],
  },
  {
    step: "04",
    title: "รับเงินทันที",
    desc: "เมื่อตกลงราคาและทำสัญญาซื้อขายเรียบร้อย รับเงินสดทันที หรือโอนเข้าบัญชีได้ภายในไม่กี่นาที ไม่ต้องรอนาน",
    img: "/step-4-payment.webp",
    tips: ["รับเงินสดหรือโอนเข้าบัญชีทันที", "มีสัญญาซื้อขายครบถ้วน", "ปลอดภัย มีหลักฐานทุกขั้นตอน"],
  },
];

export default function HowToSellPage() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Hero */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-8 md:py-14">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium mb-2" style={{ color: "#B8860B" }}>ง่าย รวดเร็ว ปลอดภัย</p>
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3">วิธีการขาย ง่ายๆ 4 ขั้นตอน</h1>
          <p className="text-sm md:text-base text-gray-500 mb-6">ขายอุปกรณ์ Apple ของคุณได้เงินทันที ไม่ต้องรอนาน บริการครบ จบในที่เดียว</p>
          <a
            href="/sell"
            className="inline-flex items-center gap-2 bg-black text-white font-bold px-7 py-3.5 rounded-full hover:bg-gray-800 transition-colors"
          >
            เริ่มประเมินราคาฟรี →
          </a>
        </div>
      </div>

      {/* Trust badges */}
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { Icon: Clock, title: "ใช้เวลาไม่นาน", sub: "เสร็จภายใน 30–60 นาที" },
              { Icon: ShieldCheck, title: "ปลอดภัย 100%", sub: "มีสัญญาซื้อขายทุกครั้ง" },
              { Icon: Banknote, title: "รับเงินทันที", sub: "สดหรือโอนก็ได้" },
            ].map(({ Icon, title, sub }) => (
              <div key={title} className="flex flex-col items-center gap-1.5 py-4 px-3">
                <Icon size={20} style={{ color: "#B8860B" }} />
                <p className="font-semibold text-black text-xs md:text-sm text-center">{title}</p>
                <p className="text-xs text-center" style={{ color: "#9CA3AF" }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="flex flex-col gap-12 md:gap-20">
          {steps.map(({ step, title, desc, img, tips }, i) => {
            const isEven = i % 2 === 1;
            return (
              <div
                key={step}
                className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${isEven ? "md:flex-row-reverse" : ""}`}
              >
                {/* Image */}
                <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                  <img src={img} alt={title} className="w-full h-56 md:h-80 object-cover object-top" />
                </div>

                {/* Text */}
                <div className="w-full md:w-1/2">
                  <p className="text-4xl font-black mb-2" style={{ color: "rgba(184,134,11,0.18)", lineHeight: 1 }}>{step}</p>
                  <h2 className="text-xl md:text-2xl font-bold text-black mb-3">{title}</h2>
                  <p className="text-sm md:text-base leading-relaxed mb-5" style={{ color: "#6B7280" }}>{desc}</p>
                  <ul className="flex flex-col gap-2">
                    {tips.map(tip => (
                      <li key={tip} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                        <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preparation tips */}
      <section className="bg-gray-50 border-t border-gray-100 px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">เตรียมตัวก่อนขาย</h2>
          <p className="text-sm text-gray-500 mb-6">เตรียม 3 อย่างนี้ไว้ก่อน ขายได้เร็วและราบรื่นขึ้น</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { num: "1", title: "ออก iCloud / Apple ID", desc: "ไปที่ การตั้งค่า → แตะชื่อของคุณ → ออกจากระบบ เพื่อให้เครื่องพร้อมโอน" },
              { num: "2", title: "เตรียมกล่องและอุปกรณ์", desc: "กล่องและอุปกรณ์ครบจะได้ราคาสูงกว่า แต่ไม่มีก็ขายได้เช่นกัน" },
              { num: "3", title: "บัตรประชาชน", desc: "ต้องใช้สำหรับทำสัญญาซื้อขาย ตัวจริงหรือสำเนาก็ได้" },
            ].map(({ num, title, desc }) => (
              <div key={num} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white mb-3" style={{ background: "#B8860B" }}>
                  {num}
                </div>
                <p className="font-bold text-black text-sm mb-1.5">{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-8 md:py-14 px-4" style={{ backgroundColor: "#B8860B" }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">พร้อมแล้ว เริ่มได้เลย!</h3>
            <p className="text-yellow-100 mt-1 text-sm md:text-base">ประเมินราคาฟรี ไม่ผูกมัด ไม่ต้องกรอกข้อมูลส่วนตัว</p>
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
