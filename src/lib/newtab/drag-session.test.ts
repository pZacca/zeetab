import { describe, expect, it } from "vitest";
import {
  reduceDragSession,
  initialDragSessionState,
  springExpandedSectionIds,
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
      overHeaderSectionId: undefined,
      springExpandedSectionIds: [],
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
        overHeaderSectionId: undefined,
        springExpandedSectionIds: [],
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
        overHeaderSectionId: undefined,
        springExpandedSectionIds: [],
      });
    });

    it("clears a tracked header hover once a content dragOver arrives", () => {
      let state: DragSessionState = reduceDragSession(
        initialDragSessionState,
        { type: "dragStart", shortcutId: "A", sectionId: "default", index: 0 }
      ).state;
      state = reduceDragSession(state, {
        type: "dragOverSectionHeader",
        sectionId: "s2",
      }).state;
      expect(state).toMatchObject({ overHeaderSectionId: "s2" });

      state = reduceDragSession(state, {
        type: "dragOver",
        sectionId: "default",
        index: 1,
      }).state;

      expect(state).toMatchObject({ overHeaderSectionId: undefined });
    });
  });

  describe("spring-loading (collapsed Section headers)", () => {
    function draggingOverHeader(sectionId: string): DragSessionState {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      return reduceDragSession(dragging, {
        type: "dragOverSectionHeader",
        sectionId,
      }).state;
    }

    it("dragOverSectionHeader tracks the hovered header without expanding or committing", () => {
      const { state, commit } = reduceDragSession(
        reduceDragSession(initialDragSessionState, {
          type: "dragStart",
          shortcutId: "A",
          sectionId: "default",
          index: 0,
        }).state,
        { type: "dragOverSectionHeader", sectionId: "s2" }
      );
      expect(state).toEqual({
        phase: "dragging",
        shortcutId: "A",
        sourceSectionId: "default",
        overSectionId: "default",
        overIndex: 0,
        overHeaderSectionId: "s2",
        springExpandedSectionIds: [],
      });
      expect(commit).toBeUndefined();
    });

    it("is a no-op when idle", () => {
      const { state, commit } = reduceDragSession(initialDragSessionState, {
        type: "dragOverSectionHeader",
        sectionId: "s2",
      });
      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });

    it("springTimerElapsed expands the Section when still hovering its header (the ~600ms case)", () => {
      const overHeader = draggingOverHeader("s2");

      const { state, commit } = reduceDragSession(overHeader, {
        type: "springTimerElapsed",
        sectionId: "s2",
      });

      expect(state).toEqual({
        phase: "dragging",
        shortcutId: "A",
        sourceSectionId: "default",
        overSectionId: "default",
        overIndex: 0,
        overHeaderSectionId: "s2",
        springExpandedSectionIds: ["s2"],
      });
      expect(commit).toBeUndefined();
    });

    it("does not expand when the timer fires for a header no longer hovered (the shorter-pass case)", () => {
      const overHeader = draggingOverHeader("s2");
      const movedAway = reduceDragSession(overHeader, {
        type: "dragOver",
        sectionId: "default",
        index: 1,
      }).state;

      const { state } = reduceDragSession(movedAway, {
        type: "springTimerElapsed",
        sectionId: "s2",
      });

      expect(state).toMatchObject({ springExpandedSectionIds: [] });
    });

    it("does not expand when the timer fires for a header the pointer moved on from to a different header", () => {
      const overFirstHeader = draggingOverHeader("s2");
      const overSecondHeader = reduceDragSession(overFirstHeader, {
        type: "dragOverSectionHeader",
        sectionId: "s3",
      }).state;

      const { state } = reduceDragSession(overSecondHeader, {
        type: "springTimerElapsed",
        sectionId: "s2",
      });

      expect(state).toMatchObject({ springExpandedSectionIds: [] });
    });

    it("is idempotent: a second springTimerElapsed for an already-expanded Section changes nothing", () => {
      const expanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;

      const { state } = reduceDragSession(expanded, {
        type: "springTimerElapsed",
        sectionId: "s2",
      });

      expect(state).toMatchObject({ springExpandedSectionIds: ["s2"] });
    });

    it("is a no-op outside the dragging phase", () => {
      const { state, commit } = reduceDragSession(initialDragSessionState, {
        type: "springTimerElapsed",
        sectionId: "s2",
      });
      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });

    it("accumulates multiple sprung Sections across one drag", () => {
      const firstExpanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;
      const overSecondHeader = reduceDragSession(firstExpanded, {
        type: "dragOverSectionHeader",
        sectionId: "s3",
      }).state;
      const secondExpanded = reduceDragSession(overSecondHeader, {
        type: "springTimerElapsed",
        sectionId: "s3",
      }).state;

      expect(secondExpanded).toMatchObject({
        springExpandedSectionIds: ["s2", "s3"],
      });
    });

    it("dropping into a sprung Section pends confirmation carrying the spring-expanded set", () => {
      const expanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;
      // The Section is now visually expanded, so the pointer resolves to a
      // normal content drop within it before release.
      const overContent = reduceDragSession(expanded, {
        type: "dragOver",
        sectionId: "s2",
        index: 0,
      }).state;

      const { state } = reduceDragSession(overContent, { type: "drop" });

      expect(state).toEqual({
        phase: "pendingConfirmation",
        shortcutId: "A",
        sourceSectionId: "default",
        targetSectionId: "s2",
        targetIndex: 0,
        springExpandedSectionIds: ["s2"],
      });
    });

    it("confirming a drop into a sprung Section marks the commit to persist the expansion", () => {
      const expanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;
      const overContent = reduceDragSession(expanded, {
        type: "dragOver",
        sectionId: "s2",
        index: 0,
      }).state;
      const pending = reduceDragSession(overContent, { type: "drop" }).state;

      const { state, commit } = reduceDragSession(pending, {
        type: "confirm",
      });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toEqual({
        shortcutId: "A",
        sectionId: "s2",
        index: 0,
        expandSection: true,
      });
    });

    it("cancelling the confirmation never persists the expansion (no commit at all)", () => {
      const expanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;
      const overContent = reduceDragSession(expanded, {
        type: "dragOver",
        sectionId: "s2",
        index: 0,
      }).state;
      const pending = reduceDragSession(overContent, { type: "drop" }).state;

      const { state, commit } = reduceDragSession(pending, {
        type: "cancelConfirmation",
      });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });

    it("ending the drag elsewhere (dragCancel) discards the spring-expanded set without a commit", () => {
      const expanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;

      const { state, commit } = reduceDragSession(expanded, {
        type: "dragCancel",
      });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toBeUndefined();
    });

    it("a same-Section drop commits with expandSection false even if other Sections were sprung in passing", () => {
      const expanded = reduceDragSession(draggingOverHeader("s2"), {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;
      const backToOrigin = reduceDragSession(expanded, {
        type: "dragOver",
        sectionId: "default",
        index: 1,
      }).state;

      const { state, commit } = reduceDragSession(backToOrigin, {
        type: "drop",
      });

      expect(state).toEqual({ phase: "idle" });
      expect(commit).toEqual({
        shortcutId: "A",
        sectionId: "default",
        index: 1,
        expandSection: false,
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
      expect(commit).toEqual({
        shortcutId: "A",
        sectionId: "default",
        index: 2,
        expandSection: false,
      });
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
        springExpandedSectionIds: [],
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
        springExpandedSectionIds: [],
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
      expect(commit).toEqual({
        shortcutId: "A",
        sectionId: "s2",
        index: 1,
        expandSection: false,
      });
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

  describe("springExpandedSectionIds selector", () => {
    it("is empty when idle", () => {
      expect(springExpandedSectionIds(initialDragSessionState)).toEqual([]);
    });

    it("reflects the sprung set while dragging", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overHeader = reduceDragSession(dragging, {
        type: "dragOverSectionHeader",
        sectionId: "s2",
      }).state;
      const expanded = reduceDragSession(overHeader, {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;

      expect(springExpandedSectionIds(expanded)).toEqual(["s2"]);
    });

    it("still reflects the sprung set while pendingConfirmation", () => {
      const dragging = reduceDragSession(initialDragSessionState, {
        type: "dragStart",
        shortcutId: "A",
        sectionId: "default",
        index: 0,
      }).state;
      const overHeader = reduceDragSession(dragging, {
        type: "dragOverSectionHeader",
        sectionId: "s2",
      }).state;
      const expanded = reduceDragSession(overHeader, {
        type: "springTimerElapsed",
        sectionId: "s2",
      }).state;
      const overContent = reduceDragSession(expanded, {
        type: "dragOver",
        sectionId: "s2",
        index: 0,
      }).state;
      const pending = reduceDragSession(overContent, { type: "drop" }).state;

      expect(springExpandedSectionIds(pending)).toEqual(["s2"]);
    });
  });
});
