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
            gecko: { id: "zeetab@zacca.dev" },
          },
        }
      : {}),
  }),
});
