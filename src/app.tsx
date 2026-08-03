import { Suspense, lazy, useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  NewtabProvider,
  useNewtab,
} from "@/components/newtab/newtab-provider";
import { Grid } from "@/components/newtab/grid";

const SettingsSheet = lazy(() =>
  import("@/components/newtab/settings-sheet").then((m) => ({
    default: m.SettingsSheet,
  }))
);

export function App() {
  return (
    <main className="min-h-screen bg-secondary text-zinc-100">
      <NewtabProvider>
        <Shell />
        <Toaster position="bottom-right" theme="dark" />
      </NewtabProvider>
    </main>
  );
}

function Shell() {
  const { meta } = useNewtab();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((v) => !v);
      }
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (meta.quotaExceeded) {
      toast.error("storage full — remove uploaded icons to keep saving");
    }
  }, [meta.quotaExceeded]);

  return (
    <div className="relative min-h-screen">
      {meta.storageUnavailable && (
        <div
          role="status"
          className="sticky top-0 z-10 bg-tertiary/90 px-4 py-2 text-center text-sm text-secondary"
        >
          Your browser blocks localStorage — changes will not persist.
        </div>
      )}

      <Grid />

      <button
        type="button"
        aria-label="Open settings"
        onClick={() => setSettingsOpen(true)}
        className="fixed right-4 bottom-4 grid size-10 place-items-center rounded-full bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-primary"
      >
        <Settings className="size-5" />
      </button>

      {settingsOpen && (
        // eslint-disable-next-line unicorn/no-null
        <Suspense fallback={null}>
          <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
        </Suspense>
      )}
    </div>
  );
}
