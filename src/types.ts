export type Milliseconds = number;

export interface StashOptions<T> {
  /** Time-to-live in milliseconds; must be > 0. */
  ttl: Milliseconds;
  /** Return stale value immediately and refresh in background. Default: true. */
  revalidate?: boolean;
  /** Function to compute and return the fresh value. */
  fetcher: () => Promise<T> | T;
}

export interface FetchOptions extends Omit<StashOptions<unknown>, "fetcher"> {
  /** Fetch init; only stable, serializable fields are fingerprinted for cache key. */
  init?: RequestInit;
  /** Optional parser to override response handling. */
  parser?: (res: Response) => Promise<unknown>;
}

export interface Entry<V = unknown> {
  v: 1; // Schema version.
  value: V;
  expires: Milliseconds;
  createdAt: Milliseconds;
}

export type Subscriber = (message: {
  type: "set" | "invalidate";
  key: string;
}) => void;

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
