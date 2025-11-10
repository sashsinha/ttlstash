import { describe, it, expect, vi, beforeEach } from "vitest";
import ttlstash, { getMeta, invalidate } from "../src";

describe("ttlstash basic", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it("stores and returns fresh value", async () => {
    const val = await ttlstash("prefs", {
      ttl: 1000,
      fetcher: async () => ({ a: 1 }),
    });
    expect(val).toEqual({ a: 1 });
    const meta = getMeta("prefs");
    expect(meta?.fresh).toBe(true);
  });

  it("returns stale immediately and revalidates in background", async () => {
    let i = 0;
    await ttlstash("k", { ttl: 100, fetcher: () => Promise.resolve(++i) });
    vi.advanceTimersByTime(150);
    const v1 = await ttlstash("k", {
      ttl: 100,
      revalidate: true,
      fetcher: () => Promise.resolve(++i),
    });
    expect(v1).toBe(1);
    await Promise.resolve();
    vi.advanceTimersByTime(0);
    const v2 = await ttlstash("k", {
      ttl: 100,
      fetcher: () => Promise.resolve(++i),
    });
    expect(v2).toBe(2);
  });

  it("strict freshness when revalidate=false", async () => {
    let i = 0;
    await ttlstash("k2", { ttl: 50, fetcher: () => ++i });
    vi.advanceTimersByTime(60);
    const v = await ttlstash("k2", {
      ttl: 50,
      revalidate: false,
      fetcher: () => ++i,
    });
    expect(v).toBe(2);
  });

  it("manual invalidate clears entry", async () => {
    await ttlstash("x", { ttl: 1000, fetcher: () => "v" });
    invalidate("x");
    const again = await ttlstash("x", { ttl: 1000, fetcher: () => "nv" });
    expect(again).toBe("nv");
  });
});
