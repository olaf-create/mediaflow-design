/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Local design preview (not shipped: package.json "files" lists css, src, CHANGELOG.md only).
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  server: { fs: { allow: [".."] } },
  test: { include: ["**/*.test.ts"] },
});
