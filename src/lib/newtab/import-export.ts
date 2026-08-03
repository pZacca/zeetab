import type { Config } from "./types";
import { CONFIG_VERSION } from "./types";
import { migrate } from "./migrations";
import { emptyConfig } from "./defaults";

export type ImportResult =
  | { ok: true; config: Config }
  | { ok: false; reason: string };

export function parseImport(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid JSON" };
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    typeof (parsed as { version: unknown }).version === "number" &&
    (parsed as { version: number }).version > CONFIG_VERSION
  ) {
    return { ok: false, reason: "config version is newer than supported" };
  }

  const migrated = migrate(parsed);
  const blank = emptyConfig();
  const migratedSame = JSON.stringify(migrated) === JSON.stringify(blank);
  const inputSame = JSON.stringify(parsed) === JSON.stringify(blank);
  // migrate() returns emptyConfig() both for invalid inputs AND for a valid emptyConfig.
  // Only reject if migrate fell back to blank AND the input itself wasn't already blank/valid.
  if (migratedSame && !inputSame) {
    return { ok: false, reason: "unrecognized config shape" };
  }
  return { ok: true, config: migrated };
}

export function serializeExport(config: Config): string {
  // eslint-disable-next-line unicorn/no-null
  return JSON.stringify(config, null, 2);
}

export function exportFilename(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `zacca-newtab-config-${iso}.json`;
}
