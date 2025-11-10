<p align="center">
<a href="https://github.com/sashsinha/ttlstash"><img alt="ttlstash logo" src="https://raw.githubusercontent.com/sashsinha/ttlstash/main/logo.png"></a>
</p>

<h1 align="center">ttlstash</h1>

Tiny, framework-agnostic TTL cache for `localStorage` with a one-liner `fetch` cache helper. Ships zero dependencies, falls back to memory storage during SSR/private mode, and automatically keeps tabs in sync.

- **SWR by default.** Returns stale values instantly, refreshes in the background, and notifies every tab.
- **SSR-safe.** Seamlessly downgrades to an in-memory store when `window.localStorage` is unavailable or locked down.
- **TypeScript-first.** Full type coverage and ESM/CJS builds generated from a single TypeScript source.
- **1 KB min+gz.** Nothing but platform APIs.

## Installation

```sh
npm install ttlstash
# or
pnpm add ttlstash
yarn add ttlstash
# or
bun add ttlstash
```

## Usage

### Cache any async value

```ts
import ttlstash from "ttlstash";

const settings = await ttlstash("myapp/v1/settings", {
  ttl: 60 * 60 * 1000, // 1 hour
  fetcher: async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) throw new Error("Unable to load settings");
    return res.json();
  },
});

console.log(settings.theme); // Cached instantly on subsequent calls
```

### Cache network calls with `ttlstash.fetch`

```ts
import ttlstash, { ttlstashFetch } from "ttlstash";

const users = await ttlstashFetch("/api/users", {
  ttl: 5 * 60 * 1000,
  init: { headers: { Authorization: `Bearer ${token}` } },
  parser: (res) => res.json(), // optional; defaults to JSON-by-content-type or text
});

// Equivalent helper on the default export
const profile = await ttlstash.fetch("/api/profile", { ttl: 15 * 60 * 1000 });
```

### Manual invalidation & cross-tab subscriptions

```ts
import { invalidate, subscribe } from "ttlstash";

// React to writes from other tabs or background refreshes.
const unsubscribe = subscribe(({ type, key }) => {
  console.log(`[${type}]`, key);
});

invalidate("myapp/v1/settings"); // removes value locally and broadcasts

unsubscribe();
```

### SSR / Node usage

`ttlstash` detects when `window.localStorage` is unavailable (SSR, tests, Safari private mode, quota errors) and transparently switches to an isolated in-memory store. No guards are required:

```ts
import ttlstash from "ttlstash";

export async function loader() {
  return ttlstash("server/render/data", {
    ttl: 5 * 1000,
    fetcher: () => expensiveComputation(),
  });
}
```

## API Reference

| Function                           | Signature                                                                                                                | Notes                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttlstash`                         | `ttlstash<T>(key: string, options: { ttl: number; fetcher: () => T \| Promise<T>; revalidate?: boolean }) => Promise<T>` | Returns fresh value when available. If stale and `revalidate !== false`, returns the stale value immediately, refreshes in the background, and broadcasts updates. Throws if `ttl <= 0`.                                |
| `ttlstashFetch` / `ttlstash.fetch` | `(url: string, { ttl, init, revalidate, parser }: FetchOptions) => Promise<unknown>`                                     | Creates a stable cache key from `url` plus selected `fetch` init options. Automatically parses JSON responses based on the `content-type` header and falls back to text. Pass a custom `parser(res)` for blobs/streams. |
| `invalidate`                       | `(key: string) => void`                                                                                                  | Removes the key from storage, emits a local event, and sends a BroadcastChannel/storage event so other tabs refresh.                                                                                                    |
| `subscribe`                        | `(fn: (msg: { type: "set" \| "invalidate"; key: string }) => void) => () => void`                                        | Observe background refreshes or manual invalidations. Returns an unsubscribe function.                                                                                                                                  |
| `getMeta`                          | `(key: string) => { createdAt: number; expires: number; fresh: boolean } \| null`                                        | Read raw metadata without touching value freshness. Useful for debugging dashboards or heuristics.                                                                                                                      |

All helpers are also available via the default export:

```ts
import ttlstash from "ttlstash";

await ttlstash.fetch("/api/users", { ttl: 60_000 });
ttlstash.invalidate("custom/key");
```

## Best practices

- **Namespace keys.** Prefer versioned prefixes like `myapp/v2/...` so you can invalidate whole families by bumping the prefix.
- **Right-size TTLs.** Pick shorter TTLs for highly dynamic endpoints and longer ones for static payloads. Remember that `revalidate` returns stale data instantly, so you can often choose conservative TTLs without hurting UX.
- **Handle fetch errors.** If the background refresh fails, the stale value remains and the error is swallowed. Foreground calls propagate errors, so wrap `ttlstash` in your own retry/toast logic where needed.
- **Quota awareness.** Large payloads may hit `localStorage` limits. When a write fails, the library automatically falls back to an in-memory store for the current tab, so future reads/writes still work (they just stop persisting across reloads).

## Tooling & scripts

- `npm run lint` – `prettier --check .`
- `npm run format` – `prettier --write .`
- `npm run changeset` – capture a changelog entry (pick semver bump) for the next release.
- `npm run version-packages` – apply pending changesets, bump versions, and update `CHANGELOG.md`.
- `npm run release` – build and publish via Changesets (`changeset publish`).
- `npm run build` – Bundles `dist/` via `tsup`.
- `npm test` / `npm run test:watch` – Runs the Vitest suite in `jsdom`.
- `npm run prepublishOnly` – Ensures lint, build, and tests pass before publishing.

## CI & automation

- `.github/workflows/main.yml` – Runs lint/test/build on pushes and PRs against `main` using Node 18/20.
- `.github/workflows/publish.yml` – Uses Changesets to either open a release PR or publish to npm once changes land on `main` (requires `NPM_TOKEN` secret).

## Release checklist

1. `npm run format && npm run lint`
2. `npm test`
3. `npm run changeset` (document each releasable change)
4. `npm run version-packages` (updates versions + changelog)
5. `npm run release` (builds and publishes via `changeset publish`)

Happy caching!
