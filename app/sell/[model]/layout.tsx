import type { Metadata } from "next";

interface Props {
  params: Promise<{ model: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model } = await params;
  const decoded = decodeURIComponent(model).replace(/-/g, " ");

  return {
    title: `ประเมินราคา ${decoded}`,
    description: `ประเมินราคารับซื้อ ${decoded} ฟรี รู้ราคาทันที ไม่ผูกมัด จ่ายเงินสดทันที ขายง่าย ได้เงินไว`,
    alternates: { canonical: `/sell/${model}` },
    openGraph: {
      title: `ประเมินราคา ${decoded} | ขายไอโฟน.com`,
      description: `ประเมินราคารับซื้อ ${decoded} ฟรี รู้ราคาทันที ไม่ผูกมัด`,
      url: `/sell/${model}`,
    },
  };
}

export default function ModelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
