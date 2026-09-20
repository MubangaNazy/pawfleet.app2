import { supabase } from './supabase';

/** Message shown when the phone cannot reach PawFleet's servers. */
export const OFFLINE_MESSAGE =
  "We can't reach PawFleet right now. Check your mobile data or Wi-Fi, then try again. If it keeps happening, switch between Wi-Fi and mobile data.";

export const isNetworkFailure = (msg?: string | null): boolean =>
  !!msg && /failed to fetch|network ?error|load failed|fetch failed|networkerror|timed? ?out|timeout|abort/i.test(msg);

export function withTimeout<T>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([Promise.resolve(p), new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Is there a signed-in session? Returns null when we could not find out quickly. Callers should carry on
 * in that case instead of freezing: the database itself will refuse the request if the session is really gone.
 */
export async function sessionState(): Promise<boolean | null> {
  const r = await withTimeout(
    supabase.auth.getSession().then(x => (x.data.session ? true : false)).catch(() => null),
    4000,
    null as boolean | null,
  );
  return r;
}
