// src/lib/newtab/grid-drag.ts
//
// Pure helper bridging a dnd-kit drag-end event to the `moveShortcut`
// domain transformation for a within-Section reorder on the grid.
// No React, no dnd-kit imports — just ids in, an insertion index (or
// `undefined` for a no-op) out.

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
