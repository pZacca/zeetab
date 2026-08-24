"use client";

import { startTransition, useRef, useState } from "react";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Trash2, X } from "lucide-react";
import { useNewtab } from "./newtab-provider";
import {
  IMPORTED_DEFAULT_SECTION_NAME,
  parseImport,
  parseSectionImport,
} from "@/lib/newtab/import-export";
import { resolveSectionReorder } from "@/lib/newtab/grid-drag";
import type { Config, Section } from "@/lib/newtab/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { DEFAULT_SECTION_ID } from "@/lib/newtab/defaults";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsSheet({ open, onOpenChange }: Props) {
  const { state, actions } = useNewtab();
  const [newSectionName, setNewSectionName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  // Deleting a Section deletes its Shortcuts with it, so the row's trash
  // button asks first — same dialog the grid's dropdown shows.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | undefined>();
  const [pendingConfigImport, setPendingConfigImport] = useState<
    Config | undefined
  >();
  const [pendingSectionImport, setPendingSectionImport] = useState<
    Section | undefined
  >();
  const configFileRef = useRef<HTMLInputElement>(null);
  const sectionFileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const sortable = state.config.sections.filter(
    (s) => s.id !== DEFAULT_SECTION_ID
  );

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const ordered = resolveSectionReorder(
      state.config.sections.map((s) => s.id),
      String(e.active.id),
      String(e.over.id)
    );
    // Synchronous on purpose: a deferred commit paints one frame with the
    // row back in its old slot (see the grid's section dragEnd).
    if (ordered) actions.reorderSections(ordered);
  }

  function onConfigImportFile(file: File) {
    file
      .text()
      .then((text) => {
        const result = parseImport(text);
        if (result.ok) setPendingConfigImport(result.config);
        else toast.error(result.reason);
      })
      .catch(() => toast.error("Failed to read file"));
  }

  function onSectionImportFile(file: File) {
    file
      .text()
      .then((text) => {
        const result = parseSectionImport(text);
        if (result.ok) setPendingSectionImport(result.section);
        else toast.error(result.reason);
      })
      .catch(() => toast.error("Failed to read file"));
  }

  function confirmConfigImport() {
    if (!pendingConfigImport) return;
    const snapshot = pendingConfigImport;
    startTransition(() => {
      actions.replaceConfig(snapshot);
      toast.success("Config imported");
    });
    setPendingConfigImport(undefined);
  }

  function confirmSectionImport() {
    if (!pendingSectionImport) return;
    const snapshot = pendingSectionImport;
    startTransition(() => {
      actions.importSection(snapshot);
      toast.success("Section imported");
    });
    setPendingSectionImport(undefined);
  }

  const configImportSummary = pendingConfigImport
    ? {
        sections: pendingConfigImport.sections.length,
        shortcuts: pendingConfigImport.sections.reduce(
          (n, s) => n + s.shortcuts.length,
          0
        ),
      }
    : undefined;

  const labelClass =
    "font-ibm-plex-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600";
  const inputClass =
    "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-1 font-ibm-plex-mono text-sm text-zinc-100 shadow-none focus-visible:border-primary/80 focus-visible:ring-0 focus-visible:outline-none";
  const cliButton =
    "h-8 cursor-pointer whitespace-nowrap rounded-sm border border-primary/40 bg-transparent px-3 font-ibm-plex-mono text-xs lowercase tracking-wide text-primary outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:border-primary/80 disabled:opacity-40";
  const cliButtonNeutral =
    "h-8 cursor-pointer whitespace-nowrap rounded-sm border border-border/60 bg-transparent px-3 font-ibm-plex-mono text-xs lowercase tracking-wide text-zinc-300 outline-none transition-colors hover:border-zinc-500 hover:text-zinc-100 focus-visible:border-zinc-400 focus-visible:text-zinc-100";
  const cliButtonDanger =
    "h-8 cursor-pointer whitespace-nowrap rounded-sm border border-destructive/40 bg-transparent px-3 font-ibm-plex-mono text-xs lowercase tracking-wide text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:border-destructive";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 border-l border-border/40 bg-secondary p-0 sm:max-w-sm"
      >
        <SheetHeader className="relative gap-1 border-b border-border/40 px-5 py-3">
          <SheetTitle className="font-ibm-plex-mono text-sm font-medium text-primary">
            <span className="text-zinc-600">~/</span>settings
          </SheetTitle>
          <SheetDescription className="font-ibm-plex-mono text-[11px] text-zinc-500">
            sections · import / export · reset
          </SheetDescription>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => onOpenChange(false)}
            className="absolute top-2.5 right-3 grid size-6 cursor-pointer place-items-center rounded-sm text-zinc-600 outline-none transition-colors hover:text-zinc-100 focus-visible:text-zinc-100"
          >
            <X className="size-4" />
          </button>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <section className="grid gap-2 border-b border-border/40 px-5 py-4">
            <h3 className={labelClass}>{"// sections"}</h3>

            {sortable.length === 0 ? (
              <p className="font-ibm-plex-mono text-[11px] text-zinc-600">
                no custom sections yet
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={sortable.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col">
                    {sortable.map((s) => (
                      <SectionRow
                        key={s.id}
                        id={s.id}
                        name={s.name ?? ""}
                        onRename={(n) => actions.renameSection(s.id, n)}
                        onDelete={() => setConfirmDeleteId(s.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            <form
              className="mt-1 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = newSectionName.trim();
                if (!n) return;
                actions.addSection(n);
                setNewSectionName("");
              }}
            >
              <span className="font-ibm-plex-mono text-xs text-primary/70">$</span>
              <input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="add section"
                className={`${inputClass} flex-1`}
              />
              <button
                type="submit"
                className={cliButton}
                disabled={!newSectionName.trim()}
              >
                add ↵
              </button>
            </form>
          </section>

          <section className="grid gap-3 border-b border-border/40 px-5 py-4">
            <h3 className={labelClass}>{"// import · export"}</h3>

            <div className="grid gap-1">
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-12 shrink-0 items-center font-ibm-plex-mono text-[10px] text-zinc-600">
                  config
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label="Export Config"
                    className={cliButton}
                    onClick={() => actions.exportConfig()}
                  >
                    export
                  </button>
                  <button
                    type="button"
                    aria-label="Import Config"
                    className={cliButtonNeutral}
                    onClick={() => configFileRef.current?.click()}
                  >
                    import
                  </button>
                  <input
                    ref={configFileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onConfigImportFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <p className="pl-14 font-ibm-plex-mono text-[10px] text-zinc-600">
                JSON · zacca-newtab-config-YYYY-MM-DD.json
              </p>
            </div>

            <div className="grid gap-1">
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-12 shrink-0 items-center font-ibm-plex-mono text-[10px] text-zinc-600">
                  section
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Choose a Section to export"
                        className={`${cliButton} inline-flex items-center gap-2`}
                      >
                        export section
                        <ChevronDown aria-hidden="true" className="size-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      aria-label="Sections to export"
                      className="max-w-72 border-border/40 bg-secondary shadow-none"
                    >
                      {state.config.sections.map((section) => {
                        const sectionName = section.name ?? "default";
                        return (
                          <DropdownMenuItem
                            key={section.id}
                            aria-label={`Export ${sectionName} Section`}
                            className="font-ibm-plex-mono text-xs lowercase tracking-wide text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                            onSelect={() => actions.exportSection(section.id)}
                          >
                            <span className="truncate">{sectionName}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    type="button"
                    aria-label="Import Section"
                    className={cliButtonNeutral}
                    onClick={() => sectionFileRef.current?.click()}
                  >
                    import section
                  </button>
                  <input
                    ref={sectionFileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onSectionImportFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <p className="pl-14 font-ibm-plex-mono text-[10px] text-zinc-600">
                {"JSON · zacca-newtab-section-<slug>-YYYY-MM-DD.json"}
              </p>
            </div>
          </section>

          <section className="grid gap-2 border-b border-border/40 px-5 py-4">
            <h3 className={labelClass}>{"// preferences"}</h3>
            <label className="flex items-center gap-2 font-ibm-plex-mono text-xs text-zinc-400">
              <Checkbox
                checked={state.preferences.confirmCrossSectionMove}
                onCheckedChange={(checked) =>
                  actions.setConfirmCrossSectionMove(checked === true)
                }
              />
              ask before moving a shortcut to another section
            </label>
            <label className="flex items-center gap-2 font-ibm-plex-mono text-xs text-zinc-400">
              <Checkbox
                checked={state.preferences.showDefaultSection}
                onCheckedChange={(checked) =>
                  actions.setShowDefaultSection(checked === true)
                }
              />
              show the default section
            </label>
          </section>
        </div>

        <div className="mt-auto px-5 py-4">
          <h3 className={`${labelClass} mb-2 text-destructive/70`}>{"// danger"}</h3>
          <button
            type="button"
            className={cliButtonDanger}
            onClick={() => setConfirmReset(true)}
          >
            reset everything
          </button>
        </div>

        <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
          <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
                reset everything?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-zinc-500">
                all sections and shortcuts will be removed. this cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  actions.reset();
                  setConfirmReset(false);
                  toast.success("Config reset");
                }}
              >
                reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={confirmDeleteId !== undefined}
          onOpenChange={(o) => !o && setConfirmDeleteId(undefined)}
        >
          <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
                delete this section?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-zinc-500">
                shortcuts in this section will be deleted too. this cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  if (confirmDeleteId) actions.deleteSection(confirmDeleteId);
                  setConfirmDeleteId(undefined);
                }}
              >
                delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={pendingConfigImport !== undefined}
          onOpenChange={(open) =>
            !open && setPendingConfigImport(undefined)
          }
        >
          <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
                replace current config?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-zinc-500">
                {configImportSummary
                  ? `importing ${configImportSummary.sections} section${configImportSummary.sections === 1 ? "" : "s"} and ${configImportSummary.shortcuts} shortcut${configImportSummary.shortcuts === 1 ? "" : "s"}. this will overwrite your current config.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmConfigImport}>
                replace
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={pendingSectionImport !== undefined}
          onOpenChange={(open) =>
            !open && setPendingSectionImport(undefined)
          }
        >
          <AlertDialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
                import “{pendingSectionImport?.name ?? IMPORTED_DEFAULT_SECTION_NAME}”?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-zinc-500">
                {pendingSectionImport
                  ? `importing section “${pendingSectionImport.name ?? IMPORTED_DEFAULT_SECTION_NAME}” with ${pendingSectionImport.shortcuts.length} shortcut${pendingSectionImport.shortcuts.length === 1 ? "" : "s"}. your current configuration remains unchanged; the imported section will be added after your existing sections.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="border-border/60 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
                cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmSectionImport}>
                import section
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

function SectionRow({
  id,
  name,
  onRename,
  onDelete,
}: {
  id: string;
  name: string;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [value, setValue] = useState(name);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1.5 border-b border-border/30 py-1 last:border-b-0"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        className="cursor-grab text-zinc-700 transition-colors hover:text-zinc-300"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="font-ibm-plex-mono text-xs text-primary/60">›</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value.trim() && value !== name && onRename(value.trim())}
        className="h-7 flex-1 rounded-none border-0 bg-transparent px-0 font-ibm-plex-mono text-xs text-zinc-200 shadow-none outline-none focus-visible:text-primary"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete section"
        className="grid size-6 cursor-pointer place-items-center rounded-sm text-zinc-700 opacity-0 transition-all hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
