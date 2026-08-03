import { beforeEach, vi } from "vitest";

type StoreMap = Map<string, string>;

const state = {
  store: new Map() as StoreMap,
  quotaExceeded: false,
};

function makeLocalStorage(): Storage {
  return {
    get length() {
      return state.store.size;
    },
    clear() {
      state.store.clear();
    },
    getItem(key) {
      // eslint-disable-next-line unicorn/no-null
      return state.store.has(key) ? state.store.get(key)! : null;
    },
    key(index) {
      // eslint-disable-next-line unicorn/no-null
      return [...state.store.keys()][index] ?? null;
    },
    removeItem(key) {
      state.store.delete(key);
    },
    setItem(key, value) {
      if (state.quotaExceeded) {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      }
      state.store.set(key, String(value));
    },
  };
}

beforeEach(() => {
  state.store.clear();
  state.quotaExceeded = false;
  const ls = makeLocalStorage();
  vi.stubGlobal("localStorage", ls);
  const addEventListenerMock = vi.fn();
  const removeEventListenerMock = vi.fn();
  vi.stubGlobal("window", {
    localStorage: ls,
    addEventListener: addEventListenerMock,
    removeEventListener: removeEventListenerMock,
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("addEventListener", addEventListenerMock);
  vi.stubGlobal("removeEventListener", removeEventListenerMock);
});

export function simulateQuotaExceeded(v = true) {
  state.quotaExceeded = v;
}

export function readMockStore(): StoreMap {
  return state.store;
}
