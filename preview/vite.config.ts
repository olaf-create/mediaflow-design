/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { designPlugin } from "./server/plugin";

// Local design preview (not shipped: package.json "files" lists css, src, CHANGELOG.md only).
export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss(), designPlugin()],
  server: { fs: { allow: [".."] } },
  // Pre-bundle everything up front: a late re-optimisation would load a second copy of React.
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "lucide-react", "class-variance-authority", "clsx", "tailwind-merge"],
  },
  test: { include: ["**/*.test.ts"] },
});
