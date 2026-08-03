import type { Config } from "./types";
import { STORAGE_KEY, STORAGE_KEY_PREFIX_CORRUPTED } from "./types";
import { migrate } from "./migrations";
import { emptyConfig } from "./defaults";

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "quota" | "unavailable" };

export function readConfig(): Config {
  let raw: string | undefined;
  try {
    raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return emptyConfig();
  }
  if (raw === undefined) return emptyConfig();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    backupCorrupted(raw);
    return emptyConfig();
  }

  const migrated = migrate(parsed);
  if (!isSameConfig(parsed, migrated)) {
    backupCorrupted(raw);
  }
  return migrated;
}

export function writeConfig(config: Config): WriteResult {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(config));
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "unavailable" };
  }
}

const MAX_CORRUPTED_BACKUPS = 3;

function backupCorrupted(raw: string): void {
  const ls = globalThis.localStorage;
  if (!ls) return;
  try {
    const key = `${STORAGE_KEY_PREFIX_CORRUPTED}${Date.now()}`;
    ls.setItem(key, raw);
    pruneCorruptedBackups(ls, MAX_CORRUPTED_BACKUPS);
  } catch {
    /* best effort */
  }
}

function pruneCorruptedBackups(ls: Storage, keep: number): void {
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i += 1) {
    const k = ls.key(i);
    if (k && k.startsWith(STORAGE_KEY_PREFIX_CORRUPTED)) keys.push(k);
  }
  if (keys.length <= keep) return;
  // Timestamp suffix is fixed-width for current dates; lexicographic == chronological.
  keys.sort();
  for (const k of keys.slice(0, keys.length - keep)) {
    try {
      ls.removeItem(k);
    } catch {
      /* best effort */
    }
  }
}

function isSameConfig(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
