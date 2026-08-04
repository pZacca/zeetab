import { describe, expect, it } from "vitest";
import {
  reorderTargetIndex,
  crossSectionDropIndex,
  findShortcutSection,
  resolveDropTarget,
  sectionHeaderDroppableId,
  sectionIdFromHeaderDroppableId,
} from "./grid-drag";
import { emptyConfig, DEFAULT_SECTION_ID } from "./defaults";
import type { Config, Shortcut } from "./types";

function shortcut(id: string): Shortcut {
  return { id, url: `https://${id}.example.com/`, label: id, icon: { kind: "auto" } };
}

function configWith(sections: { id: string; name?: string; ids: string[] }[]): Config {
  const cfg = emptyConfig();
  cfg.sections = sections.map((s) => ({
    id: s.id,
    // eslint-disable-next-line unicorn/no-null
    name: s.name ?? null,
    collapsed: false,
    shortcuts: s.ids.map((id) => shortcut(id)),
  }));
  return cfg;
}

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

describe("findShortcutSection", () => {
  it("locates a Shortcut's Section and index", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, ids: ["A", "B"] },
      { id: "s2", ids: ["X", "Y", "Z"] },
    ]);
    expect(findShortcutSection(cfg, "Y")).toEqual({ sectionId: "s2", index: 1 });
  });

  it("is undefined for an unknown Shortcut id", () => {
    const cfg = configWith([{ id: DEFAULT_SECTION_ID, ids: ["A"] }]);
    expect(findShortcutSection(cfg, "nonexistent")).toBeUndefined();
  });
});

describe("resolveDropTarget", () => {
  it("resolves a within-Section reorder", () => {
    const cfg = configWith([{ id: DEFAULT_SECTION_ID, ids: ["A", "B", "C"] }]);
    expect(
      resolveDropTarget(cfg, "A", { id: "C", sectionId: DEFAULT_SECTION_ID })
    ).toEqual({
      sectionId: DEFAULT_SECTION_ID,
      index: 2,
    });
  });

  it("is undefined for a within-Section drop back on itself", () => {
    const cfg = configWith([{ id: DEFAULT_SECTION_ID, ids: ["A", "B"] }]);
    expect(
      resolveDropTarget(cfg, "A", { id: "A", sectionId: DEFAULT_SECTION_ID })
    ).toBeUndefined();
  });

  it("resolves a cross-Section drop onto another Shortcut, using the over item's sectionId", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, ids: ["A", "B"] },
      { id: "s2", ids: ["X", "Y"] },
    ]);
    expect(
      resolveDropTarget(cfg, "A", { id: "Y", sectionId: "s2" })
    ).toEqual({ sectionId: "s2", index: 1 });
  });

  it("resolves a cross-Section drop onto the Section container itself (empty Section)", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, ids: ["A"] },
      { id: "empty", ids: [] },
    ]);
    expect(resolveDropTarget(cfg, "A", { id: "empty" })).toEqual({
      sectionId: "empty",
      index: 0,
    });
  });

  it("resolves a cross-Section drop onto the default Section's container", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, ids: [] },
      { id: "s2", ids: ["X"] },
    ]);
    expect(resolveDropTarget(cfg, "X", { id: DEFAULT_SECTION_ID })).toEqual({
      sectionId: DEFAULT_SECTION_ID,
      index: 0,
    });
  });

  it("is undefined when the active Shortcut id is unknown", () => {
    const cfg = configWith([{ id: DEFAULT_SECTION_ID, ids: ["A"] }]);
    expect(
      resolveDropTarget(cfg, "nonexistent", { id: DEFAULT_SECTION_ID })
    ).toBeUndefined();
  });

  it("is undefined when over resolves to no Section (no sectionId, no matching container id)", () => {
    const cfg = configWith([{ id: DEFAULT_SECTION_ID, ids: ["A", "B"] }]);
    expect(
      resolveDropTarget(cfg, "A", { id: "floating-overlay-id" })
    ).toBeUndefined();
  });
});

describe("sectionHeaderDroppableId / sectionIdFromHeaderDroppableId", () => {
  it("round-trips a Section id through the header droppable id", () => {
    expect(sectionIdFromHeaderDroppableId(sectionHeaderDroppableId("s2"))).toBe(
      "s2"
    );
  });

  it("produces an id distinct from the Section's own id (never collides with a container/Shortcut id)", () => {
    expect(sectionHeaderDroppableId("s2")).not.toBe("s2");
  });

  it("is undefined for an id that isn't a header droppable id", () => {
    expect(sectionIdFromHeaderDroppableId("s2")).toBeUndefined();
    expect(sectionIdFromHeaderDroppableId("some-shortcut-id")).toBeUndefined();
  });
});
