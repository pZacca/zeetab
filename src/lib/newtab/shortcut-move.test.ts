import { describe, expect, it } from "vitest";
import { moveShortcut } from "./shortcut-move";
import { emptyConfig, DEFAULT_SECTION_ID } from "./defaults";
import type { Config, Shortcut } from "./types";

function shortcut(id: string): Shortcut {
  return { id, url: `https://${id}.example.com/`, label: id, icon: { kind: "auto" } };
}

function configWith(sections: { id: string; name: string | null; ids: string[] }[]): Config {
  const cfg = emptyConfig();
  cfg.sections = sections.map((s) => ({
    id: s.id,
    name: s.name,
    collapsed: false,
    shortcuts: s.ids.map(shortcut),
  }));
  return cfg;
}

function ids(config: Config, sectionId: string): string[] {
  const section = config.sections.find((s) => s.id === sectionId);
  return section ? section.shortcuts.map((t) => t.id) : [];
}

describe("moveShortcut", () => {
  it("reorders within a Section: move first item forward past its original position", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B", "C", "D"] },
    ]);
    // Detach A -> [B, C, D]; insert at index 2 -> [B, C, A, D]
    const next = moveShortcut(cfg, "A", { sectionId: DEFAULT_SECTION_ID, index: 2 });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["B", "C", "A", "D"]);
  });

  it("reorders within a Section: move an item backward", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B", "C", "D"] },
    ]);
    // Detach D -> [A, B, C]; insert at index 0 -> [D, A, B, C]
    const next = moveShortcut(cfg, "D", { sectionId: DEFAULT_SECTION_ID, index: 0 });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["D", "A", "B", "C"]);
  });

  it("reorders within a Section: middle item moving one step forward past its own original slot", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B", "C", "D"] },
    ]);
    // Detach B -> [A, C, D]; insert at index 2 -> [A, C, B, D]
    const next = moveShortcut(cfg, "B", { sectionId: DEFAULT_SECTION_ID, index: 2 });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["A", "C", "B", "D"]);
  });

  it("no-ops when the target index within the same Section equals the resulting position", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B", "C"] },
    ]);
    const next = moveShortcut(cfg, "A", { sectionId: DEFAULT_SECTION_ID, index: 0 });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["A", "B", "C"]);
  });

  it("inserts at an exact index in another Section", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B"] },
      { id: "s2", name: "Other", ids: ["X", "Y", "Z"] },
    ]);
    const next = moveShortcut(cfg, "A", { sectionId: "s2", index: 1 });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["B"]);
    expect(ids(next, "s2")).toEqual(["X", "A", "Y", "Z"]);
  });

  it("inserts at index 0 in another Section", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B"] },
      { id: "s2", name: "Other", ids: ["X", "Y"] },
    ]);
    const next = moveShortcut(cfg, "B", { sectionId: "s2", index: 0 });
    expect(ids(next, "s2")).toEqual(["B", "X", "Y"]);
  });

  it("appends when no index is given", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B"] },
      { id: "s2", name: "Other", ids: ["X", "Y"] },
    ]);
    const next = moveShortcut(cfg, "A", { sectionId: "s2" });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["B"]);
    expect(ids(next, "s2")).toEqual(["X", "Y", "A"]);
  });

  it("appends into an empty Section", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A"] },
      { id: "s2", name: "Empty", ids: [] },
    ]);
    const next = moveShortcut(cfg, "A", { sectionId: "s2" });
    expect(ids(next, "s2")).toEqual(["A"]);
  });

  it("is a no-op for an unknown Shortcut id", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B"] },
    ]);
    const next = moveShortcut(cfg, "nonexistent", { sectionId: DEFAULT_SECTION_ID, index: 0 });
    expect(next).toEqual(cfg);
    expect(next).toBe(cfg);
  });

  it("is a no-op for an unknown Section id, leaving the Shortcut in place", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B"] },
    ]);
    const next = moveShortcut(cfg, "A", { sectionId: "nonexistent", index: 0 });
    expect(next).toEqual(cfg);
    expect(next).toBe(cfg);
  });

  it("moving within the same Section to the same index is a no-op", () => {
    const cfg = configWith([
      { id: DEFAULT_SECTION_ID, name: null, ids: ["A", "B", "C"] },
    ]);
    const next = moveShortcut(cfg, "B", { sectionId: DEFAULT_SECTION_ID, index: 1 });
    expect(ids(next, DEFAULT_SECTION_ID)).toEqual(["A", "B", "C"]);
  });
});
