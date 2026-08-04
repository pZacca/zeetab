"use client";

import { Suspense, lazy, startTransition, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useNewtab } from "./newtab-provider";
import { GridSection } from "./grid-section";
import {
  reduceDragSession,
  initialDragSessionState,
  type DragSessionEvent,
  type DragSessionState,
} from "@/lib/newtab/drag-session";
import {
  resolveDropTarget,
  findShortcutSection,
  type DropOverTarget,
} from "@/lib/newtab/grid-drag";
import { moveShortcut } from "@/lib/newtab/shortcut-move";
import type { Config } from "@/lib/newtab/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TileDialog = lazy(() =>
  import("./tile-dialog").then((m) => ({ default: m.TileDialog }))
);

type DialogState =
  | { open: false }
  | { open: true; sectionId: string; editingId?: string | undefined };

function overTarget(
  over: { id: string | number; data: { current?: unknown } } | null
): DropOverTarget | undefined {
  if (!over) return undefined;
  const data = over.data.current;
  const sectionId =
    data && typeof data === "object" && "sectionId" in data
      ? (data as { sectionId?: unknown }).sectionId
      : undefined;
  return {
    id: String(over.id),
    ...(typeof sectionId === "string" ? { sectionId } : {}),
  };
}

export function Grid() {
  const { state, actions } = useNewtab();
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [session, setSession] = useState<DragSessionState>(
    initialDragSessionState
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Long-press activation: a quick tap still opens the Shortcut, and
    // ordinary swipes aren't hijacked into a drag. The drag surface itself
    // sets `touch-action: none` (see GridTile) so real touch devices match
    // this emulation instead of the browser starting its own scroll/pan
    // gesture before the delay elapses.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );

  // Runs a sequence of drag-session events against the current session in
  // one pass, then applies the resulting state and (if any) commit. Kept
  // as a sequence — rather than one `setSession` call per event — so a
  // dragEnd can resolve `dragOver` + `drop` against the same base state
  // without racing React's async state updates.
  function send(events: DragSessionEvent[]) {
    let next = session;
    let commit: ReturnType<typeof reduceDragSession>["commit"];
    for (const event of events) {
      const result = reduceDragSession(next, event);
      next = result.state;
      if (result.commit) commit = result.commit;
    }
    setSession(next);
    if (commit) {
      const { shortcutId, sectionId, index } = commit;
      startTransition(() =>
        actions.moveShortcut(shortcutId, { sectionId, index })
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    const source = findShortcutSection(state.config, activeId);
    if (!source) return;
    send([
      {
        type: "dragStart",
        shortcutId: activeId,
        sectionId: source.sectionId,
        index: source.index,
      },
    ]);
  }

  function handleDragOver(event: DragOverEvent) {
    const activeId = String(event.active.id);
    const over = overTarget(event.over);
    if (!over) return;
    const target = resolveDropTarget(state.config, activeId, over);
    if (!target) return;
    send([{ type: "dragOver", sectionId: target.sectionId, index: target.index }]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const over = overTarget(event.over);
    const target = over ? resolveDropTarget(state.config, activeId, over) : undefined;
    if (!target) {
      send([{ type: "dragCancel" }]);
      return;
    }
    send([
      { type: "dragOver", sectionId: target.sectionId, index: target.index },
      { type: "drop" },
    ]);
  }

  function handleDragCancel() {
    send([{ type: "dragCancel" }]);
  }

  const previewConfig: Config =
    session.phase === "idle"
      ? state.config
      : moveShortcut(state.config, session.shortcutId, {
          sectionId:
            session.phase === "dragging"
              ? session.overSectionId
              : session.targetSectionId,
          index:
            session.phase === "dragging" ? session.overIndex : session.targetIndex,
        });

  const pending = session.phase === "pendingConfirmation" ? session : undefined;

  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {previewConfig.sections.map((section) => (
          <GridSection
            key={section.id}
            section={section}
            onOpenTileDialog={({ sectionId, editingId }) =>
              setDialog({ open: true, sectionId, editingId })
            }
          />
        ))}
      </DndContext>

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

      <AlertDialog
        open={pending !== undefined}
        onOpenChange={(open) => {
          if (!open) send([{ type: "cancelConfirmation" }]);
        }}
      >
        <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
              move this shortcut?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500">
              this drops the shortcut into another section at the exact
              position you dragged it to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              onClick={() => send([{ type: "cancelConfirmation" }])}
            >
              cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => send([{ type: "confirm" }])}>
              move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
