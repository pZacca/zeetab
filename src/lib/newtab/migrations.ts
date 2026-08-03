import type { Config, IconSource, Section, Shortcut } from "./types";
import { CONFIG_VERSION } from "./types";
import { emptyConfig, DEFAULT_SECTION_ID } from "./defaults";

function isIconSource(value: unknown): value is IconSource {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.kind === "auto") return true;
  if (v.kind === "upload") return typeof v.dataUrl === "string";
  return false;
}

function isShortcut(value: unknown): value is Shortcut {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.url === "string" &&
    typeof v.label === "string" &&
    isIconSource(v.icon)
  );
}

function isSection(value: unknown): value is Section {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    (typeof v.name === "string" || v.name === null) &&
    typeof v.collapsed === "boolean" &&
    Array.isArray(v.shortcuts) &&
    v.shortcuts.every((x) => isShortcut(x))
  );
}

function isConfig(value: unknown): value is Config {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== CONFIG_VERSION) return false;
  if (!Array.isArray(v.sections) || v.sections.length === 0) return false;
  if (!v.sections.every((x) => isSection(x))) return false;
  const first = v.sections[0] as Section;
  return first.id === DEFAULT_SECTION_ID && first.name === null;
}

export function migrate(raw: unknown): Config {
  if (!isConfig(raw)) return emptyConfig();
  return raw;
}
