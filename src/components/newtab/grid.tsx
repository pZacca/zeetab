"use client";

import { Suspense, lazy, useState } from "react";
import { useNewtab } from "./newtab-provider";
import { GridSection } from "./grid-section";

const TileDialog = lazy(() =>
  import("./tile-dialog").then((m) => ({ default: m.TileDialog }))
);

type DialogState =
  | { open: false }
  | { open: true; sectionId: string; editingId?: string | undefined };

export function Grid() {
  const { state } = useNewtab();
  const [dialog, setDialog] = useState<DialogState>({ open: false });

  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      {state.config.sections.map((section) => (
        <GridSection
          key={section.id}
          section={section}
          onOpenTileDialog={({ sectionId, editingId }) =>
            setDialog({ open: true, sectionId, editingId })
          }
        />
      ))}

      {dialog.open && (
        // eslint-disable-next-line unicorn/no-null
        <Suspense fallback={null}>
          <TileDialog
            sectionId={dialog.sectionId}
            editingId={dialog.editingId}
            onClose={() => setDialog({ open: false })}
          />
        </Suspense>
      )}
    </div>
  );
}
