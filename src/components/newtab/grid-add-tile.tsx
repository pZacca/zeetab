"use client";

import { Plus } from "lucide-react";

type Props = {
  onClick: () => void;
};

export function GridAddTile({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add shortcut"
      className="group flex w-[96px] flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-800 p-2 text-zinc-500 outline-none transition hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="grid size-16 place-items-center rounded-lg bg-zinc-900 group-hover:bg-zinc-900/80">
        <Plus className="size-6" />
      </span>
      <span className="w-full text-center text-xs">Add</span>
    </button>
  );
}
