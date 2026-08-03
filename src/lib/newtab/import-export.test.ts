import { describe, expect, it } from "vitest";
import { parseImport, serializeExport, exportFilename } from "./import-export";
import { emptyConfig } from "./defaults";

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
