import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { imei } = await req.json();
  if (!imei || !/^\d{14,16}$/.test(imei.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "IMEI ไม่ถูกต้อง (ต้องเป็นตัวเลข 14-16 หลัก)" }, { status: 400 });
  }

  const apiKey = process.env.SICKW_API_KEY;
  const serviceId = process.env.SICKW_SERVICE_ID ?? "29";

  if (!apiKey) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า SICKW_API_KEY" }, { status: 500 });
  }

  const cleanImei = imei.replace(/\s/g, "");
  const url = `https://sickw.com/api.php?format=JSON&key=${apiKey}&service=${serviceId}&imei=${cleanImei}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: `SICKW error: ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
