import { describe, expect, it } from "vitest";
import {
  appendImportedSection,
  exportFilename,
  parseImport,
  parseSectionImport,
  sectionExportFilename,
  serializeExport,
  serializeSectionExport,
} from "./import-export";
import { emptyConfig } from "./defaults";
import type { Section } from "./types";

function sectionFixture(): Section {
  return {
    id: "imported-section",
    name: "Work & Focus",
    collapsed: true,
    shortcuts: [
      {
        id: "imported-shortcut-1",
        url: "https://example.com/one",
        label: "One",
        icon: { kind: "auto" },
      },
      {
        id: "imported-shortcut-2",
        url: "https://example.com/two",
        label: "Two",
        icon: { kind: "upload", dataUrl: "data:image/png;base64,abc" },
      },
    ],
  };
}

describe("parseImport", () => {
  it("accepts a valid config", () => {
    const cfg = emptyConfig();
    cfg.sections[0].shortcuts.push({
      id: "a",
      url: "https://x.com/",
      label: "x",
      icon: { kind: "auto" },
    });
    const json = JSON.stringify(cfg);
    const result = parseImport(json);
    expect(result).toEqual({ ok: true, config: cfg });
  });

  it("rejects non-JSON strings", () => {
    const result = parseImport("not json");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/json/i);
  });

  it("rejects valid JSON with wrong shape", () => {
    expect(parseImport("null").ok).toBe(false);
    expect(parseImport('"string"').ok).toBe(false);
    expect(parseImport('{ "foo": 1 }').ok).toBe(false);
    expect(parseImport('{ "version": 1, "sections": [] }').ok).toBe(false);
  });

  it("rejects a version newer than known", () => {
    const newer = JSON.stringify({ version: 2, sections: emptyConfig().sections });
    const result = parseImport(newer);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/version/i);
  });
});

describe("serializeExport", () => {
  it("produces JSON that round-trips", () => {
    const cfg = emptyConfig();
    const json = serializeExport(cfg);
    const back = parseImport(json);
    expect(back).toEqual({ ok: true, config: cfg });
  });

  it("formats output with indentation", () => {
    const cfg = emptyConfig();
    // eslint-disable-next-line unicorn/no-null
    expect(serializeExport(cfg)).toBe(JSON.stringify(cfg, null, 2));
  });
});

describe("exportFilename", () => {
  it("uses YYYY-MM-DD format", () => {
    const d = new Date("2026-04-24T12:00:00Z");
    expect(exportFilename(d)).toBe("zacca-newtab-config-2026-04-24.json");
  });
});

