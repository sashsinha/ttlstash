import { describe, it, expect, vi } from "vitest";
import { getMeta } from "../src";
import * as storage from "../src/storage";

describe("SSR/in-memory fallback", () => {
  it("uses memory storage when localStorage fails", async () => {
    const spy = vi.spyOn(storage as any, "getStorage").mockImplementation(() => {
      return {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
        removeItem: () => {}
      };
    });

    const mod = await import("../src");
    await mod.default("k", { ttl: 1000, fetcher: () => 42 });
    const meta = getMeta("k");
    expect(meta?.fresh).toBe(true);

    spy.mockRestore();
  });
});
