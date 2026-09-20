/**
 * After every deploy the file names of the app's code chunks change. A phone that still has the
 * previous version open then asks for a chunk that no longer exists and the screen crashes with
 * "Failed to fetch dynamically imported module". Reloading once fetches the new version.
 */
const KEY = 'pawfleet_chunk_reload_at';

export const isChunkLoadError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk .* failed/i.test(msg);
};

/** Reload the page once. Returns false if we already tried in the last 30 s, so a real outage cannot loop. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* private mode: still allow one reload */ }
  window.location.reload();
  return true;
}

export function installChunkRecovery() {
  // Vite fires this when a lazy chunk cannot be loaded.
  window.addEventListener('vite:preloadError', ev => {
    ev.preventDefault();
    reloadForNewVersion();
  });
}
