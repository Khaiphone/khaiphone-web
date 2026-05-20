import Header from "../components/Header";
import MobileNav from "../components/MobileNav";

const reviews = [
  { name: "คุณนนท์ พ.",     stars: 5, model: "iPhone 15 Pro Max", date: "12 พ.ค. 2569", text: "ให้ราคาสูงกว่าที่คิดไว้มาก พนักงานสุภาพ มาตรงเวลา จ่ายเงินสดทันทีหลังตรวจเครื่อง ประทับใจมากครับ" },
  { name: "คุณอาร์ม ส.",     stars: 5, model: "iPhone 16 Pro",     date: "8 พ.ค. 2569",  text: "บริการดีมากครับ รับถึงบ้าน ไม่ต้องเดินทาง เช็คเครื่องไว โอนเงินเข้าบัญชีภายใน 5 นาที" },
  { name: "คุณปอ ว.",        stars: 5, model: "iPhone 14 Pro Max", date: "1 พ.ค. 2569",  text: "มืออาชีพมากครับ ราคาที่ได้สูงกว่า Trade-in ศูนย์เกือบ 3,000 บาท ไม่ต้องเสียเวลาไปศูนย์" },
  { name: "คุณมิ้น ธ.",      stars: 5, model: "iPhone 15",         date: "27 เม.ย. 2569", text: "ตอนแรกกลัวโดนกดราคา แต่ได้ราคาตรงตามที่ประเมินออนไลน์เลยค่ะ ประทับใจมากๆ แนะนำเลย" },
  { name: "คุณโบ้ท ก.",      stars: 5, model: "iPhone 16 Pro Max", date: "22 เม.ย. 2569", text: "ติดต่อ LINE ได้รับตอบรวดเร็ว นัดวันได้ภายในวันเดียว พนักงานมาตรงเวลา เป็นระบบระเบียบมากครับ" },
  { name: "คุณแนน ป.",       stars: 5, model: "iPhone 13 Pro",     date: "18 เม.ย. 2569", text: "ขายครั้งที่ 2 แล้วค่ะ ราคาดี บริการดี ไม่มีการต่อรองกดราคาแบบร้านทั่วไป จะกลับมาอีกแน่นอน" },
  { name: "คุณต้น อ.",       stars: 5, model: "iPhone 17 Pro Max", date: "10 เม.ย. 2569", text: "ดีมากครับ มาถึงบ้านตรงเวลา เช็คเครื่องละเอียด อธิบายชัดเจน ได้เงินสดทันที ไม่มีค่าใช้จ่ายเพิ่ม" },
  { name: "คุณฝน ร.",        stars: 4, model: "iPhone 14",         date: "5 เม.ย. 2569",  text: "โดยรวมดีค่ะ ราคาสมเหตุสมผล บริการสุภาพ แนะนำให้คนที่อยากขาย iPhone อย่างรวดเร็วลองใช้บริการได้เลย" },
  { name: "คุณเจ ธ.",        stars: 5, model: "iPhone 15 Pro",     date: "28 มี.ค. 2569", text: "ไม่น่าเชื่อว่าจะสะดวกขนาดนี้ครับ ไม่ต้องออกจากบ้านเลย แถมราคายังดีกว่าที่ขายเองบน Facebook อีก" },
  { name: "คุณนิ้ง ส.",      stars: 5, model: "iPhone 16",         date: "20 มี.ค. 2569", text: "รู้จักจาก Google แล้วลองติดต่อดู ได้รับการบริการดีมากค่ะ โอนเงินไวมาก จะแนะนำเพื่อนๆ ต่อแน่นอน" },
  { name: "คุณพลอย ม.",      stars: 5, model: "iPhone 13",         date: "15 มี.ค. 2569", text: "เคยขายผ่านร้านย่านมือถือมาก่อน แต่ที่นี่ให้ราคาสูงกว่าชัดเจนและไม่ต้องต่อรองให้เหนื่อยเลยค่ะ" },
  { name: "คุณเอ็ม ก.",      stars: 5, model: "iPhone 14 Plus",    date: "8 มี.ค. 2569",  text: "ขายง่ายมากครับ แค่แจ้งรุ่นและสภาพ ได้ราคามา นัดวัน แล้วรอรับเงินได้เลย ไม่มีขั้นตอนซับซ้อน" },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className="w-4 h-4" fill={i <= n ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsPage() {

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Hero */}
      <section className="py-10 md:py-16 px-4" style={{ background: "#f5f5f7" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-4">รีวิวจากลูกค้าจริง</h1>
          <div className="flex items-center justify-center gap-4 mb-2">
            <span className="text-5xl font-bold text-black">4.9</span>
            <div className="text-left">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} viewBox="0 0 24 24" className="w-6 h-6" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <p className="text-sm" style={{ color: "#6B7280" }}>316 รีวิว · แสดง 12 ล่าสุด</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-8 md:py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Stars n={r.stars} />
                <span className="text-xs" style={{ color: "#9CA3AF" }}>{r.date}</span>
              </div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: "#374151" }}>"{r.text}"</p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div>
                  <p className="text-sm font-semibold text-black">{r.name}</p>
                  <p className="text-xs" style={{ color: "#9CA3AF" }}>ขาย {r.model}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B" }}>ยืนยันแล้ว</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 md:py-12 px-4 border-t border-gray-100">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-bold text-black mb-2">อยากขาย iPhone ของคุณบ้างไหม?</h2>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>ประเมินราคาฟรี ไม่ผูกมัด ได้เงินสดทันที</p>
          <a
            href="/sell"
            className="inline-flex items-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-full hover:bg-gray-800 transition-colors"
          >
            ประเมินราคาฟรี →
          </a>
        </div>
      </section>

      <MobileNav />
    </div>
  );
}
