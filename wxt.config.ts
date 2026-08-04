import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
// Type-only: pulls in @wxt-dev/module-react's `react` key augmentation of
// wxt's InlineConfig.
import type {} from "@wxt-dev/module-react";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  react: {
    vite: { babel: { plugins: ["babel-plugin-react-compiler"] } },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: "zeetab",
    description: "A minimal new tab with shortcut sections.",
    homepage_url: "https://github.com/pZacca/zeetab",
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "zeetab@zacca.dev",
              // Firefox built-in data consent: zeetab collects nothing.
              // https://mzl.la/firefox-builtin-data-consent
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : {}),
  }),
});
