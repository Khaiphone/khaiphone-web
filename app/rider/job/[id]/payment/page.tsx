"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Camera, Banknote, ArrowUpDown, Send, Clock, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderJob, riderCompleteCash, riderRequestTransfer, riderCompleteTransfer } from "@/app/actions/rider";
import { markContractSigned } from "@/app/actions/admin-requests";
import { useRiderTheme } from "@/app/rider/theme";
import type { AdminRequest } from "@/lib/types/admin";

function fmt(n: number) { return n.toLocaleString("th-TH"); }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

async function uploadSlip(file: File, id: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("inspection-photos")
    .upload(`rider/${id}/payment-${Date.now()}.jpg`, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
  return publicUrl;
}

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { BG, CARD, BORDER, ACCENT, GREEN, BLUE, TEXT, TEXT2 } = useRiderTheme();
  const [job, setJob]               = useState<AdminRequest | null>(null);
  const [contractSignedAt, setContractSignedAt] = useState<string | null>(null);
  const [signingContract, setSigningContract]   = useState(false);
  const [photoUrl, setPhotoUrl]         = useState<string>();
  const [slipUrl, setSlipUrl]           = useState<string>();
  const [transferSent, setTransferSent] = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const slipRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRiderJob(id).then(j => {
      setJob(j);
      if (j?.payment.contractSignedAt) setContractSignedAt(j.payment.contractSignedAt);
    });
  }, [id]);

  if (!job) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isCash = job.payment.method === "cash";
  const price  = job.device.actualPrice ?? job.device.estimatedPrice;
  const signed = !!contractSignedAt;

  async function handleSignContract() {
    setSigningContract(true);
    const result = await markContractSigned(id);
    if (result.success) setContractSignedAt(result.signedAt);
    setSigningContract(false);
  }

  async function handlePhoto(file: File) {
    setUploading(true);
    try { setPhotoUrl(await uploadSlip(file, id)); }
    catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
    finally { setUploading(false); }
  }

  async function handleSlip(file: File) {
    setUploading(true);
    try { setSlipUrl(await uploadSlip(file, id)); }
    catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
    finally { setUploading(false); }
  }

  async function handleCompleteCash() {
    if (!photoUrl) { setError("กรุณาถ่ายรูปลูกค้ารับเงินก่อน"); return; }
    setBusy(true);
    const result = await riderCompleteCash(id, photoUrl);
    if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); setBusy(false); return; }
    router.push(`/rider/job/${id}/complete`);
  }

  async function handleRequestTransfer() {
    setBusy(true);
    await riderRequestTransfer(id);
    setTransferSent(true);
    setBusy(false);
  }

  async function handleCompleteTransfer() {
    setBusy(true);
    const result = await riderCompleteTransfer(id, slipUrl);
    if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); setBusy(false); return; }
    router.push(`/rider/job/${id}/complete`);
  }

  return (
    <div style={{ height: "100%", overflow: "hidden", background: BG, display: "flex", flexDirection: "column" }}>

      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={22} />
        </button>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>ชำระเงิน</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ background: CARD, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            {isCash
              ? <Banknote size={20} color={GREEN} />
              : <ArrowUpDown size={20} color={BLUE} />}
            <span style={{ fontSize: 14, fontWeight: 600, color: isCash ? GREEN : BLUE }}>
              {isCash ? "เงินสด" : "โอนเงิน"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: ACCENT }}>฿{fmt(price)}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: TEXT2 }}>{job.device.model} {job.device.storage}</p>
        </div>

        {signed ? (
          <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle2 size={20} color={GREEN} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT }}>ออกเอกสารแล้ว</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT2 }}>เวลา {fmtTime(contractSignedAt!)} น.</p>
            </div>
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <FileText size={18} color={ACCENT} />
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>ออกเอกสารสัญญา</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT2 }}>ต้องออกเอกสารก่อนชำระเงิน</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/rider/job/${id}/contract`)}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12,
                background: ACCENT, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#000",
              }}
            >
              📄 ออกเอกสารออนไลน์ →
            </button>
          </div>
        )}

        {signed && (
          <>
            {isCash && (
              <>
                <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: TEXT2 }}>จ่ายเงินสดให้ลูกค้า</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: GREEN }}>฿{fmt(price)}</p>
                </div>

                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: TEXT2 }}>ถ่ายรูปลูกค้ารับเงิน <span style={{ color: "#FF453A" }}>*</span></p>
                  <button onClick={() => photoRef.current?.click()} style={{
                    width: "100%", aspectRatio: "16/9", background: CARD, border: `1.5px dashed ${photoUrl ? GREEN : BORDER}`,
                    borderRadius: 12, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={photoUrl} alt="receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                          <Camera size={28} color={TEXT2} />
                          <span style={{ fontSize: 12, color: TEXT2 }}>ถ่ายรูปลูกค้าถือเงิน</span>
                        </div>
                      )}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
                </div>

                {error && <p style={{ margin: 0, fontSize: 13, color: "#FF453A" }}>{error}</p>}
              </>
            )}

            {!isCash && (
              <>
                <div style={{ background: CARD, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "ธนาคาร",    value: job.payment.bankName      ?? "-" },
                    { label: "ชื่อบัญชี", value: job.payment.accountName   ?? "-" },
                    { label: "เลขบัญชี",  value: job.payment.accountNumber ?? "-" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, color: TEXT2 }}>{label}</span>
                      <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </div>

                {!transferSent ? (
                  <button onClick={handleRequestTransfer} disabled={busy} style={{
                    padding: 16, borderRadius: 14, background: BLUE, border: "none", fontSize: 16,
                    fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    <Send size={18} />
                    {busy ? "กำลังแจ้ง..." : "แจ้ง Finance โอนเงิน"}
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 14, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Clock size={18} color={BLUE} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: TEXT }}>แจ้ง Finance แล้ว</p>
                        <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>รอ Finance ยืนยันการโอน แล้วกดปุ่มด้านล่าง</p>
                      </div>
                    </div>

                    <div>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: TEXT2 }}>
                        แนบสลิปโอนเงิน <span style={{ color: TEXT2, fontWeight: 400 }}>(ถ้ามี)</span>
                      </p>
                      <button onClick={() => slipRef.current?.click()} style={{
                        width: "100%", aspectRatio: "16/9", background: CARD, border: `1.5px dashed ${slipUrl ? BLUE : BORDER}`,
                        borderRadius: 12, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {slipUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={slipUrl} alt="slip" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                              <Camera size={28} color={TEXT2} />
                              <span style={{ fontSize: 12, color: TEXT2 }}>ถ่ายรูปสลิปโอนเงิน</span>
                            </div>
                          )}
                      </button>
                      <input ref={slipRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleSlip(f); }} />
                    </div>

                    <button onClick={handleCompleteTransfer} disabled={busy || uploading} style={{
                      padding: 16, borderRadius: 14, background: GREEN, border: "none", fontSize: 16,
                      fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit", opacity: (busy || uploading) ? 0.6 : 1,
                    }}>
                      {busy ? "กำลังบันทึก..." : "โอนแล้ว — จบงาน ✓"}
                    </button>
                  </div>
                )}

                {error && <p style={{ margin: 0, fontSize: 13, color: "#FF453A" }}>{error}</p>}
              </>
            )}
          </>
        )}
      </div>

      {isCash && signed && (
        <div style={{ padding: "16px 20px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: BG, borderTop: `1px solid ${BORDER}` }}>
          <button onClick={handleCompleteCash} disabled={busy || uploading || !photoUrl} style={{
            width: "100%", padding: 16, borderRadius: 14, background: GREEN, border: "none",
            fontSize: 16, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit",
            opacity: (busy || uploading || !photoUrl) ? 0.4 : 1,
          }}>
            {busy ? "กำลังบันทึก..." : "จ่ายเงินแล้ว — จบงาน ✓"}
          </button>
        </div>
      )}
    </div>
  );
}
