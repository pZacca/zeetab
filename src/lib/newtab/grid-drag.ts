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
