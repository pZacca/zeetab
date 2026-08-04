// src/lib/newtab/preferences.ts
//
// Device-local Preferences: UI toggles that live outside the Config, under
// their own versioned storage key. They never travel via Import/Export and
// don't participate in CONFIG_VERSION or migrations — an exported Config
// carries no trace of them.
//
// Read/write shape mirrors storage.ts: a missing key falls back to defaults,
// and (unlike Config) a malformed value falls back safely without a
// corrupted-backup step — Preferences are non-critical device-local UI
// state, not user data worth preserving for recovery.

export type Preferences = {
  /** Confirm before committing a cross-Section drag-and-drop. */
  confirmCrossSectionMove: boolean;
};

export const PREFERENCES_STORAGE_KEY = "zacca.newtab.preferences.v1";

export function defaultPreferences(): Preferences {
  return { confirmCrossSectionMove: true };
}

export function readPreferences(): Preferences {
  let raw: string | undefined;
  try {
    raw =
      globalThis.localStorage?.getItem(PREFERENCES_STORAGE_KEY) ?? undefined;
  } catch {
    return defaultPreferences();
  }
  if (raw === undefined) return defaultPreferences();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultPreferences();
  }

  if (!isValidPreferences(parsed)) return defaultPreferences();
  return { confirmCrossSectionMove: parsed.confirmCrossSectionMove };
}

export function writePreferences(preferences: Preferences): void {
  try {
    globalThis.localStorage?.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    );
  } catch {
    /* best effort — Preferences are non-critical device-local UI state */
  }
}

export function setConfirmCrossSectionMove(value: boolean): Preferences {
  const next = { ...readPreferences(), confirmCrossSectionMove: value };
  writePreferences(next);
  return next;
}

function isValidPreferences(value: unknown): value is Preferences {
  return (
    typeof value === "object" &&
    value !== null &&
    "confirmCrossSectionMove" in value &&
    typeof (value as { confirmCrossSectionMove: unknown })
      .confirmCrossSectionMove === "boolean"
  );
}
