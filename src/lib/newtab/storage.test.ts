import { describe, expect, it, vi } from "vitest";
import { readConfig, writeConfig } from "./storage";
import { emptyConfig } from "./defaults";
import { STORAGE_KEY, STORAGE_KEY_PREFIX_CORRUPTED } from "./types";
import { simulateQuotaExceeded, readMockStore } from "../../../test/setup";

describe("storage.readConfig", () => {
  it("returns emptyConfig when nothing is stored", () => {
    expect(readConfig()).toEqual(emptyConfig());
  });

  it("returns stored config when valid", () => {
    const cfg = emptyConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    expect(readConfig()).toEqual(cfg);
  });

  it("returns emptyConfig and backs up raw when JSON is malformed", () => {
    localStorage.setItem(STORAGE_KEY, "{{{not json");
    expect(readConfig()).toEqual(emptyConfig());
    const store = readMockStore();
    const backup = [...store.keys()].find((k) =>
      k.startsWith(STORAGE_KEY_PREFIX_CORRUPTED)
    );
    expect(backup).toBeDefined();
    expect(store.get(backup!)).toBe("{{{not json");
  });

  it("returns emptyConfig and backs up raw when shape is invalid", () => {
    const raw = JSON.stringify({ version: 1, sections: [] });
    localStorage.setItem(STORAGE_KEY, raw);
    expect(readConfig()).toEqual(emptyConfig());
    const store = readMockStore();
    const backup = [...store.keys()].find((k) =>
      k.startsWith(STORAGE_KEY_PREFIX_CORRUPTED)
    );
    expect(backup).toBeDefined();
    expect(store.get(backup!)).toBe(raw);
  });
});

describe("storage.backupCorrupted pruning", () => {
  it("keeps only the 3 most recent corrupted backups when a new one is added", () => {
    const now = Date.now();
    const offsets = [4000, 3000, 2000, 1000];
    for (const offset of offsets) {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX_CORRUPTED}${now - offset}`,
        `old-${offset}`
      );
    }
    localStorage.setItem(STORAGE_KEY, "{{{not json");
    readConfig();

    const store = readMockStore();
    const corrupted = [...store.keys()].filter((k) =>
      k.startsWith(STORAGE_KEY_PREFIX_CORRUPTED)
    );
    expect(corrupted).toHaveLength(3);
    expect(
      corrupted.includes(`${STORAGE_KEY_PREFIX_CORRUPTED}${now - 4000}`)
    ).toBe(false);
    expect(
      corrupted.includes(`${STORAGE_KEY_PREFIX_CORRUPTED}${now - 3000}`)
    ).toBe(false);
    expect(
      corrupted.includes(`${STORAGE_KEY_PREFIX_CORRUPTED}${now - 2000}`)
    ).toBe(true);
    expect(
      corrupted.includes(`${STORAGE_KEY_PREFIX_CORRUPTED}${now - 1000}`)
    ).toBe(true);
  });

  it("does not prune when corrupted count is at or below the cap", () => {
    const now = Date.now();
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX_CORRUPTED}${now - 2000}`,
      "old-1"
    );
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX_CORRUPTED}${now - 1000}`,
      "old-2"
    );
    localStorage.setItem(STORAGE_KEY, "{{{not json");
    readConfig();

    const corrupted = [...readMockStore().keys()].filter((k) =>
      k.startsWith(STORAGE_KEY_PREFIX_CORRUPTED)
    );
    expect(corrupted).toHaveLength(3);
    expect(
      corrupted.includes(`${STORAGE_KEY_PREFIX_CORRUPTED}${now - 2000}`)
    ).toBe(true);
    expect(
      corrupted.includes(`${STORAGE_KEY_PREFIX_CORRUPTED}${now - 1000}`)
    ).toBe(true);
  });
});

describe("storage.writeConfig", () => {
  it("serializes and writes", () => {
    const cfg = emptyConfig();
    expect(writeConfig(cfg)).toEqual({ ok: true });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(cfg));
  });

  it("returns { ok: false, reason: 'quota' } on QuotaExceededError", () => {
    simulateQuotaExceeded(true);
    const cfg = emptyConfig();
    expect(writeConfig(cfg)).toEqual({ ok: false, reason: "quota" });
  });

  it("returns { ok: false, reason: 'unavailable' } when localStorage throws non-quota", () => {
    vi.stubGlobal("localStorage", {
      setItem() {
        throw new Error("boom");
      },
      // eslint-disable-next-line unicorn/no-null
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      // eslint-disable-next-line unicorn/no-null
      key: () => null,
      length: 0,
    });
    const cfg = emptyConfig();
    expect(writeConfig(cfg)).toEqual({ ok: false, reason: "unavailable" });
  });
});
