"use client";

import { memo, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Shortcut } from "@/lib/newtab/types";
import { Favicon } from "./favicon";
import { tileMenuItems } from "./tile-menu-items";
import { useNewtab } from "./newtab-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type Props = {
  shortcut: Shortcut;
  sectionId: string;
  onEdit: (id: string) => void;
};

function GridTileBase({ shortcut, sectionId, onEdit }: Props) {
  const { state, actions } = useNewtab();
  const [open, setOpen] = useState(false);
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id: shortcut.id });
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    // The drag surface must opt out of native touch scrolling itself so a
    // long-press can pick up the tile on real touch devices; the grid
    // background outside tiles is left alone, so ordinary swipes still
    // scroll the page.
    touchAction: "none" as const,
  };

  const commonActions = {
    onEdit: () => onEdit(shortcut.id),
    onDelete: () => actions.deleteShortcut(shortcut.id),
    onMoveTo: (targetId: string) =>
      actions.moveShortcut(shortcut.id, { sectionId: targetId }),
  };

  const itemBase =
    "font-ibm-plex-mono text-xs lowercase tracking-wide text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100";
  const destClass =
    "font-ibm-plex-mono text-xs lowercase tracking-wide text-destructive focus:bg-destructive/10 focus:text-destructive";

  const dropdownComponents = {
    Item: ({
      onSelect,
      destructive,
      children,
    }: {
      onSelect: () => void;
      destructive?: boolean;
      children: ReactNode;
    }) => (
      <DropdownMenuItem
        onSelect={onSelect}
        className={destructive ? destClass : itemBase}
      >
        {children}
      </DropdownMenuItem>
    ),
    Separator: () => <DropdownMenuSeparator className="bg-border/40" />,
    Sub: ({
      label,
      children,
    }: {
      label: string;
      children: ReactNode;
    }) => (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={itemBase}>
          {label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="border-border/40 bg-secondary">
          {children}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ),
  };

  const contextComponents = {
    Item: ({
      onSelect,
      destructive,
      children,
    }: {
      onSelect: () => void;
      destructive?: boolean;
      children: ReactNode;
    }) => (
      <ContextMenuItem
        onSelect={onSelect}
        className={destructive ? destClass : itemBase}
      >
        {children}
      </ContextMenuItem>
    ),
    Separator: () => <ContextMenuSeparator className="bg-border/40" />,
    Sub: ({
      label,
      children,
    }: {
      label: string;
      children: ReactNode;
    }) => (
      <ContextMenuSub>
        <ContextMenuSubTrigger className={itemBase}>
          {label}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="border-border/40 bg-secondary">
          {children}
        </ContextMenuSubContent>
      </ContextMenuSub>
    ),
  };

  const visibleLabel =
    shortcut.label || safeHostname(shortcut.url);

  const tile = (
    <a
      ref={setNodeRef}
      href={shortcut.url}
      aria-label={visibleLabel}
      style={dragStyle}
      {...listeners}
      className="group relative flex w-[96px] flex-col items-center gap-2 rounded-lg p-2 outline-none hover:bg-zinc-900/60 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Favicon
        key={shortcut.url}
        icon={shortcut.icon}
        url={shortcut.url}
        label={shortcut.label}
        size={64}
      />
      <span className="line-clamp-1 w-full text-center text-xs text-zinc-100">
        {visibleLabel}
      </span>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="absolute top-1 right-1 grid size-6 place-items-center rounded-md text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-800 group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-border/40 bg-secondary"
          onClick={(e) => e.stopPropagation()}
        >
          {tileMenuItems({
            shortcut,
            sections: state.config.sections,
            currentSectionId: sectionId,
            actions: commonActions,
            components: dropdownComponents,
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </a>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{tile}</ContextMenuTrigger>
      <ContextMenuContent className="border-border/40 bg-secondary">
        {tileMenuItems({
          shortcut,
          sections: state.config.sections,
          currentSectionId: sectionId,
          actions: commonActions,
          components: contextComponents,
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const GridTile = memo(GridTileBase);
