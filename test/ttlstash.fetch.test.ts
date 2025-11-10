import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ttlstashFetch } from "../src";
import type { Mock } from "vitest";

/** Advance Fake Timers And Flush Microtasks. */
const flush = async () => {
  // Advance pending timers (including setTimeout(0) or any internal timers).
  await vi.advanceTimersByTimeAsync(0);
  // Flush microtasks queued by promises/json parsing.
  await Promise.resolve();
};

describe("ttlstashFetch", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caches JSON by URL+init", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    const first = await ttlstashFetch("/api", { ttl: 1000 });
    const second = await ttlstashFetch("/api", { ttl: 1000 });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to text", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("hello", { headers: { "content-type": "text/plain" } }),
    );

    const value = await ttlstashFetch("/t", { ttl: 1000 });

    expect(value).toEqual("hello");
  });

  it("revalidates after TTL", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ n: 1 }), {
        headers: { "content-type": "application/json" },
      }),
    );
    await ttlstashFetch("/n", { ttl: 50 });

    await vi.advanceTimersByTimeAsync(60);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ n: 2 }), {
        headers: { "content-type": "application/json" },
      }),
    );
    const stale = await ttlstashFetch("/n", { ttl: 50, revalidate: true });

    await flush();

    const refreshed = await ttlstashFetch("/n", { ttl: 50 });

    expect((stale as any).n).toBe(1);
    expect((refreshed as any).n).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
