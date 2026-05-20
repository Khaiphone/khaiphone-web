"use client";

export default function RiderCTA() {
  return (
    <a
      href="https://line.me/ti/p/~@khaiphone"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 font-bold rounded-full"
      style={{
        background: "#B8860B",
        color: "#ffffff",
        textDecoration: "none",
        padding: "14px 32px",
        fontSize: "0.9375rem",
        boxShadow: "0 4px 24px rgba(184,134,11,0.4)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px rgba(184,134,11,0.55)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 24px rgba(184,134,11,0.4)";
      }}
    >
      นัดรับเลย!
    </a>
  );
}
