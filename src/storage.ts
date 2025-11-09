import type { StorageLike } from "./types";
import { isBrowser, safeJSONParse } from "./utils";

/** In-Memory Fallback For SSR, Private Mode, Or Quota Issues. */
class MemoryStorage implements StorageLike {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

let chosen: StorageLike | null = null;

function detect(): StorageLike {
  if (chosen) return chosen;
  if (isBrowser()) {
    try {
      const ls = window.localStorage;
      const probeKey = "__ttlstash_probe__";
      ls.setItem(probeKey, "1");
      ls.removeItem(probeKey);
      chosen = ls;
      return chosen;
    } catch {
      // Fall through to memory storage.
    }
  }
  chosen = new MemoryStorage();
  return chosen;
}

export function getStorage(): StorageLike {
  return detect();
}

/** Read And Parse; Returns Null On Missing Or Invalid JSON. */
export function readJSON<T>(key: string): T | null {
  const raw = getStorage().getItem(key);
  return safeJSONParse<T>(raw);
}

export function writeJSON(key: string, obj: unknown): void {
  const s = JSON.stringify(obj);
  try {
    getStorage().setItem(key, s);
  } catch {
    // Quota Or Safari Private Mode; Downgrade To Memory For This Process Only.
    chosen = new MemoryStorage();
    chosen.setItem(key, s);
  }
}

export function remove(key: string): void {
  try {
    getStorage().removeItem(key);
  } catch {
    /* Ignore. */
  }
}
