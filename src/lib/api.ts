import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

// Inside the Android app the page is served from https://localhost, so a relative "/api/..." would
// hit the phone itself instead of PawFleet's server. Every call to our own API goes through apiUrl().
const SITE = 'https://www.pawfleetapp.com';

const isNative = (): boolean => { try { return Capacitor.isNativePlatform(); } catch { return false; } };

export function apiUrl(path: string): string {
  if (isNative()) return `${SITE}${path}`;
  try {
    const o = window.location.origin;
    // Local dev and file previews have no /api: use the live site.
    if (!/^https?:\/\/([a-z0-9-]+\.)*(pawfleetapp\.com|vercel\.app)$/i.test(o)) return `${SITE}${path}`;
  } catch { /* no window */ }
  return path;
}

/** Bearer header for the signed-in person, or an empty object. */
export async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** POST JSON to our own API with the login token attached. */
export async function apiPost(path: string, body: unknown, opts: { timeoutMs?: number } = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    return await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
