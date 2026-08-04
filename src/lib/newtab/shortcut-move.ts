// src/lib/newtab/shortcut-move.ts
//
// Pure Config transformations behind moving and reordering Shortcuts.
// No React, no storage — just Config in, Config out.

import type { Config, Shortcut } from "./types";

export type MoveShortcutTarget = {
  sectionId: string;
  /**
   * Insertion index within the target Section's shortcuts, evaluated
   * *after* the Shortcut has been detached from its origin Section
   * (detach-then-insert semantics). Omit to append at the end.
   */
  index?: number;
};

/**
 * Moves a Shortcut to a target Section at an exact index (or appends when
 * no index is given), reordering within a Section when the target is the
 * Shortcut's current Section.
 *
 * No-ops (returns `config` unchanged) when the Shortcut id or the target
 * Section id doesn't exist in `config`.
 */
export function moveShortcut(
  config: Config,
  shortcutId: string,
  to: MoveShortcutTarget
): Config {
  let moving: Shortcut | undefined;
  for (const section of config.sections) {
    const found = section.shortcuts.find((t) => t.id === shortcutId);
    if (found) {
      moving = found;
      break;
    }
  }
  if (!moving) return config;

  const targetExists = config.sections.some((s) => s.id === to.sectionId);
  if (!targetExists) return config;

  const movingShortcut: Shortcut = moving;

  const detached = config.sections.map((s) =>
    s.shortcuts.some((t) => t.id === shortcutId)
      ? { ...s, shortcuts: s.shortcuts.filter((t) => t.id !== shortcutId) }
      : s
  );

  return {
    ...config,
    sections: detached.map((s) => {
      if (s.id !== to.sectionId) return s;
      const insert = typeof to.index === "number" ? to.index : s.shortcuts.length;
      const next = [...s.shortcuts];
      next.splice(insert, 0, movingShortcut);
      return { ...s, shortcuts: next };
    }),
  };
}
