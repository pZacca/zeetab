"use client";

import { startTransition, useState } from "react";
import { ChevronDown, MoreVertical } from "lucide-react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import type { Section } from "@/lib/newtab/types";
import { reorderTargetIndex } from "@/lib/newtab/grid-drag";
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
  onOpenTileDialog: (args: {
    sectionId: string;
    editingId?: string | undefined;
  }) => void;
};

export function GridSection({ section, onOpenTileDialog }: Props) {
  const { actions } = useNewtab();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(section.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDefault = section.name === null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Long-press activation: a quick tap still opens the Shortcut, and
    // ordinary swipes aren't hijacked into a drag. The drag surface itself
    // sets `touch-action: none` (see GridTile) so real touch devices match
    // this emulation instead of the browser starting its own scroll/pan
    // gesture before the delay elapses.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    })
  );
  const shortcutIds = section.shortcuts.map((s) => s.id);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    const target = reorderTargetIndex(shortcutIds, activeId, overId);
    if (target === undefined) return;
    startTransition(() =>
      actions.moveShortcut(activeId, { sectionId: section.id, index: target })
    );
  }

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
    <section className="mb-10">
      {!isDefault && (
        <header className="mb-3 flex items-center gap-2">
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

      {!section.collapsed && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={shortcutIds} strategy={rectSortingStrategy}>
            <div
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
        </DndContext>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
              delete this section?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500">
              shortcuts in this section will move to the default section.
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
