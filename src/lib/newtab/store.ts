import type { Config } from "./types";
import { readConfig, writeConfig, type WriteResult } from "./storage";
import { emptyConfig } from "./defaults";
import { STORAGE_KEY } from "./types";

export type Listener = () => void;

export type Store = {
  getSnapshot: () => Config;
  getServerSnapshot: () => null;
  subscribe: (l: Listener) => () => void;
  set: (updater: (prev: Config) => Config) => WriteResult;
  reload: () => void;
};

export function createStore(): Store {
  let snapshot: Config = safeRead();
  const listeners = new Set<Listener>();

  function notify(): void {
    for (const l of listeners) l();
  }

  function safeRead(): Config {
    try {
      return readConfig();
    } catch {
      return emptyConfig();
    }
  }

  return {
    getSnapshot: () => snapshot,
    // eslint-disable-next-line unicorn/no-null
    getServerSnapshot: () => null,
    subscribe: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    set: (updater) => {
      const next = updater(snapshot);
      if (next === snapshot) return { ok: true };
      snapshot = next;
      notify();
      return writeConfig(next);
    },
    reload: () => {
      snapshot = safeRead();
      notify();
    },
  };
}

export function attachStorageSync(store: Store): () => void {
  if (globalThis.window === undefined) return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) store.reload();
  };
  globalThis.addEventListener("storage", handler);
  return () => globalThis.removeEventListener("storage", handler);
}
