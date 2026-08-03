import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Builds the web demo (zeetab.zacca.dev) from the same source as the extension.
export default defineConfig({
  root: "demo",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "./dist-demo"),
    emptyOutDir: true,
  },
});
