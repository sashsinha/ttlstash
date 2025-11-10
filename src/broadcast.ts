import type { Subscriber } from "./types";
import { isBrowser } from "./utils";

let subs = new Set<Subscriber>();

/** Subscribe To Cross-Tab Notifications. Returns An Unsubscribe Function. */
export function subscribe(fn: Subscriber): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

function emit(msg: { type: "set" | "invalidate"; key: string }) {
  subs.forEach((s) => {
    try {
      s(msg);
    } catch {
      /* Noop. */
    }
  });
}

let bc: BroadcastChannel | null = null;

// Try BroadcastChannel For Reliability; Fallback To Window.storage Event.
(function init() {
  if (!isBrowser()) return;
  try {
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel("ttlstash");
      bc.onmessage = (e) => {
        const data = e?.data;
        if (
          data &&
          typeof data === "object" &&
          "type" in data &&
          "key" in data
        ) {
          emit(data);
        }
      };
    }
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      if (e.key.startsWith("ttlstash::") || e.key.startsWith("ttlstash/")) {
        emit({ type: "set", key: e.key });
      }
    });
  } catch {
    // Ignore.
  }
})();

export function notifySet(key: string) {
  emit({ type: "set", key });
  try {
    bc?.postMessage({ type: "set", key });
  } catch {
    /* Ignore. */
  }
}

export function notifyInvalidate(key: string) {
  emit({ type: "invalidate", key });
  try {
    bc?.postMessage({ type: "invalidate", key });
  } catch {
    /* Ignore. */
  }
}
