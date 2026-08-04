"use client";

import { Suspense, lazy, startTransition, useRef, useState } from "react";
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
  springExpandedSectionIds,
  type DragSessionEvent,
  type DragSessionState,
} from "@/lib/newtab/drag-session";
import {
  resolveDropTarget,
  findShortcutSection,
  sectionIdFromHeaderDroppableId,
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
import { Checkbox } from "@/components/ui/checkbox";

const TileDialog = lazy(() =>
  import("./tile-dialog").then((m) => ({ default: m.TileDialog }))
);

type DialogState =
  | { open: false }
  | { open: true; sectionId: string; editingId?: string | undefined };

// How long a dragged tile must hover a collapsed Section's header before it
// springs open (see drag-session.ts's spring-loading rules).
const SPRING_DELAY_MS = 600;

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
  // The spring-loading clock: real time, owned here (not the pure
  // reducer). Cleared whenever the hovered header changes or the drag ends.
  const springTimer = useRef<{
    sectionId: string;
    timeoutId: ReturnType<typeof globalThis.setTimeout>;
  } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

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
      const result = reduceDragSession(next, event, {
        confirmCrossSection: state.preferences.confirmCrossSectionMove,
      });
      next = result.state;
      if (result.commit) commit = result.commit;
    }
    setSession(next);
    if (commit) {
      const { shortcutId, sectionId, index, expandSection } = commit;
      startTransition(() => {
        actions.moveShortcut(shortcutId, { sectionId, index });
        // Only a confirmed drop into a Section that actually sprung open
        // during this drag persists the expansion — hover alone never does.
        if (expandSection) actions.toggleSectionCollapse(sectionId);
      });
    }
  }

  function clearSpringTimer() {
    if (springTimer.current) {
      globalThis.clearTimeout(springTimer.current.timeoutId);
      // eslint-disable-next-line unicorn/no-null
      springTimer.current = null;
    }
  }

  function scheduleSpringTimer(sectionId: string) {
    if (springTimer.current?.sectionId === sectionId) return;
    clearSpringTimer();
    const timeoutId = globalThis.setTimeout(() => {
      // eslint-disable-next-line unicorn/no-null
      springTimer.current = null;
      send([{ type: "springTimerElapsed", sectionId }]);
    }, SPRING_DELAY_MS);
    springTimer.current = { sectionId, timeoutId };
  }

  function handleDragStart(event: DragStartEvent) {
    clearSpringTimer();
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
    const overId = event.over ? String(event.over.id) : undefined;
    const headerSectionId = overId
      ? sectionIdFromHeaderDroppableId(overId)
      : undefined;

    if (headerSectionId) {
      // Hovering a collapsed Section's header: track it and start (or keep)
      // its spring-open clock. No live content preview into it yet.
      scheduleSpringTimer(headerSectionId);
      send([{ type: "dragOverSectionHeader", sectionId: headerSectionId }]);
      return;
    }

    clearSpringTimer();
    const over = overTarget(event.over);
    if (!over) return;
    const target = resolveDropTarget(state.config, activeId, over);
    if (!target) return;
    send([{ type: "dragOver", sectionId: target.sectionId, index: target.index }]);
  }

  function handleDragEnd(event: DragEndEvent) {
    clearSpringTimer();
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
    clearSpringTimer();
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
  const sprungSectionIds = springExpandedSectionIds(session);

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
            springExpanded={sprungSectionIds.includes(section.id)}
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
          if (!open) {
            send([{ type: "cancelConfirmation" }]);
            setDontAskAgain(false);
          }
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
          <label className="flex items-center gap-2 font-ibm-plex-mono text-xs text-zinc-400">
            <Checkbox
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            don&apos;t ask again
          </label>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              onClick={() => {
                send([{ type: "cancelConfirmation" }]);
                setDontAskAgain(false);
              }}
            >
              cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dontAskAgain) actions.setConfirmCrossSectionMove(false);
                send([{ type: "confirm" }]);
                setDontAskAgain(false);
              }}
            >
              move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
