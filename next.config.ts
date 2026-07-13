import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.122"],
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  // Security headers — HSTS มาจาก Vercel อยู่แล้ว, ที่เหลือเพิ่มที่นี่
  // (Permissions-Policy ยอมให้ camera+geolocation จาก self เพราะแอปใช้จริง: หมุด, ถ่ายรูปตรวจเครื่อง)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "khaiphone",
  project: "khaiphone-web",
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
