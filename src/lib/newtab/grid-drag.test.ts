import { describe, expect, it } from "vitest";
import { reorderTargetIndex } from "./grid-drag";

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
