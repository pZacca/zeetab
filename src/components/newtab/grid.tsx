"use client";

import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getClientRect,
  MeasuringStrategy,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNewtab } from "./newtab-provider";
import { GridSection } from "./grid-section";
import { GridTileGhost } from "./grid-tile";
import { HiddenDefaultNotice } from "./hidden-default-notice";
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
  resolveSectionReorder,
  sectionIdFromHeaderDroppableId,
  sectionIdFromSortableId,
  sectionSortableId,
  type DropOverTarget,
} from "@/lib/newtab/grid-drag";
import { DEFAULT_SECTION_ID } from "@/lib/newtab/defaults";
import { moveShortcut } from "@/lib/newtab/shortcut-move";
import type { Config, Shortcut } from "@/lib/newtab/types";
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

function isSectionDrag(
  active: {
    data: { current?: { type?: unknown } | undefined };
  } | null
): boolean {
  return active?.data.current?.type === "section";
}

// Sections sort in a vertical list; the handle drag should track the
// pointer in y only. Tile drags pass through untouched.
const sectionVerticalAxis: Modifier = ({ active, transform }) =>
  isSectionDrag(active) ? { ...transform, x: 0 } : transform;

// Two drag types share this DndContext, and each must only ever collide
// with its own droppables: a Section drag sees just the named Sections'
// sortable wrappers (whose rects contain every tile — they'd shadow tile
// drops otherwise), and a tile drag sees everything but those wrappers.
//
// Tile drags keep "drop where I'm pointing": prefer the droppable actually
// under the pointer, falling back to nearest-center for the gaps between
// tiles. Center-distance alone can never pick a Section header — the header
// strip spans the grid's full width, so its center is far from a pointer
// hovering it and some nearby tile always wins. Section drags are a plain
// vertical list, where nearest-center is exactly right.
const collisionDetection: CollisionDetection = (args) => {
  const sectionDrag = isSectionDrag(args.active);
  const filtered = {
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => {
      const sectionId = sectionIdFromSortableId(String(container.id));
      return sectionDrag
        ? sectionId !== undefined && sectionId !== DEFAULT_SECTION_ID
        : sectionId === undefined;
    }),
  };
  if (sectionDrag) return closestCenter(filtered);
  const withinPointer = pointerWithin(filtered);
  return withinPointer.length > 0 ? withinPointer : closestCenter(filtered);
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
  // The Shortcut whose ghost the DragOverlay is showing; set for the whole
  // pointer-down-to-drop window so the ghost follows the pointer anywhere
  // on screen, above every stacking context.
  const [activeShortcut, setActiveShortcut] = useState<Shortcut | undefined>();
  // True while a Section is being dragged by its handle. The DragOverlay
  // must UNMOUNT for that window: dnd-kit mounts the overlay wrapper for any
  // active drag (even with no children), and a mounted overlay makes every
  // SortableContext hand the active item the strategy's slot-snapping
  // transform instead of the pointer delta — the Section would jump between
  // slots instead of following the pointer.
  const [sectionDragActive, setSectionDragActive] = useState(false);

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
    globalThis.addEventListener("click", guard, { capture: true });
    return () =>
      globalThis.removeEventListener("click", guard, { capture: true });
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
    if (isSectionDrag(event.active)) {
      setSectionDragActive(true);
      return;
    }
    clearSpringTimer();
    const activeId = String(event.active.id);
    const source = findShortcutSection(state.config, activeId);
    if (!source) return;
    setActiveShortcut(
      state.config.sections
        .flatMap((s) => s.shortcuts)
        .find((t) => t.id === activeId)
    );
    send([
      {
        type: "dragStart",
        shortcutId: activeId,
        sectionId: source.sectionId,
        index: source.index,
      },
    ]);
  }

  // Mid-drag, state changes ONLY when the dragged Shortcut crosses into a
  // different Section. Within a Section, the "gap opens under the pointer"
  // effect is dnd-kit's sortable transforms — purely visual, no re-render —
  // and the exact index is resolved once, at drop. Re-rendering the real
  // order on every over-change instead makes tiles move under the pointer,
  // which re-measures rects, which changes `over`, which re-renders — an
  // oscillation that both lags and lands drops one slot off.
  function handleDragOver(event: DragOverEvent) {
    // Section drags need no over-tracking: the sortable strategy slides the
    // siblings visually, and the final order is resolved once, at drop.
    if (isSectionDrag(event.active)) return;
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
    const s = sessionRef.current;
    if (s.phase !== "dragging") return;
    const preview = currentPreview();
    const overSection =
      preview.sections.find((sec) => sec.id === over.id)?.id ?? over.sectionId;
    if (!overSection || overSection === s.overSectionId) return;
    // Crossing into another Section: place the Shortcut at the entry slot
    // (before the tile under the pointer, or at the end of the container).
    const target = resolveDropTarget(preview, s.shortcutId, over);
    if (!target) return;
    send([{ type: "dragOver", sectionId: target.sectionId, index: target.index }]);
  }

  // The Config as currently rendered: committed state plus the in-flight
  // container placement of the dragged Shortcut. Reads sessionRef so event
  // handlers see the same picture the DOM shows, not the render they were
  // created in.
  function currentPreview(): Config {
    const s = sessionRef.current;
    if (s.phase !== "dragging") return state.config;
    return moveShortcut(state.config, s.shortcutId, {
      sectionId: s.overSectionId,
      index: s.overIndex,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (isSectionDrag(event.active)) {
      suppressNextClick();
      setSectionDragActive(false);
      const activeSectionId = sectionIdFromSortableId(String(event.active.id));
      const overSectionId = event.over
        ? sectionIdFromSortableId(String(event.over.id))
        : undefined;
      if (!activeSectionId || !overSectionId) return;
      const ordered = resolveSectionReorder(
        state.config.sections.map((s) => s.id),
        activeSectionId,
        overSectionId
      );
      // Committed synchronously — NOT in a transition — so the reorder lands
      // in the same render batch as dnd-kit clearing the drag transform.
      // Deferring it leaves a frame where the section flashes back to its
      // old slot before the new order paints.
      if (ordered) actions.reorderSections(ordered);
      return;
    }
    clearSpringTimer();
    suppressNextClick();
    setActiveShortcut(undefined);
    if (!event.over) {
      send([{ type: "dragCancel" }]);
      return;
    }
    const s = sessionRef.current;
    if (s.phase !== "dragging") return;
    // Resolve the exact index once, against the rendered picture. When the
    // pointer is over the dragged tile's own placeholder (resolves to
    // nothing), commit its current preview position — that's what the user
    // is looking at.
    const over = overTarget(event.over);
    const target = over
      ? resolveDropTarget(currentPreview(), s.shortcutId, over)
      : undefined;
    send(
      target
        ? [
            { type: "dragOver", sectionId: target.sectionId, index: target.index },
            { type: "drop" },
          ]
        : [{ type: "drop" }]
    );
  }

  function handleDragCancel(event: DragCancelEvent) {
    if (isSectionDrag(event.active)) {
      suppressNextClick();
      setSectionDragActive(false);
      return;
    }
    clearSpringTimer();
    suppressNextClick();
    setActiveShortcut(undefined);
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

  const namedSections = previewConfig.sections.filter(
    (s) => s.id !== DEFAULT_SECTION_ID
  );
  // With a single named Section there's nothing to swap with — the handle
  // still renders (grayed out) but never activates a drag.
  const sectionDragDisabled = namedSections.length < 2;

  // Hiding the default Section is display-only: it stays in the Config
  // untouched, it just doesn't render — no tiles, no droppables, no add
  // affordance.
  const showDefault = state.preferences.showDefaultSection;
  const visibleSections = showDefault
    ? previewConfig.sections
    : namedSections;

  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        // The live preview moves tiles between slots mid-drag, so droppable
        // rects must be re-measured (Always), and measured at their LAYOUT
        // position (ignoreTransform): the slide-into-place transition means
        // a transformed getBoundingClientRect reads mid-animation positions,
        // which makes collisions oscillate and land the drop one slot off.
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
            measure: (el) => getClientRect(el, { ignoreTransform: true }),
          },
        }}
        modifiers={[sectionVerticalAxis]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={namedSections.map((s) => sectionSortableId(s.id))}
          strategy={verticalListSortingStrategy}
        >
          {visibleSections.map((section) => (
            <GridSection
              key={section.id}
              section={section}
              springExpanded={sprungSectionIds.includes(section.id)}
              sectionDragDisabled={sectionDragDisabled}
              onOpenTileDialog={({ sectionId, editingId }) =>
                setDialog({ open: true, sectionId, editingId })
              }
            />
          ))}
        </SortableContext>

        {!showDefault && namedSections.length === 0 && <HiddenDefaultNotice />}

        {!sectionDragActive &&
          createPortal(
            // Portaled to <body> so the ghost escapes the grid's stacking
            // contexts — it must never slide behind headers or page padding.
            <DragOverlay zIndex={60}>
              {activeShortcut ? (
                <GridTileGhost shortcut={activeShortcut} />
              ) : undefined}
            </DragOverlay>,
            document.body
          )}
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