describe("standalone Section import and export", () => {
  it("round-trips a Section in an indented versioned envelope", () => {
    const section = sectionFixture();
    const serialized = serializeSectionExport(section);

    // eslint-disable-next-line unicorn/no-null
    expect(serialized).toBe(JSON.stringify({ version: 1, section }, null, 2));
    expect(parseSectionImport(serialized)).toEqual({ ok: true, section });
  });

  it("rejects invalid JSON, future versions, and full Config exports", () => {
    const section = sectionFixture();

    const invalid = parseSectionImport("not json");
    expect(invalid.ok).toBe(false);
    expect(invalid.ok === false && invalid.reason).toMatch(/json/i);

    const future = parseSectionImport(
      JSON.stringify({ version: 2, section }),
    );
    expect(future.ok).toBe(false);
    expect(future.ok === false && future.reason).toMatch(/version/i);

    const config = parseSectionImport(JSON.stringify(emptyConfig()));
    expect(config.ok).toBe(false);
    expect(config.ok === false && config.reason).toMatch(/full config/i);
  });

  it("rejects missing envelopes and malformed Sections", () => {
    const missing = parseSectionImport(JSON.stringify(sectionFixture()));
    expect(missing.ok).toBe(false);
    expect(missing.ok === false && missing.reason).toMatch(/envelope/i);

    const malformed = parseSectionImport(
      JSON.stringify({
        version: 1,
        section: {
          id: "broken",
          name: "Broken",
          collapsed: "yes",
          shortcuts: [],
        },
      }),
    );
    expect(malformed.ok).toBe(false);
    expect(malformed.ok === false && malformed.reason).toMatch(
      /malformed section/i,
    );
  });

  it("rejects version mismatches and non-numeric versions", () => {
    const section = sectionFixture();

    const older = parseSectionImport(JSON.stringify({ version: 0, section }));
    expect(older.ok).toBe(false);
    expect(older.ok === false && older.reason).toMatch(/expected 1/);

    const stringy = parseSectionImport(
      JSON.stringify({ version: "1", section }),
    );
    expect(stringy.ok).toBe(false);
    expect(stringy.ok === false && stringy.reason).toMatch(/expected 1/);
  });

  it("rejects envelopes without a section, arrays, and null", () => {
    for (const raw of [JSON.stringify({ version: 1 }), "[]", "null"]) {
      const result = parseSectionImport(raw);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toMatch(/envelope/i);
    }
  });

  it("reports a newer version before complaining about a full Config export", () => {
    const result = parseSectionImport(
      JSON.stringify({ version: 2, sections: [] }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toMatch(/newer/i);
  });
});

describe("sectionExportFilename", () => {
  const date = new Date("2026-04-24T12:00:00Z");

  it("slugs the Section name and uses YYYY-MM-DD", () => {
    expect(sectionExportFilename(sectionFixture(), date)).toBe(
      "zacca-newtab-section-work-focus-2026-04-24.json",
    );
  });

  it("uses default for a null Section name", () => {
    const section = sectionFixture();
    // eslint-disable-next-line unicorn/no-null
    section.name = null;

    expect(sectionExportFilename(section, date)).toBe(
      "zacca-newtab-section-default-2026-04-24.json",
    );
  });

  it("falls back to section when the name has no slug-safe characters", () => {
    const section = sectionFixture();
    section.name = "!!! ***";

    expect(sectionExportFilename(section, date)).toBe(
      "zacca-newtab-section-section-2026-04-24.json",
    );
  });
});

describe("appendImportedSection", () => {
  it("appends without overwriting the current Config and preserves Section data", () => {
    const config = emptyConfig();
    config.sections[0].shortcuts.push({
      id: "existing-shortcut",
      url: "https://existing.example/",
      label: "Existing",
      icon: { kind: "auto" },
    });
    const section = sectionFixture();
    let id = 0;

    const result = appendImportedSection(
      config,
      section,
      () => `generated-${++id}`,
    );

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]).toBe(config.sections[0]);
    expect(result.sections[1]).toEqual({
      id: "generated-1",
      name: section.name,
      collapsed: section.collapsed,
      shortcuts: [
        { ...section.shortcuts[0], id: "generated-2" },
        { ...section.shortcuts[1], id: "generated-3" },
      ],
    });
  });

  it("does not mutate the current Config or imported Section", () => {
    const config = emptyConfig();
    const section = sectionFixture();
    const configBefore = JSON.stringify(config);
    const sectionBefore = JSON.stringify(section);
    let id = 0;

    const result = appendImportedSection(
      config,
      section,
      () => `generated-${++id}`,
    );

    expect(result).not.toBe(config);
    expect(JSON.stringify(config)).toBe(configBefore);
    expect(JSON.stringify(section)).toBe(sectionBefore);
    expect(result.sections[1]).not.toBe(section);
    expect(result.sections[1].shortcuts[0]).not.toBe(section.shortcuts[0]);
  });

  it("renames an imported default Section without breaking the default invariant", () => {
    const config = emptyConfig();
    const section = sectionFixture();
    // eslint-disable-next-line unicorn/no-null
    section.name = null;
    let id = 0;

    const result = appendImportedSection(
      config,
      section,
      () => `generated-${++id}`,
    );

    // eslint-disable-next-line unicorn/no-null
    expect(result.sections[0].name).toBe(null);
    expect(result.sections[1].name).toBe("Imported default");
  });

  it("deterministically skips every existing, imported, and generated ID collision", () => {
    const config = emptyConfig();
    config.sections[0].shortcuts.push({
      id: "taken-shortcut",
      url: "https://existing.example/",
      label: "Existing",
      icon: { kind: "auto" },
    });
    config.sections.push({
      id: "taken-section",
      name: "Taken",
      collapsed: false,
      shortcuts: [],
    });
    const generated = [
      "default",
      "taken-shortcut",
      "imported-section",
      "fresh-section",
      "fresh-section",
      "taken-section",
      "imported-shortcut-1",
      "fresh-shortcut-1",
      "fresh-shortcut-1",
      "imported-shortcut-2",
      "fresh-shortcut-2",
    ];
    const createId = (): string => {
      const id = generated.shift();
      if (id === undefined) throw new Error("ID fixture exhausted");
      return id;
    };

    const result = appendImportedSection(config, sectionFixture(), createId);
    const imported = result.sections[2];

    expect(imported.id).toBe("fresh-section");
    expect(imported.shortcuts.map((shortcut) => shortcut.id)).toEqual([
      "fresh-shortcut-1",
      "fresh-shortcut-2",
    ]);
    expect(generated).toEqual([]);
  });
});
