import { describe, expect, it } from "vitest";
import { emptyConfig, DEFAULT_SECTION_ID } from "./defaults";

describe("emptyConfig", () => {
  it("has version 1", () => {
    expect(emptyConfig().version).toBe(1);
  });

  it("contains exactly one section: the default", () => {
    const c = emptyConfig();
    expect(c.sections).toHaveLength(1);
    expect(c.sections[0].id).toBe(DEFAULT_SECTION_ID);
    expect(c.sections[0].name).toBeNull();
    expect(c.sections[0].collapsed).toBe(false);
    expect(c.sections[0].shortcuts).toEqual([]);
  });

  it("returns a fresh object on each call (no shared references)", () => {
    const a = emptyConfig();
    const b = emptyConfig();
    expect(a).not.toBe(b);
    expect(a.sections).not.toBe(b.sections);
    expect(a.sections[0]).not.toBe(b.sections[0]);
  });
});
