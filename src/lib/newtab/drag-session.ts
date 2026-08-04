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

export type DragSessionState =
  | { readonly phase: "idle" }
  | {
      readonly phase: "dragging";
      readonly shortcutId: string;
      readonly sourceSectionId: string;
      readonly overSectionId: string;
      readonly overIndex: number;
    }
  | {
      readonly phase: "pendingConfirmation";
      readonly shortcutId: string;
      readonly sourceSectionId: string;
      readonly targetSectionId: string;
      readonly targetIndex: number;
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
  | { readonly type: "dragCancel" }
  | { readonly type: "drop" }
  | { readonly type: "confirm" }
  | { readonly type: "cancelConfirmation" };

export type DragSessionCommit = {
  readonly shortcutId: string;
  readonly sectionId: string;
  readonly index: number;
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
        },
      };
    }

    case "dragCancel": {
      return state.phase === "idle" ? { state } : { state: { phase: "idle" } };
    }

    case "drop": {
      if (state.phase !== "dragging") return { state: { phase: "idle" } };

      const { shortcutId, sourceSectionId, overSectionId, overIndex } = state;

      if (overSectionId === sourceSectionId) {
        // Same Section: the guard is off. Commit immediately.
        return {
          state: { phase: "idle" },
          commit: { shortcutId, sectionId: overSectionId, index: overIndex },
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
