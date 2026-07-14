"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Upload, Eye, Check, X } from "lucide-react";
import {
  fetchAdminArticle, updateArticle, uploadArticleImage, approveArticle, unpublishArticle, deleteArticle,
  type AdminArticle,
} from "@/app/actions/articles";
import type { Section } from "@/lib/blog-types";

const BG = "var(--admin-bg)", CARD = "var(--admin-card)", CARD2 = "var(--admin-bg)", BORDER = "var(--admin-border)";
const GOLD = "var(--admin-gold)", TEXT = "var(--admin-text)", TEXT2 = "var(--admin-text2)", TEXT3 = "var(--admin-text3)";
const GREEN = "#15803D", RED = "#DC2626", AMBER = "#B45309";

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9, border: `1px solid ${BORDER}`, background: CARD, color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: TEXT2, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" };

const BLOCK_TYPES: { type: Section["type"]; label: string }[] = [
  { type: "paragraph", label: "ย่อหน้า" }, { type: "heading", label: "หัวข้อ H2" }, { type: "subheading", label: "หัวข้อย่อย H3" },
  { type: "list", label: "ลิสต์" }, { type: "callout", label: "กล่องเน้น" }, { type: "table", label: "ตาราง" },
  { type: "faq", label: "FAQ" }, { type: "image", label: "รูป" },
];

