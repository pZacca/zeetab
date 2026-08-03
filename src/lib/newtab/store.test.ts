import { describe, expect, it, vi } from "vitest";
import { attachStorageSync, createStore } from "./store";
import { emptyConfig } from "./defaults";
import { STORAGE_KEY } from "./types";

describe("createStore", () => {
  it("getSnapshot returns current config", () => {
    const store = createStore();
    expect(store.getSnapshot()).toEqual(emptyConfig());
  });

  it("getServerSnapshot returns null", () => {
    const store = createStore();
    expect(store.getServerSnapshot()).toBeNull();
  });

  it("set() notifies subscribers", () => {
    const store = createStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.set((prev) => ({ ...prev, sections: [...prev.sections] }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    store.set((prev) => prev);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("set() persists to localStorage", () => {
    const store = createStore();
    const next = emptyConfig();
    next.sections[0].collapsed = true;
    store.set(() => next);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBe(JSON.stringify(next));
  });

  it("reload() re-reads from storage and notifies", () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const next = emptyConfig();
    next.sections.push({
      id: "s1",
      name: "extra",
      collapsed: false,
      shortcuts: [],
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    store.reload();
    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual(next);
  });
});

describe("attachStorageSync", () => {
  it("registers a 'storage' listener that calls reload on matching key", () => {
    const store = createStore();
    const reloadSpy = vi.spyOn(store, "reload");
    const addEventListener = globalThis.addEventListener as unknown as ReturnType<typeof vi.fn>;
    const removeEventListener = globalThis.removeEventListener as unknown as ReturnType<typeof vi.fn>;
    addEventListener.mockClear();
    removeEventListener.mockClear();

    const detach = attachStorageSync(store);

    expect(addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    const handler = addEventListener.mock.calls[0]?.[1] as (e: StorageEvent) => void;
    handler({ key: STORAGE_KEY } as StorageEvent);
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    handler({ key: "some.other.key" } as StorageEvent);
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    detach();
    expect(removeEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});
