import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.122"],
  outputFileTracingRoot: path.resolve(__dirname),
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
