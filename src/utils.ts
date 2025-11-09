export const now = () => Date.now();

export const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

export function safeJSONParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function stableStringifyInit(init?: RequestInit): string {
  if (!init) return "";
  // Only include stable primitives likely to affect result identity.
  const { method, headers, body, mode, credentials, cache, redirect, referrer, referrerPolicy } =
    init;
  let headersObj: Record<string, string> | undefined = undefined;
  if (headers && typeof Headers !== "undefined" && headers instanceof Headers) {
    headersObj = {};
    headers.forEach((v, k) => (headersObj![k] = v));
  } else if (headers && typeof headers === "object") {
    headersObj = headers as Record<string, string>;
  }
  // For body, only include string or length fingerprints to avoid huge keys.
  const bodyFP =
    typeof body === "string"
      ? `str:${body.length}`
      : body instanceof URLSearchParams
        ? `usp:${body.toString().length}`
        : body
          ? "binary"
          : "";

  return JSON.stringify({
    method,
    headers: headersObj,
    body: bodyFP,
    mode,
    credentials,
    cache,
    redirect,
    referrer,
    referrerPolicy
  });
}

export function keyForUrl(url: string, init?: RequestInit) {
  return `ttlstash::${url}::${stableStringifyInit(init)}`;
}
