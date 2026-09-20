import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqoordnjsigllzjzkqxb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxb29yZG5qc2lnbGx6anprcXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDYxOTcsImV4cCI6MjEwMDM4MjE5N30.DypPuG561fF_kJcUC83P2XNIZXrLO48-EPs_O_f7V5M';

/**
 * Some phones and networks cannot reach *.supabase.co directly (blocked or unstable mobile data).
 * Every database, login and storage request goes through this wrapper: it tries the normal address first
 * and, if the network fails or stalls, retries through PawFleet's own address (`/sb/...`, forwarded to
 * Supabase by the website). Once that works it keeps using it for a while so the app stays quick.
 * Live updates (websockets) cannot be forwarded and still go direct.
 */
const PROXY_BASE = (() => {
  try {
    const o = window.location.origin;
    if (/^https?:\/\/([a-z0-9-]+\.)*(pawfleetapp\.com|vercel\.app)$/i.test(o)) return `${o}/sb`;
  } catch { /* no window */ }
  return 'https://www.pawfleetapp.com/sb'; // the Android app and local testing
})();

const PROXY_KEY = 'pawfleet_use_proxy_until';
const PROXY_MS = 15 * 60 * 1000;

const proxyPreferred = (): boolean => {
  try { return Number(sessionStorage.getItem(PROXY_KEY) || 0) > Date.now(); } catch { return false; }
};
const preferProxy = () => {
  try { sessionStorage.setItem(PROXY_KEY, String(Date.now() + PROXY_MS)); } catch { /* private mode */ }
};

function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) ctrl.abort(); else outer.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  // Only our own backend; leave everything else alone.
  if (!url.startsWith(supabaseUrl) || url.includes('/realtime/')) return fetch(input, init);

  const proxied = url.replace(supabaseUrl, PROXY_BASE);
  const proxiedInput: RequestInfo | URL = typeof input === 'string' || input instanceof URL ? proxied : new Request(proxied, input);
  const isUpload = url.includes('/storage/');
  const directMs = isUpload ? 30_000 : 12_000;

  if (proxyPreferred()) {
    try { return await fetchWithTimeout(proxiedInput, init, directMs + 8_000); }
    catch { /* proxy trouble: fall through to the direct address */ }
  }

  try {
    return await fetchWithTimeout(input, init, directMs);
  } catch (err) {
    if (init?.signal?.aborted) throw err; // the caller cancelled on purpose
    try {
      const res = await fetchWithTimeout(proxiedInput, init, directMs + 8_000);
      preferProxy();
      return res;
    } catch {
      throw err; // both routes failed: report the original error
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: { fetch: resilientFetch },
});
