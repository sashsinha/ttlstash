import type { Entry, FetchOptions, StashOptions } from "./types";
import { now, keyForUrl } from "./utils";
import { readJSON, writeJSON, remove } from "./storage";
import {
  notifyInvalidate,
  notifySet,
  subscribe as _subscribe,
} from "./broadcast";

const SCHEMA_VERSION = 1;

/**
 * Returns Cached Value If Fresh. If Stale And Revalidate=true, Returns Stale Immediately And Refreshes In Background.
 * If Nothing Cached, Resolves With fetcher() Result And Stores It With TTL.
 */
export async function ttlstash<T>(
  key: string,
  options: StashOptions<T>,
): Promise<T> {
  const { ttl, fetcher } = options;
  const revalidate = options.revalidate ?? true;
  if (!Number.isFinite(ttl) || ttl <= 0)
    throw new Error("ttl must be > 0 (ms)");
  if (typeof fetcher !== "function") throw new Error("fetcher is required");

  const entry = readJSON<Entry<T>>(key);
  const t = now();

  if (entry && entry.v === SCHEMA_VERSION && entry.expires > t) {
    // Fresh.
    return entry.value;
  }

  if (entry && revalidate) {
    // Return stale immediately and refresh in background.
    queueMicrotask(async () => {
      try {
        const value = await Promise.resolve(fetcher());
        const next: Entry<T> = {
          v: SCHEMA_VERSION,
          value,
          createdAt: now(),
          expires: now() + ttl,
        };
        writeJSON(key, next);
        notifySet(key);
      } catch {
        // Swallow errors in background refresh.
      }
    });
    return entry.value;
  }

  // Cold Or Strict Freshness.
  const value = await Promise.resolve(fetcher());
  const next: Entry<T> = {
    v: SCHEMA_VERSION,
    value,
    createdAt: now(),
    expires: now() + ttl,
  };
  writeJSON(key, next);
  notifySet(key);
  return value;
}

/** Helper Around fetch() That Caches By URL Plus Selected Init Fields. */
export async function ttlstashFetch(
  url: string,
  opts: FetchOptions,
): Promise<unknown> {
  const { ttl, init, revalidate = true, parser } = opts;
  const key = keyForUrl(url, init);
  return ttlstash(key, {
    ttl,
    revalidate,
    fetcher: async () => {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (parser) return parser(res);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return res.json();
      return res.text();
    },
  });
}

/** Manually Invalidate A Key Across Tabs. */
export function invalidate(key: string) {
  remove(key);
  notifyInvalidate(key);
}

/** Observe Cross-Tab Events. */
export const subscribe = _subscribe;

/** Utility For Reading Raw Metadata Without Touching TTL Logic. */
export function getMeta(key: string) {
  const e = readJSON<Entry>(key);
  if (!e) return null;
  return {
    createdAt: e.createdAt,
    expires: e.expires,
    fresh: e.expires > now(),
  };
}

/** Default Export With Helpers For JS Consumers. */
export default Object.assign(ttlstash, {
  fetch: ttlstashFetch,
  invalidate,
  subscribe,
  getMeta,
});
