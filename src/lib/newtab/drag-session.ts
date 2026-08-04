// src/lib/newtab/drag-session.ts
//
// Pure state machine behind the grid drag gesture. No React, no dnd-kit —
// events in, next state (and an optional commit instruction) out.
//
// The guard-on-gesture rule lives here: a drop that lands in the Shortcut's
// origin Section commits immediately; a drop that lands in a different
// Section pends confirmation instead, and only emits a commit once the
// caller sends `confirm`. `cancelConfirmation` (and `dragCancel` while
// still dragging) revert to `idle` and never emit a commit.
//
// Spring-loading: hovering the dragged tile over a collapsed Section's
// *header* is tracked via `dragOverSectionHeader`. The caller (component
// layer) owns the real clock — it starts a ~600ms timer on that event and,
// if the pointer is still over the same header when it elapses, sends
// `springTimerElapsed`. This reducer is the source of truth for whether
// that still applies: `overHeaderSectionId` records the header currently
// being hovered, and any event that isn't still hovering it (a content
// dragOver, or a header-hover of a different Section) clears or replaces
// it, so a stale timer's `springTimerElapsed` is a no-op. A Section that
// makes it into `springExpandedSectionIds` stays transiently expanded for
// the rest of the drag; that set — and the transient expansion it drives —
// disappears the moment the session returns to `idle`, whether by
// `dragCancel`, a same-Section `drop`, or `cancelConfirmation`. The
// persisted `collapsed` flag is never touched from hover alone: a commit
// only carries `expandSection: true` when its target Section was actually
// sprung open, letting the caller flip the persisted flag exclusively on a
// confirmed drop into it.

export type DragSessionState =
  | { readonly phase: "idle" }
  | {
      readonly phase: "dragging";
      readonly shortcutId: string;
      readonly sourceSectionId: string;
      readonly overSectionId: string;
      readonly overIndex: number;
      readonly overHeaderSectionId: string | undefined;
      readonly springExpandedSectionIds: readonly string[];
    }
  | {
      readonly phase: "pendingConfirmation";
      readonly shortcutId: string;
      readonly sourceSectionId: string;
      readonly targetSectionId: string;
      readonly targetIndex: number;
      readonly springExpandedSectionIds: readonly string[];
    };

export type DragSessionEvent =
  | {
      readonly type: "dragStart";
      readonly shortcutId: string;
      readonly sectionId: string;
      readonly index: number;
    }
  | {
      readonly type: "dragOver";
      readonly sectionId: string;
      readonly index: number;
    }
  | {
      /** The dragged tile is hovering a collapsed Section's header. */
      readonly type: "dragOverSectionHeader";
      readonly sectionId: string;
    }
  | {
      /** The caller's ~600ms timer elapsed for this Section's header. */
      readonly type: "springTimerElapsed";
      readonly sectionId: string;
    }
  | { readonly type: "dragCancel" }
  | { readonly type: "drop" }
  | { readonly type: "confirm" }
  | { readonly type: "cancelConfirmation" };

export type DragSessionCommit = {
  readonly shortcutId: string;
  readonly sectionId: string;
  readonly index: number;
  /**
   * True when `sectionId` was transiently spring-expanded during this drag —
   * the caller should persist its `collapsed` flag as false. False for
   * every other commit, including same-Section drops.
   */
  readonly expandSection: boolean;
};

export type DragSessionResult = {
  readonly state: DragSessionState;
  readonly commit?: DragSessionCommit;
};

export const initialDragSessionState: DragSessionState = { phase: "idle" };

/**
 * Advances a drag session by one event. Pure: same `(state, event)` always
 * yields the same `DragSessionResult`.
 */
export function reduceDragSession(
  state: DragSessionState,
  event: DragSessionEvent
): DragSessionResult {
  switch (event.type) {
    case "dragStart": {
      return {
        state: {
          phase: "dragging",
          shortcutId: event.shortcutId,
          sourceSectionId: event.sectionId,
          overSectionId: event.sectionId,
          overIndex: event.index,
          overHeaderSectionId: undefined,
          springExpandedSectionIds: [],
        },
      };
    }

    case "dragOver": {
      if (state.phase !== "dragging") return { state };
      return {
        state: {
          ...state,
          overSectionId: event.sectionId,
          overIndex: event.index,
          overHeaderSectionId: undefined,
        },
      };
    }

    case "dragOverSectionHeader": {
      if (state.phase !== "dragging") return { state };
      if (state.overHeaderSectionId === event.sectionId) return { state };
      return {
        state: { ...state, overHeaderSectionId: event.sectionId },
      };
    }

    case "springTimerElapsed": {
      if (state.phase !== "dragging") return { state };
      if (state.overHeaderSectionId !== event.sectionId) return { state };
      if (state.springExpandedSectionIds.includes(event.sectionId)) {
        return { state };
      }
      return {
        state: {
          ...state,
          springExpandedSectionIds: [
            ...state.springExpandedSectionIds,
            event.sectionId,
          ],
        },
      };
    }

    case "dragCancel": {
      return state.phase === "idle" ? { state } : { state: { phase: "idle" } };
    }

    case "drop": {
      if (state.phase !== "dragging") return { state: { phase: "idle" } };

      const {
        shortcutId,
        sourceSectionId,
        overSectionId,
        overIndex,
        springExpandedSectionIds,
      } = state;

      if (overSectionId === sourceSectionId) {
        // Same Section: the guard is off. Commit immediately.
        return {
          state: { phase: "idle" },
          commit: {
            shortcutId,
            sectionId: overSectionId,
            index: overIndex,
            expandSection: springExpandedSectionIds.includes(overSectionId),
          },
        };
      }

      // Cross Section: the gesture guard kicks in. Await confirmation —
      // nothing is written yet.
      return {
        state: {
          phase: "pendingConfirmation",
          shortcutId,
          sourceSectionId,
          targetSectionId: overSectionId,
          targetIndex: overIndex,
          springExpandedSectionIds,
        },
      };
    }

    case "confirm": {
      if (state.phase !== "pendingConfirmation") return { state };
      return {
        state: { phase: "idle" },
        commit: {
          shortcutId: state.shortcutId,
          sectionId: state.targetSectionId,
          index: state.targetIndex,
          expandSection: state.springExpandedSectionIds.includes(
            state.targetSectionId
          ),
        },
      };
    }

    case "cancelConfirmation": {
      if (state.phase !== "pendingConfirmation") return { state };
      return { state: { phase: "idle" } };
    }

    default: {
      return { state };
    }
  }
}

/**
 * The Section ids currently transiently spring-expanded by the drag
 * session — `[]` outside `dragging`/`pendingConfirmation`. The caller uses
 * this to render those Sections as expanded without touching their
 * persisted `collapsed` flag.
 */
export function springExpandedSectionIds(
  state: DragSessionState
): readonly string[] {
  return state.phase === "dragging" || state.phase === "pendingConfirmation"
    ? state.springExpandedSectionIds
    : [];
}
