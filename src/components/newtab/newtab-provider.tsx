"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  use,
  type ReactNode,
} from "react";
import type { Config, Shortcut } from "@/lib/newtab/types";
import { DEFAULT_SECTION_ID, emptyConfig } from "@/lib/newtab/defaults";
import { createStore, attachStorageSync } from "@/lib/newtab/store";
import {
  serializeExport,
  exportFilename,
} from "@/lib/newtab/import-export";
import { moveShortcut as moveShortcutInConfig } from "@/lib/newtab/shortcut-move";
import {
  readPreferences,
  setConfirmCrossSectionMove as setConfirmCrossSectionMoveInStorage,
  type Preferences,
} from "@/lib/newtab/preferences";

export type Actions = {
  addShortcut: (sectionId: string, data: Omit<Shortcut, "id">) => void;
  updateShortcut: (id: string, patch: Partial<Omit<Shortcut, "id">>) => void;
  deleteShortcut: (id: string) => void;
  moveShortcut: (
    id: string,
    to: { sectionId: string; index?: number }
  ) => void;

  addSection: (name: string) => string;
  renameSection: (id: string, name: string) => void;
  toggleSectionCollapse: (id: string) => void;
  deleteSection: (id: string) => void;
  reorderSections: (orderedIds: string[]) => void;

  replaceConfig: (config: Config) => void;
  exportConfig: () => void;
  reset: () => void;

  setConfirmCrossSectionMove: (value: boolean) => void;
};

export type Meta = {
  version: 1;
  storageUnavailable: boolean;
  quotaExceeded: boolean;
};

type ContextValue = {
  state: { config: Config; preferences: Preferences };
  actions: Actions;
  meta: Meta;
};

// eslint-disable-next-line unicorn/no-null
const NewtabContext = createContext<ContextValue | null>(null);

export function useNewtab(): ContextValue {
  const ctx = use(NewtabContext);
  if (!ctx) throw new Error("useNewtab must be used within NewtabProvider");
  return ctx;
}

export function NewtabProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createStore);

  const config =
    useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getServerSnapshot
    ) ?? emptyConfig();

  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  // Device-local, outside the Config: its own storage key, no migration, no
  // cross-tab store — just lazy-init from storage plus a setter that writes
  // through and updates local state so the modal and settings sheet render
  // the same value.
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);

  useEffect(() => attachStorageSync(store), [store]);

  const applyWrite = useCallback(
    (updater: (prev: Config) => Config) => {
      const result = store.set(updater);
      if (result.ok) {
        setQuotaExceeded(false);
      } else {
        if (result.reason === "quota") setQuotaExceeded(true);
        if (result.reason === "unavailable") setStorageUnavailable(true);
      }
    },
    [store]
  );

  const actions = useMemo<Actions>(
    () => ({
      addShortcut: (sectionId, data) =>
        applyWrite((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  shortcuts: [
                    ...s.shortcuts,
                    { id: crypto.randomUUID(), ...data },
                  ],
                }
              : s
          ),
        })),

      updateShortcut: (id, patch) =>
        applyWrite((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            shortcuts: s.shortcuts.map((t) =>
              t.id === id ? { ...t, ...patch } : t
            ),
          })),
        })),

      deleteShortcut: (id) =>
        applyWrite((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            shortcuts: s.shortcuts.filter((t) => t.id !== id),
          })),
        })),

      moveShortcut: (id, to) =>
        applyWrite((prev) => moveShortcutInConfig(prev, id, to)),

      addSection: (name) => {
        const id = crypto.randomUUID();
        applyWrite((prev) => ({
          ...prev,
          sections: [
            ...prev.sections,
            { id, name, collapsed: false, shortcuts: [] },
          ],
        }));
        return id;
      },

      renameSection: (id, name) =>
        applyWrite((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === id && s.name !== null ? { ...s, name } : s
          ),
        })),

      toggleSectionCollapse: (id) =>
        applyWrite((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === id ? { ...s, collapsed: !s.collapsed } : s
          ),
        })),

      deleteSection: (id) =>
        applyWrite((prev) => {
          if (id === DEFAULT_SECTION_ID) return prev;
          const victim = prev.sections.find((s) => s.id === id);
          if (!victim) return prev;
          return {
            ...prev,
            sections: prev.sections
              .map((s) =>
                s.id === DEFAULT_SECTION_ID
                  ? {
                      ...s,
                      shortcuts: [...s.shortcuts, ...victim.shortcuts],
                    }
                  : s
              )
              .filter((s) => s.id !== id),
          };
        }),

      reorderSections: (orderedIds) =>
        applyWrite((prev) => {
          const byId = new Map(prev.sections.map((s) => [s.id, s]));
          const def = byId.get(DEFAULT_SECTION_ID);
          if (!def) return prev;
          const rest = orderedIds
            .filter((id) => id !== DEFAULT_SECTION_ID)
            .map((id) => byId.get(id))
            .filter(
              (s): s is Config["sections"][number] => s !== undefined
            );
          const presentIds = new Set([
            DEFAULT_SECTION_ID,
            ...rest.map((s) => s.id),
          ]);
          const missing = prev.sections.filter((s) => !presentIds.has(s.id));
          return { ...prev, sections: [def, ...rest, ...missing] };
        }),

      replaceConfig: (next) => {
        applyWrite(() => next);
      },

      exportConfig: () => {
        const blob = new Blob([serializeExport(config)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportFilename();
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },

      reset: () => applyWrite(() => emptyConfig()),

      setConfirmCrossSectionMove: (value) =>
        setPreferences(setConfirmCrossSectionMoveInStorage(value)),
    }),
    [applyWrite, config]
  );

  const value = useMemo<ContextValue>(
    () => ({
      state: { config, preferences },
      actions,
      meta: { version: 1, storageUnavailable, quotaExceeded },
    }),
    [config, preferences, actions, storageUnavailable, quotaExceeded]
  );

  return (
    <NewtabContext.Provider value={value}>{children}</NewtabContext.Provider>
  );
}
