/**
 * apiHelper.ts - Safe JSON parser and fetch utilities to prevent "Unexpected token '<', <!doctype..." errors
 */

export async function safeJson<T = any>(res: Response, fallback: T | null = null): Promise<T | null> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return fallback;
    }
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback: T | null = null
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(input, init);
    const data = await safeJson<T>(res, fallback);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: fallback };
  }
}
