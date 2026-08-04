"use client";

import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  closestCenter,
  DndContext,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
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

// "Drop where I'm pointing": prefer the droppable actually under the
// pointer, falling back to nearest-center for the gaps between tiles.
// Center-distance alone can never pick a Section header — the header strip
// spans the grid's full width, so its center is far from a pointer hovering
// it and some nearby tile always wins.
const collisionDetection: CollisionDetection = (args) => {
  const withinPointer = pointerWithin(args);
  return withinPointer.length > 0 ? withinPointer : closestCenter(args);
};

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
  // Always-current session, so callbacks that fire outside the render that
  // created them (the spring timer, dnd-kit's late dragEnd) never reduce
  // against a stale snapshot — a stale base would both no-op the spring
  // check and rewind the live preview.
  const sessionRef = useRef<DragSessionState>(initialDragSessionState);
  // Set when a drag just ended: the browser still fires a click on the tile
  // under the pointer, which on an <a> would navigate to the Shortcut.
  const suppressClickRef = useRef(false);
  // The spring-loading clock: real time, owned here (not the pure
  // reducer). Cleared whenever the hovered header changes or the drag ends.
  const springTimer = useRef<{
    sectionId: string;
    timeoutId: ReturnType<typeof globalThis.setTimeout>;
  } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // The post-drag click guard has to be a NATIVE window-capture listener:
  // dnd-kit suppresses the click with stopPropagation in a document-capture
  // listener, which silences every React handler (they all live at the
  // root) — but stopPropagation doesn't cancel the <a>'s default action,
  // so the tab would still navigate to the dragged Shortcut. Window capture
  // runs first and can actually preventDefault it.
  useEffect(() => {
    const guard = (e: MouseEvent) => {
      if (suppressClickRef.current || sessionRef.current.phase === "dragging") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("click", guard, { capture: true });
    return () => window.removeEventListener("click", guard, { capture: true });
  }, []);

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
    let next = sessionRef.current;
    let commit: ReturnType<typeof reduceDragSession>["commit"];
    for (const event of events) {
      const result = reduceDragSession(next, event, {
        confirmCrossSection: state.preferences.confirmCrossSectionMove,
      });
      next = result.state;
      if (result.commit) commit = result.commit;
    }
    sessionRef.current = next;
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
    // Resolve against what the user is LOOKING at — the live preview — not
    // the committed config. dnd-kit's `over` comes from the rendered DOM,
    // where earlier dragOvers have already moved tiles; resolving that pair
    // against the un-previewed config computes stale indexes.
    const target = resolveDropTarget(currentPreview(), activeId, over);
    if (!target) return;
    send([{ type: "dragOver", sectionId: target.sectionId, index: target.index }]);
  }

  // The Config as currently rendered: committed state plus the in-flight
  // drag preview. Reads sessionRef so event handlers see the same picture
  // the DOM shows, not the render they were created in.
  function currentPreview(): Config {
    const s = sessionRef.current;
    if (s.phase !== "dragging") return state.config;
    return moveShortcut(state.config, s.shortcutId, {
      sectionId: s.overSectionId,
      index: s.overIndex,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    clearSpringTimer();
    suppressNextClick();
    if (!event.over) {
      send([{ type: "dragCancel" }]);
      return;
    }
    // The live preview really moves tiles in the DOM, so by drop time the
    // pointer usually sits over the dragged tile itself — re-resolving that
    // against the un-previewed config would discard the drop. The session
    // already tracked the last valid target on every dragOver; trust it.
    send([{ type: "drop" }]);
  }

  function handleDragCancel() {
    clearSpringTimer();
    suppressNextClick();
    send([{ type: "dragCancel" }]);
  }

  function suppressNextClick() {
    suppressClickRef.current = true;
    // The post-drag click fires in the same task as pointerup; anything
    // after that is a genuine click again.
    globalThis.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
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
        collisionDetection={collisionDetection}
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
