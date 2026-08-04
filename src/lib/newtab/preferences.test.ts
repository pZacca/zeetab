import { describe, expect, it, vi } from "vitest";
import {
  readPreferences,
  writePreferences,
  setConfirmCrossSectionMove,
  setShowDefaultSection,
  PREFERENCES_STORAGE_KEY,
} from "./preferences";

const DEFAULTS = { confirmCrossSectionMove: true, showDefaultSection: true };

describe("preferences.readPreferences", () => {
  it("defaults to confirming when nothing is stored", () => {
    expect(readPreferences()).toEqual(DEFAULTS);
  });

  it("shows the default Section by default", () => {
    expect(readPreferences().showDefaultSection).toBe(true);
  });

  it("returns the stored Preferences when valid", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ confirmCrossSectionMove: false, showDefaultSection: false })
    );
    expect(readPreferences()).toEqual({
      confirmCrossSectionMove: false,
      showDefaultSection: false,
    });
  });

  it("fills fields missing from an older stored value with defaults, keeping the stored ones", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ confirmCrossSectionMove: false })
    );
    expect(readPreferences()).toEqual({
      confirmCrossSectionMove: false,
      showDefaultSection: true,
    });
  });

  it("falls back per field when one field has the wrong type, keeping the valid ones", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ confirmCrossSectionMove: "false", showDefaultSection: false })
    );
    expect(readPreferences()).toEqual({
      confirmCrossSectionMove: true,
      showDefaultSection: false,
    });
  });

  it("falls back to defaults when the JSON is malformed", () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, "{{{not json");
    expect(readPreferences()).toEqual(DEFAULTS);
  });

  it("falls back to defaults when the shape is not an object", () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify("nope"));
    expect(readPreferences()).toEqual(DEFAULTS);
  });

  it("falls back to defaults when the stored object is empty", () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({}));
    expect(readPreferences()).toEqual(DEFAULTS);
  });

  it("falls back to defaults when localStorage access throws", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("boom");
      },
    });
    expect(readPreferences()).toEqual(DEFAULTS);
  });
});

describe("preferences.writePreferences", () => {
  it("round-trips through localStorage", () => {
    writePreferences({ confirmCrossSectionMove: false, showDefaultSection: false });
    expect(readPreferences()).toEqual({
      confirmCrossSectionMove: false,
      showDefaultSection: false,
    });
  });

  it("is best-effort and does not throw when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      setItem() {
        throw new Error("boom");
      },
    });
    expect(() =>
      writePreferences({ confirmCrossSectionMove: false, showDefaultSection: true })
    ).not.toThrow();
  });
});

describe("preferences.setConfirmCrossSectionMove", () => {
  it("writes and returns the updated Preferences", () => {
    const result = setConfirmCrossSectionMove(false);
    expect(result).toEqual({ ...DEFAULTS, confirmCrossSectionMove: false });
    expect(readPreferences()).toEqual({ ...DEFAULTS, confirmCrossSectionMove: false });
  });

  it("re-enabling restores confirmation", () => {
    setConfirmCrossSectionMove(false);
    setConfirmCrossSectionMove(true);
    expect(readPreferences()).toEqual(DEFAULTS);
  });
});

describe("preferences.setShowDefaultSection", () => {
  it("writes and returns the updated Preferences, preserving the other fields", () => {
    setConfirmCrossSectionMove(false);
    const result = setShowDefaultSection(false);
    expect(result).toEqual({
      confirmCrossSectionMove: false,
      showDefaultSection: false,
    });
    expect(readPreferences()).toEqual({
      confirmCrossSectionMove: false,
      showDefaultSection: false,
    });
  });

  it("re-enabling restores the default Section's visibility", () => {
    setShowDefaultSection(false);
    setShowDefaultSection(true);
    expect(readPreferences().showDefaultSection).toBe(true);
  });
});
