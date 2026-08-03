import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/lib/newtab/**/*.ts"],
      exclude: ["src/lib/newtab/**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
