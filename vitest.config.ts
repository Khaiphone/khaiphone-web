import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    // ให้ตรงกับ tsconfig paths: "@/*" -> "./*"
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
  },
});