function blank(type: Section["type"]): Section {
  switch (type) {
    case "list": return { type: "list", items: [""] };
    case "table": return { type: "table", headers: ["", ""], rows: [["", ""]] };
    case "faq": return { type: "faq", items: [{ q: "", a: "" }] };
    case "image": return { type: "image", src: "", alt: "", caption: "" };
    case "heading": return { type: "heading", text: "" };
    case "subheading": return { type: "subheading", text: "" };
    case "callout": return { type: "callout", text: "" };
    default: return { type: "paragraph", text: "" };
  }
}

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [a, setA] = useState<AdminArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // editable fields
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [readTime, setReadTime] = useState("");
  const [displayDate, setDisplayDate] = useState("");
  const [slug, setSlug] = useState("");
  const [keywords, setKeywords] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [blocks, setBlocks] = useState<Section[]>([]);

  useEffect(() => {
    fetchAdminArticle(id).then((d) => {
      if (d) {
        setA(d); setTitle(d.title); setExcerpt(d.excerpt); setCategory(d.category); setReadTime(d.readTime);
        setDisplayDate(d.displayDate); setSlug(d.slug); setKeywords((d.keywords ?? []).join(", "));
        setMetaTitle(d.metaTitle ?? ""); setMetaDescription(d.metaDescription ?? ""); setHeroImage(d.image); setBlocks(d.content);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  function patchBlock(i: number, b: Section) { setBlocks((p) => p.map((x, j) => (j === i ? b : x))); }
  function delBlock(i: number) { setBlocks((p) => p.filter((_, j) => j !== i)); }
  function moveBlock(i: number, dir: -1 | 1) {
    setBlocks((p) => { const n = [...p]; const j = i + dir; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }

  async function doUpload(file: File): Promise<string | null> {
    const fd = new FormData(); fd.append("file", file);
    const res = await uploadArticleImage(fd);
    if (res.error) { setMsg("อัปโหลดรูปไม่สำเร็จ: " + res.error); return null; }
    return res.url ?? null;
  }

  async function save(): Promise<boolean> {
    setBusy(true); setMsg("");
    const res = await updateArticle(id, {
      title, excerpt, category, readTime, displayDate, slug,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      heroImage, content: blocks, metaTitle, metaDescription,
    });
    setBusy(false);
    if (!res.success) { setMsg("บันทึกไม่สำเร็จ: " + res.error); return false; }
    setMsg("✓ บันทึกแล้ว"); setTimeout(() => setMsg(""), 2500); return true;
  }

  async function approve() {
    if (!heroImage) { setMsg("⚠️ ต้องอัปโหลดรูปหน้าปกก่อนอนุมัติ"); return; }
    setBusy(true);
    const ok = await save();
    if (!ok) { setBusy(false); return; }
    const res = await approveArticle(id);
    setBusy(false);
    if (!res.success) { setMsg("อนุมัติไม่สำเร็จ: " + res.error); return; }
    setMsg("✅ เผยแพร่แล้ว!"); setA((p) => (p ? { ...p, status: "published" } : p));
  }

  if (loading) return <div style={{ minHeight: "100vh", background: BG, display: "flex", justifyContent: "center", alignItems: "center" }}><Loader2 size={22} color={GOLD} style={{ animation: "spin 0.8s linear infinite" }} /></div>;
  if (!a) return <div style={{ minHeight: "100vh", background: BG, color: TEXT2, padding: 40, textAlign: "center" }}>ไม่พบบทความ</div>;

  const isPublished = a.status === "published";

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 20, borderBottom: `1px solid ${BORDER}`, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "12px 16px", maxWidth: 780, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push("/admin/articles")} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={22} /></button>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{isPublished ? "เผยแพร่แล้ว" : "รออนุมัติ"}</span>
          <a href={`/blog-preview/${id}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: TEXT2, textDecoration: "none", padding: "6px 10px", borderRadius: 8, border: `1px solid ${BORDER}` }}><Eye size={14} />พรีวิว</a>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "16px" }}>
        {msg && <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: msg.startsWith("✓") || msg.startsWith("✅") ? "#F0FDF4" : "#FEF2F2", color: msg.startsWith("✓") || msg.startsWith("✅") ? GREEN : RED }}>{msg}</div>}

        {/* Meta card */}
        <Card>
          <Field label="หัวเรื่อง (H1)"><textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} style={{ ...inp, resize: "vertical", fontWeight: 700 }} /></Field>
          <Field label="สรุปย่อ (excerpt)"><textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="หมวด"><input value={category} onChange={(e) => setCategory(e.target.value)} style={inp} /></Field>
            <Field label="เวลาอ่าน"><input value={readTime} onChange={(e) => setReadTime(e.target.value)} style={inp} /></Field>
            <Field label="วันที่ (แสดง)"><input value={displayDate} onChange={(e) => setDisplayDate(e.target.value)} style={inp} /></Field>
            <Field label="slug (URL)"><input value={slug} onChange={(e) => setSlug(e.target.value)} style={inp} /></Field>
          </div>
          <Field label="คีย์เวิร์ด (คั่นด้วย ,)"><input value={keywords} onChange={(e) => setKeywords(e.target.value)} style={inp} /></Field>
          <Field label="Meta title (SEO)"><input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="เว้นว่าง = ใช้หัวเรื่อง" style={inp} /></Field>
          <Field label="Meta description (SEO)"><textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} placeholder="เว้นว่าง = ใช้สรุปย่อ" style={{ ...inp, resize: "vertical" }} /></Field>
          <Field label="รูปหน้าปก (hero) — ต้องมีก่อนอนุมัติ">
            <ImageUpload url={heroImage} onUpload={doUpload} onChange={setHeroImage} setMsg={setMsg} />
          </Field>
        </Card>

        {/* Blocks */}
        <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, margin: "18px 0 10px" }}>เนื้อหา</p>
        {blocks.map((b, i) => (
          <BlockEditor key={i} block={b} index={i} total={blocks.length}
            onChange={(nb) => patchBlock(i, nb)} onDelete={() => delBlock(i)} onMove={(d) => moveBlock(i, d)}
            onUpload={doUpload} setMsg={setMsg} />
        ))}

        {/* Add block */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {BLOCK_TYPES.map((bt) => (
            <button key={bt.type} onClick={() => setBlocks((p) => [...p, blank(bt.type)])}
              style={{ fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "7px 11px", borderRadius: 8, border: `1px dashed ${BORDER}`, background: CARD, color: TEXT2, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={12} />{bt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", zIndex: 30 }}>
        <button onClick={() => { if (confirm("ลบบทความนี้?")) deleteArticle(id).then((r) => { if (r.success) router.push("/admin/articles"); }); }}
          style={{ padding: "9px 11px", borderRadius: 9, border: `1px solid ${BORDER}`, background: CARD, color: RED, cursor: "pointer", fontFamily: "inherit" }}><Trash2 size={15} /></button>
        {isPublished && <button onClick={() => { setBusy(true); unpublishArticle(id).then((r) => { setBusy(false); if (r.success) { setA((p) => p ? { ...p, status: "pending_review" } : p); setMsg("↩︎ ถอนกลับเป็นรออนุมัติแล้ว"); } }); }}
          style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${BORDER}`, background: CARD, color: AMBER, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>ถอน</button>}
        <div style={{ flex: 1 }} />
        <button onClick={save} disabled={busy} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${GOLD}`, background: CARD, color: GOLD, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}>บันทึก</button>
        {!isPublished && <button onClick={approve} disabled={busy} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: GREEN, color: "#fff", cursor: busy ? "wait" : "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
          {busy ? <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Check size={15} />}อนุมัติ → เผยแพร่</button>}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

function ImageUpload({ url, onUpload, onChange, setMsg }: { url: string; onUpload: (f: File) => Promise<string | null>; onChange: (u: string) => void; setMsg: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [up, setUp] = useState(false);
  return (
    <div>
      {url ? (
        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
          <button onClick={() => onChange("")} style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} disabled={up} style={{ width: "100%", padding: "20px", borderRadius: 10, border: `1.5px dashed ${BORDER}`, background: CARD2, color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {up ? <Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> : <Upload size={18} />}{up ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return; setUp(true); setMsg("");
        const u = await onUpload(f); setUp(false); if (u) onChange(u); e.target.value = "";
      }} />
    </div>
  );
}

// ── Per-block editor ───────────────────────────────────────────────────────────
function BlockEditor({ block, index, total, onChange, onDelete, onMove, onUpload, setMsg }: {
  block: Section; index: number; total: number; onChange: (b: Section) => void; onDelete: () => void; onMove: (d: -1 | 1) => void;
  onUpload: (f: File) => Promise<string | null>; setMsg: (m: string) => void;
}) {
  const typeLabel = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: "0.05em" }}>{typeLabel}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => onMove(-1)} disabled={index === 0} style={iconBtn}><ChevronUp size={15} /></button>
        <button onClick={() => onMove(1)} disabled={index === total - 1} style={iconBtn}><ChevronDown size={15} /></button>
        <button onClick={onDelete} style={{ ...iconBtn, color: RED }}><Trash2 size={14} /></button>
      </div>
      {(block.type === "paragraph" || block.type === "callout") && (
        <textarea value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} rows={3} style={{ ...inp, resize: "vertical" }} />
      )}
      {(block.type === "heading" || block.type === "subheading") && (
        <input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} style={{ ...inp, fontWeight: 700 }} />
      )}
      {block.type === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {block.items.map((it, j) => (
            <div key={j} style={{ display: "flex", gap: 6 }}>
              <textarea value={it} onChange={(e) => onChange({ ...block, items: block.items.map((x, k) => (k === j ? e.target.value : x)) })} rows={2} style={{ ...inp, resize: "vertical" }} />
              <button onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== j) })} style={{ ...iconBtn, color: RED, flexShrink: 0 }}><X size={14} /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...block, items: [...block.items, ""] })} style={addMini}>+ เพิ่มข้อ</button>
        </div>
      )}
      {block.type === "table" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {block.headers.map((h, c) => (
              <input key={c} value={h} placeholder={`หัว ${c + 1}`} onChange={(e) => onChange({ ...block, headers: block.headers.map((x, k) => (k === c ? e.target.value : x)) })} style={{ ...inp, fontWeight: 700, fontSize: 12, padding: "6px 8px" }} />
            ))}
          </div>
          {block.rows.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {row.map((cell, c) => (
                <input key={c} value={cell} onChange={(e) => onChange({ ...block, rows: block.rows.map((rr, k) => (k === r ? rr.map((cc, kk) => (kk === c ? e.target.value : cc)) : rr)) })} style={{ ...inp, fontSize: 12, padding: "6px 8px" }} />
              ))}
              <button onClick={() => onChange({ ...block, rows: block.rows.filter((_, k) => k !== r) })} style={{ ...iconBtn, color: RED, flexShrink: 0 }}><X size={13} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] })} style={addMini}>+ แถว</button>
            <button onClick={() => onChange({ ...block, headers: [...block.headers, ""], rows: block.rows.map((r) => [...r, ""]) })} style={addMini}>+ คอลัมน์</button>
          </div>
        </div>
      )}
      {block.type === "faq" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {block.items.map((qa, j) => (
            <div key={j} style={{ border: `1px solid ${BORDER}`, borderRadius: 9, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              <input value={qa.q} placeholder="คำถาม" onChange={(e) => onChange({ ...block, items: block.items.map((x, k) => (k === j ? { ...x, q: e.target.value } : x)) })} style={{ ...inp, fontWeight: 600, fontSize: 13 }} />
              <textarea value={qa.a} placeholder="คำตอบ" rows={2} onChange={(e) => onChange({ ...block, items: block.items.map((x, k) => (k === j ? { ...x, a: e.target.value } : x)) })} style={{ ...inp, resize: "vertical", fontSize: 13 }} />
              <button onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== j) })} style={{ ...addMini, color: RED, alignSelf: "flex-start" }}>ลบข้อนี้</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...block, items: [...block.items, { q: "", a: "" }] })} style={addMini}>+ เพิ่ม Q&A</button>
        </div>
      )}
      {block.type === "image" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ImageUpload url={block.src} onUpload={onUpload} onChange={(u) => onChange({ ...block, src: u })} setMsg={setMsg} />
          <input value={block.alt ?? ""} placeholder="alt text (อธิบายรูป — ดีต่อ SEO)" onChange={(e) => onChange({ ...block, alt: e.target.value })} style={{ ...inp, fontSize: 12 }} />
          <input value={block.caption ?? ""} placeholder="คำบรรยายใต้รูป (ไม่บังคับ)" onChange={(e) => onChange({ ...block, caption: e.target.value })} style={{ ...inp, fontSize: 12 }} />
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 3, display: "flex" };
const addMini: React.CSSProperties = { fontFamily: "inherit", fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 7, border: `1px dashed ${BORDER}`, background: CARD2, color: TEXT2, cursor: "pointer", alignSelf: "flex-start" };
