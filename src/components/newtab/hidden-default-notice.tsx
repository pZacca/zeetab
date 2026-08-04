"use client";

import { useState } from "react";
import { useNewtab } from "./newtab-provider";

/**
 * Shown when the page would otherwise be completely empty: the default
 * Section is hidden by Preference and no named Sections exist. Explains
 * the emptiness is intentional (nothing is lost) and offers the two ways
 * out inline — re-enabling the default Section, or creating a named one.
 */
export function HiddenDefaultNotice() {
  const { actions } = useNewtab();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function createSection() {
    const trimmed = name.trim();
    if (!trimmed) return;
    actions.addSection(trimmed);
    setName("");
    setCreating(false);
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-sm border border-dashed border-border/60 px-6 py-8 text-center">
      <p className="font-ibm-plex-mono text-sm text-zinc-200">
        the default section is hidden
      </p>
      <p className="mt-2 font-ibm-plex-mono text-xs text-zinc-500">
        you turned it off in settings, so there&apos;s nothing to show here.
        your shortcuts are safe — show the default section to see them, or
        start a new section.
      </p>

      {creating ? (
        <form
          className="mt-6 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createSection();
          }}
        >
          <span className="font-ibm-plex-mono text-xs text-primary/70">$</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setCreating(false);
                setName("");
              }
            }}
            placeholder="add section"
            className="h-8 flex-1 rounded-none border-0 border-b border-border/60 bg-transparent px-1 font-ibm-plex-mono text-sm text-zinc-100 shadow-none focus-visible:border-primary/80 focus-visible:ring-0 focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="h-8 cursor-pointer rounded-sm border border-primary/40 bg-transparent px-3 font-ibm-plex-mono text-xs lowercase tracking-wide text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
          >
            add ↵
          </button>
        </form>
      ) : (
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => actions.setShowDefaultSection(true)}
            className="h-8 cursor-pointer rounded-sm border border-primary/40 bg-transparent px-3 font-ibm-plex-mono text-xs lowercase tracking-wide text-primary transition-colors hover:bg-primary/10"
          >
            show default section
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-8 cursor-pointer rounded-sm border border-border/60 bg-transparent px-3 font-ibm-plex-mono text-xs lowercase tracking-wide text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            new section
          </button>
        </div>
      )}
    </div>
  );
}
