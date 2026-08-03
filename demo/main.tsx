import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@/styles/globals.css";
import { STORAGE_KEY } from "@/lib/newtab/types";
import { migrate } from "@/lib/newtab/migrations";
import { writeConfig } from "@/lib/newtab/storage";
import { App } from "@/app";

// Demo-only: on a true first visit (no stored key at all) seed the sample
// config, so the demo shows the product instead of an empty grid. A visitor
// who already saved anything — including deliberately emptying the grid —
// is never overwritten. Any failure falls back to the normal empty state.
async function seedSampleConfig(): Promise<void> {
  try {
    const existing =
      globalThis.localStorage?.getItem(STORAGE_KEY) ?? undefined;
    if (existing !== undefined) return;
    const res = await fetch("/zeetab-sample-config.json");
    if (!res.ok) return;
    writeConfig(migrate(await res.json()));
  } catch {
    /* best effort */
  }
}

await seedSampleConfig();

createRoot(document.querySelector("#root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
