"use client";

import { useState } from "react";
import { ChevronDown, GripVertical, MoreVertical } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Section } from "@/lib/newtab/types";
import {
  sectionHeaderDroppableId,
  sectionSortableId,
} from "@/lib/newtab/grid-drag";
import { useNewtab } from "./newtab-provider";
import { GridTile } from "./grid-tile";
import { GridAddTile } from "./grid-add-tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

type Props = {
  section: Section;
  /**
   * True while the grid's drag session has this (collapsed) Section
   * spring-expanded for the current drag — transient, never persisted
   * unless the caller commits a drop into it. See drag-session.ts.
   */
  springExpanded: boolean;
  /**
   * True when there are fewer than two named Sections — the drag handle
   * still renders (grayed out) but can't start a drag.
   */
  sectionDragDisabled: boolean;
  onOpenTileDialog: (args: {
    sectionId: string;
    editingId?: string | undefined;
  }) => void;
};

export function GridSection({
  section,
  springExpanded,
  sectionDragDisabled,
  onOpenTileDialog,
}: Props) {
  const { state, actions } = useNewtab();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(section.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDefault = section.name === null;

  // Whole-Section drag: the Section itself is the sortable node (no ghost
  // overlay — the real thing follows the pointer), activated only from the
  // handle in the header. The default Section renders no header, so it
  // never participates.
  const {
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform: sortableTransform,
    transition: sortableTransition,
    isDragging: isSectionDragging,
  } = useSortable({
    id: sectionSortableId(section.id),
    data: { type: "section", sectionId: section.id },
    disabled: isDefault || sectionDragDisabled,
  });
  // Spring-loading: a collapsed Section renders its content anyway once a
  // dragged tile has hovered its header long enough. The persisted
  // `collapsed` flag itself never changes from this alone.
  const bodyVisible = !section.collapsed || springExpanded;

  const shortcutIds = section.shortcuts.map((s) => s.id);
  const { setNodeRef: setDroppableRef } = useDroppable({ id: section.id });
  const { setNodeRef: setHeaderDroppableRef } = useDroppable({
    id: sectionHeaderDroppableId(section.id),
    data: { sectionId: section.id },
  });

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== section.name)
      actions.renameSection(section.id, trimmed);
    setRenaming(false);
  }

  function cancelRename() {
    setRenaming(false);
    setDraft(section.name ?? "");
  }

  return (
    <section
      ref={setSortableRef}
      className="mb-10"
      style={{
        transform: CSS.Transform.toString(sortableTransform),
        transition: sortableTransition,
        // The dragged Section must paint above the siblings sliding around
        // it; its drag transform already makes it a stacking context.
        zIndex: isSectionDragging ? 40 : undefined,
      }}
    >
      {!isDefault && (
        <header
          ref={bodyVisible ? undefined : setHeaderDroppableRef}
          className="relative mb-3 flex items-center gap-2"
        >
          <button
            type="button"
            aria-label="Drag to reorder section"
            {...sortableAttributes}
            {...sortableListeners}
            disabled={sectionDragDisabled}
            className="absolute top-1/2 -left-7 grid size-6 -translate-y-1/2 cursor-grab touch-none place-items-center rounded text-zinc-600 transition-colors hover:text-zinc-200 active:cursor-grabbing disabled:cursor-default disabled:text-zinc-800 disabled:hover:text-zinc-800"
          >
            <GripVertical className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => actions.toggleSectionCollapse(section.id)}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
            aria-expanded={!section.collapsed}
            aria-label={section.collapsed ? "Expand section" : "Collapse section"}
          >
            <ChevronDown
              className={`size-4 transition-transform ${
                section.collapsed ? "-rotate-90" : ""
              }`}
            />
          </button>

          {renaming ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelRename();
              }}
              className="h-7 max-w-[240px]"
            />
          ) : (
            <h2
              className="font-ibm-plex-mono text-sm text-zinc-200"
              onDoubleClick={() => {
                setDraft(section.name ?? "");
                setRenaming(true);
              }}
            >
              {section.name}
            </h2>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Section actions"
                className="ml-auto grid size-6 place-items-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-border/40 bg-secondary"
            >
              <DropdownMenuItem
                className="font-ibm-plex-mono text-xs lowercase tracking-wide text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                onSelect={() => {
                  setDraft(section.name ?? "");
                  setRenaming(true);
                }}
              >
                rename
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem
                className="font-ibm-plex-mono text-xs lowercase tracking-wide text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                delete section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
      )}

      {bodyVisible && (
        <SortableContext items={shortcutIds} strategy={rectSortingStrategy}>
          <div
            ref={setDroppableRef}
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
              contentVisibility: "auto",
            }}
          >
            {section.shortcuts.map((s) => (
              <GridTile
                key={s.id}
                shortcut={s}
                sectionId={section.id}
                onEdit={(id) =>
                  onOpenTileDialog({ sectionId: section.id, editingId: id })
                }
              />
            ))}
            <GridAddTile
              onClick={() => onOpenTileDialog({ sectionId: section.id })}
            />
          </div>
        </SortableContext>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
              delete this section?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500">
              {state.preferences.showDefaultSection
                ? "shortcuts in this section will move to the default section."
                : "shortcuts in this section will move to the default section — which you have hidden, so they'll stay out of sight until you show it again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
              cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                actions.deleteSection(section.id);
                setConfirmDelete(false);
              }}
            >
              delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
