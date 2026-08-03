import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
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
