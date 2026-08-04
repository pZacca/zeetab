import { describe, expect, it } from "vitest";
import { reorderTargetIndex, crossSectionDropIndex } from "./grid-drag";

describe("reorderTargetIndex", () => {
  it("returns the over item's index when dragged to a new position", () => {
    expect(reorderTargetIndex(["A", "B", "C", "D"], "A", "C")).toBe(2);
  });

  it("returns the over item's index when dragged backward", () => {
    expect(reorderTargetIndex(["A", "B", "C", "D"], "D", "A")).toBe(0);
  });

  it("is undefined when dropped on itself (dragged back to its own start)", () => {
    expect(reorderTargetIndex(["A", "B", "C"], "B", "B")).toBeUndefined();
  });

  it("is undefined when the active id is unknown", () => {
    expect(reorderTargetIndex(["A", "B"], "nonexistent", "A")).toBeUndefined();
  });

  it("is undefined when the over id is unknown", () => {
    expect(reorderTargetIndex(["A", "B"], "A", "nonexistent")).toBeUndefined();
  });
});

describe("crossSectionDropIndex", () => {
  it("lands at the hovered Shortcut's index", () => {
    expect(crossSectionDropIndex(["X", "Y", "Z"], "Y")).toBe(1);
  });

  it("lands at index 0 when hovering the first Shortcut", () => {
    expect(crossSectionDropIndex(["X", "Y", "Z"], "X")).toBe(0);
  });

  it("lands at the end when the over id isn't one of the target's Shortcuts (empty Section, header, or container)", () => {
    expect(crossSectionDropIndex(["X", "Y"], "some-section-id")).toBe(2);
  });

  it("lands at index 0 for an empty target Section", () => {
    expect(crossSectionDropIndex([], "empty-section-id")).toBe(0);
  });
});
