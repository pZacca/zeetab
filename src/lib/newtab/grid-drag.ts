// src/lib/newtab/grid-drag.ts
//
// Pure helpers bridging dnd-kit drag events to the `moveShortcut` domain
// transformation, for both within-Section reorder and cross-Section drops
// on the grid. No React, no dnd-kit imports — plain ids and Config in,
// an insertion target out.

import type { Config } from "./types";

/**
 * Resolves the insertion index for reordering `activeId` to land where
 * `overId` currently sits within the same ordered list of Shortcut ids.
 *
 * The returned index is post-detachment (matching `moveShortcut`'s
 * `MoveShortcutTarget.index` semantics): it's `overId`'s index in the
 * *original* `ids` list, which is exactly the slot `activeId` should
 * occupy once it's been removed from its current position.
 *
 * Returns `undefined` (a no-op — caller should skip the write) when:
 * - `activeId` and `overId` are the same (dropped back on itself), or
 * - either id isn't present in `ids`.
 */
export function reorderTargetIndex(
  ids: string[],
  activeId: string,
  overId: string
): number | undefined {
  if (activeId === overId) return undefined;

  const activeIndex = ids.indexOf(activeId);
  const overIndex = ids.indexOf(overId);
  if (activeIndex === -1 || overIndex === -1) return undefined;

  return overIndex;
}

/**
 * Resolves the insertion index for dropping a Shortcut into a *different*
 * Section than it started in, given the target Section's current Shortcut
 * ids (which never include the dragged Shortcut, since it lives elsewhere).
 *
 * When `overId` names one of the target's Shortcuts, the drop lands at that
 * Shortcut's index (matching `moveShortcut`'s pre-insert semantics). When
 * `overId` is anything else — the Section's own container id, its header,
 * an empty Section — the drop lands at the end, which for an empty Section
 * is simply index 0.
 */
export function crossSectionDropIndex(
  targetSectionIds: string[],
  overId: string
): number {
  const index = targetSectionIds.indexOf(overId);
  return index === -1 ? targetSectionIds.length : index;
}

/**
 * Locates a Shortcut's current Section and index within it.
 * `undefined` when the Shortcut id isn't present anywhere in `config`.
 */
export function findShortcutSection(
  config: Config,
  shortcutId: string
): { sectionId: string; index: number } | undefined {
  for (const section of config.sections) {
    const index = section.shortcuts.findIndex((s) => s.id === shortcutId);
    if (index !== -1) return { sectionId: section.id, index };
  }
  return undefined;
}

export type DropOverTarget = {
  /** The id of whatever dnd-kit reports as `over`: a Shortcut or a Section container. */
  id: string;
  /** The Section id owning `id`, when `id` names a Shortcut. */
  sectionId?: string;
};

/**
 * Resolves a dnd-kit drag event's `active`/`over` pair to an exact
 * `{ sectionId, index }` drop target against the live `config` — the
 * single seam grid components call to translate a dnd-kit event into a
 * `moveShortcut`-shaped target, for both within- and cross-Section drops.
 *
 * `undefined` means "no-op, skip this event": the active Shortcut is
 * unknown, `over` doesn't resolve to any Section, or (same-Section only)
 * the drop lands back where the Shortcut already is.
 */
export function resolveDropTarget(
  config: Config,
  activeId: string,
  over: DropOverTarget
): { sectionId: string; index: number } | undefined {
  const overSectionId = config.sections.some((s) => s.id === over.id)
    ? over.id
    : over.sectionId;
  if (!overSectionId) return undefined;

  const source = findShortcutSection(config, activeId);
  if (!source) return undefined;

  const targetSection = config.sections.find((s) => s.id === overSectionId);
  if (!targetSection) return undefined;
  const targetIds = targetSection.shortcuts.map((s) => s.id);

  if (overSectionId === source.sectionId) {
    const index = reorderTargetIndex(targetIds, activeId, over.id);
    return index === undefined ? undefined : { sectionId: overSectionId, index };
  }

  return {
    sectionId: overSectionId,
    index: crossSectionDropIndex(targetIds, over.id),
  };
}

const SECTION_HEADER_DROPPABLE_PREFIX = "section-header:";

/**
 * The dnd-kit droppable id for a collapsed Section's header — the spring-
 * loading target hovered before the Section expands. Distinct from the
 * Section's own container id so `resolveDropTarget` (and callers) can tell
 * "hovering the header" apart from "hovering the expanded content area".
 */
export function sectionHeaderDroppableId(sectionId: string): string {
  return `${SECTION_HEADER_DROPPABLE_PREFIX}${sectionId}`;
}

/**
 * Recovers the Section id from a header droppable id produced by
 * `sectionHeaderDroppableId`. `undefined` for any other id.
 */
export function sectionIdFromHeaderDroppableId(
  id: string
): string | undefined {
  return id.startsWith(SECTION_HEADER_DROPPABLE_PREFIX)
    ? id.slice(SECTION_HEADER_DROPPABLE_PREFIX.length)
    : undefined;
}
