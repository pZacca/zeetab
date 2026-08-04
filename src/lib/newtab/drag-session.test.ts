import { describe, expect, it } from "vitest";
import {
  reduceDragSession,
  initialDragSessionState,
  type DragSessionState,
} from "./drag-session";

describe("reduceDragSession", () => {
  it("starts idle", () => {
    expect(initialDragSessionState).toEqual({ phase: "idle" });
  });

  it("dragStart begins a dragging session over its own origin", () => {
    const { state, commit } = reduceDragSession(initialDragSessionState, {
      type: "dragStart",
      shortcutId: "A",
      sectionId: "default",
      index: 0,
    });
    expect(state).toEqual({
      phase: "dragging",
      shortcutId: "A",
      sourceSectionId: "default",
      overSectionId: "default",
      overIndex: 0,
    });
    expect(commit).toBeUndefined();
  });

  describe("preview (dragOver while dragging)", () => {
    it("updates the hovered Section and index without emitting a commit", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;

      const { state, commit } = reduceDragSession(dragging, {
        type: "dragOver",
        sectionId: "s2",
        index: 2,
      });

      expect(state).toEqual({
        phase: "dragging",
        shortcutId: "A",
        sourceSectionId: "default",
        overSectionId: "s2",
        overIndex: 2,
      });
      expect(commit).toBeUndefined();
    });

    it("is a no-op when idle (no drag in progress)", () => {
      const { state, commit } = reduceDragSession(initialDragSessionState, {
        type: "dragOver",
        sectionId: "s2",
        index: 0,
      });
      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });

    it("tracks multiple dragOver events, keeping only the latest preview", () => {
      let state: DragSessionState = reduceDragSession(
        initialDragSessionState,
        { type: "dragStart", shortcutId: "A", sectionId: "default", index: 0 }
      ).state;
      state = reduceDragSession(state, {
        type: "dragOver",
        sectionId: "s2",
        index: 1,
      }).state;
      state = reduceDragSession(state, {
        type: "dragOver",
        sectionId: "default",
        index: 3,
      }).state;

      expect(state).toEqual({
        phase: "dragging",
        shortcutId: "A",
        sourceSectionId: "default",
        overSectionId: "default",
        overIndex: 3,
      });
    });
  });

  describe("drop", () => {
    it("commits immediately when dropped within the origin Section (no confirmation)", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overed = reduceDragSession(dragging, {
        type: "dragOver",
        sectionId: "default",
        index: 2,
      }).state;

      const { state, commit } = reduceDragSession(overed, { type: "drop" });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toEqual({ shortcutId: "A", sectionId: "default", index: 2 });
    });

    it("pends confirmation when dropped in a different Section, emitting no commit", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overed = reduceDragSession(dragging, {
        type: "dragOver",
        sectionId: "s2",
        index: 1,
      }).state;

      const { state, commit } = reduceDragSession(overed, { type: "drop" });

      expect(state).toEqual({
        phase: "pendingConfirmation",
        shortcutId: "A",
        sourceSectionId: "default",
        targetSectionId: "s2",
        targetIndex: 1,
      });
      expect(commit).toBeUndefined();
    });

    it("dropping onto an empty Section pends confirmation at index 0 like any other Section", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overed = reduceDragSession(dragging, {
        type: "dragOver",
        sectionId: "empty-section",
        index: 0,
      }).state;

      const { state } = reduceDragSession(overed, { type: "drop" });

      expect(state).toEqual({
        phase: "pendingConfirmation",
        shortcutId: "A",
        sourceSectionId: "default",
        targetSectionId: "empty-section",
        targetIndex: 0,
      });
    });

    it("is a no-op (idle, no commit) when idle", () => {
      const { state, commit } = reduceDragSession(initialDragSessionState, {
        type: "drop",
      });
      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });
  });

  describe("dragCancel", () => {
    it("reverts a dragging session to idle without a commit", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;

      const { state, commit } = reduceDragSession(dragging, {
        type: "dragCancel",
      });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });
  });

  describe("confirm (confirm→commit)", () => {
    it("emits a commit at the pending target and returns to idle", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overed = reduceDragSession(dragging, {
        type: "dragOver",
        sectionId: "s2",
        index: 1,
      }).state;
      const pending = reduceDragSession(overed, { type: "drop" }).state;

      const { state, commit } = reduceDragSession(pending, { type: "confirm" });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toEqual({ shortcutId: "A", sectionId: "s2", index: 1 });
    });

    it("is a no-op outside pendingConfirmation", () => {
      const { state, commit } = reduceDragSession(initialDragSessionState, {
        type: "confirm",
      });
      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });
  });

  describe("cancelConfirmation (cancel→revert)", () => {
    it("reverts to idle without a commit, restoring the pre-drag arrangement", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overed = reduceDragSession(dragging, {
        type: "dragOver",
        sectionId: "s2",
        index: 1,
      }).state;
      const pending = reduceDragSession(overed, { type: "drop" }).state;

      const { state, commit } = reduceDragSession(pending, {
        type: "cancelConfirmation",
      });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });

    it("is a no-op outside pendingConfirmation", () => {
      const { state, commit } = reduceDragSession(initialDragSessionState, {
        type: "cancelConfirmation",
      });
      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });
  });
});
