import type { Config, Section } from "./types";
import { CONFIG_VERSION } from "./types";
import { isSection, migrate } from "./migrations";
import { emptyConfig } from "./defaults";

export type ImportResult =
  | { ok: true; config: Config }
  | { ok: false; reason: string };

export type SectionImportResult =
  | { ok: true; section: Section }
  | { ok: false; reason: string };

/** Name given to an imported Section whose own name was `null` (an exported
 *  default Section) — the Config's single nameless Section stays at index 0. */
export const IMPORTED_DEFAULT_SECTION_NAME = "Imported default";

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

export function parseSectionImport(raw: string): SectionImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid JSON" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "missing standalone section export envelope" };
  }

  const envelope = parsed as Record<string, unknown>;
  // A newer version is the most useful thing to report, whatever the shape.
  if (
    typeof envelope.version === "number" &&
    envelope.version > CONFIG_VERSION
  ) {
    return {
      ok: false,
      reason: "section export version is newer than supported",
    };
  }

  if ("sections" in envelope) {
    return {
      ok: false,
      reason: "expected a standalone section export, received a full config export",
    };
  }

  if (!("version" in envelope) || !("section" in envelope)) {
    return { ok: false, reason: "missing standalone section export envelope" };
  }

  if (envelope.version !== CONFIG_VERSION) {
    return {
      ok: false,
      reason: `unsupported section export version; expected ${CONFIG_VERSION}`,
    };
  }

  if (!isSection(envelope.section)) {
    return { ok: false, reason: "malformed section in export" };
  }

  return { ok: true, section: envelope.section };
}

export function serializeSectionExport(section: Section): string {
  // eslint-disable-next-line unicorn/no-null
  return JSON.stringify({ version: CONFIG_VERSION, section }, null, 2);
}

export function sectionExportFilename(
  section: Section,
  now: Date = new Date(),
): string {
  const slug =
    section.name === null
      ? "default"
      : section.name
          .trim()
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, "-")
          .replaceAll(/^-|-$/g, "") || "section";
  const iso = now.toISOString().slice(0, 10);
  return `zacca-newtab-section-${slug}-${iso}.json`;
}

export function appendImportedSection(
  config: Config,
  section: Section,
  createId: () => string,
): Config {
  const usedIds = new Set<string>();
  for (const existingSection of config.sections) {
    usedIds.add(existingSection.id);
    for (const shortcut of existingSection.shortcuts) {
      usedIds.add(shortcut.id);
    }
  }
  usedIds.add(section.id);
  for (const shortcut of section.shortcuts) {
    usedIds.add(shortcut.id);
  }

  const nextUniqueId = (): string => {
    let id: string;
    do {
      id = createId();
    } while (usedIds.has(id));
    usedIds.add(id);
    return id;
  };

  const imported: Section = {
    id: nextUniqueId(),
    name: section.name ?? IMPORTED_DEFAULT_SECTION_NAME,
    collapsed: section.collapsed,
    shortcuts: section.shortcuts.map((shortcut) => ({
      ...shortcut,
      id: nextUniqueId(),
      icon: { ...shortcut.icon },
    })),
  };

  return {
    ...config,
    sections: [...config.sections, imported],
  };
}

export function serializeExport(config: Config): string {
  // eslint-disable-next-line unicorn/no-null
  return JSON.stringify(config, null, 2);
}

export function exportFilename(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `zacca-newtab-config-${iso}.json`;
}
