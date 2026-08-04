import { describe, expect, it, vi } from "vitest";
import {
  readPreferences,
  writePreferences,
  setConfirmCrossSectionMove,
  PREFERENCES_STORAGE_KEY,
} from "./preferences";

describe("preferences.readPreferences", () => {
  it("defaults to confirming when nothing is stored", () => {
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });

  it("returns the stored Preference when valid", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ confirmCrossSectionMove: false })
    );
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: false });
  });

  it("falls back to defaults when the JSON is malformed", () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, "{{{not json");
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });

  it("falls back to defaults when the shape is not an object", () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify("nope"));
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });

  it("falls back to defaults when confirmCrossSectionMove is missing", () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({}));
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });

  it("falls back to defaults when confirmCrossSectionMove has the wrong type", () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ confirmCrossSectionMove: "false" })
    );
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });

  it("falls back to defaults when localStorage access throws", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("boom");
      },
    });
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });
});

describe("preferences.writePreferences", () => {
  it("round-trips through localStorage", () => {
    writePreferences({ confirmCrossSectionMove: false });
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: false });
  });

  it("is best-effort and does not throw when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      setItem() {
        throw new Error("boom");
      },
    });
    expect(() =>
      writePreferences({ confirmCrossSectionMove: false })
    ).not.toThrow();
  });
});

describe("preferences.setConfirmCrossSectionMove", () => {
  it("writes and returns the updated Preferences", () => {
    const result = setConfirmCrossSectionMove(false);
    expect(result).toEqual({ confirmCrossSectionMove: false });
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: false });
  });

  it("re-enabling restores confirmation", () => {
    setConfirmCrossSectionMove(false);
    setConfirmCrossSectionMove(true);
    expect(readPreferences()).toEqual({ confirmCrossSectionMove: true });
  });
});
