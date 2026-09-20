import { Capacitor } from '@capacitor/core';

/**
 * One shared GPS stream for the whole app.
 *
 * - In the Android app it runs as a foreground service (the ongoing "PawFleet is tracking your walk"
 *   notification), which is what lets tracking continue with the screen locked or the app in the background.
 * - In a browser it uses the normal geolocation API, which stops when the screen locks.
 *
 * Every screen that needs GPS subscribes here instead of asking the phone separately, so two features
 * (for example "online" and "walking") never fight over the same sensor.
 */

export interface LocationFix {
  coords: { latitude: number; longitude: number; accuracy: number; heading: number | null; speed: number | null };
  timestamp: number;
}

/** `code` matches the browser: 1 = permission denied, 2 = unavailable, 3 = timeout. */
export interface LocationError { code: number; message: string }

interface Sub { onFix: (f: LocationFix) => void; onError: (e: LocationError) => void }

const subs = new Set<Sub>();
let stopSource: (() => void) | null = null;
let starting = false;
let generation = 0;
let lastFix: LocationFix | null = null;

export const isNativeApp = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export const locationSupported = (): boolean => isNativeApp() || (typeof navigator !== 'undefined' && 'geolocation' in navigator);

const emitFix = (f: LocationFix) => { lastFix = f; subs.forEach(s => s.onFix(f)); };
const emitError = (e: LocationError) => subs.forEach(s => s.onError(e));

function startSource() {
  if (starting || stopSource) return;
  const gen = ++generation;

  if (isNativeApp()) {
    starting = true;
    import('@capgo/background-geolocation')
      .then(({ BackgroundGeolocation }) =>
        BackgroundGeolocation.start(
          {
            backgroundTitle: 'PawFleet is using your location',
            backgroundMessage: 'Live location is on for your walk. Tap to open PawFleet.',
            requestPermissions: true,
            stale: false,
            distanceFilter: 5,
          },
          (loc, err) => {
            if (err) {
              emitError({ code: err.code === 'NOT_AUTHORIZED' ? 1 : 2, message: err.message || 'Location unavailable' });
              return;
            }
            if (!loc) return;
            emitFix({
              coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, heading: loc.bearing ?? null, speed: loc.speed ?? null },
              timestamp: loc.time ?? Date.now(),
            });
          },
        ).then(() => {
          starting = false;
          const stop = () => { BackgroundGeolocation.stop().catch(() => {}); };
          // Everyone left while the service was still starting up: shut it straight down.
          if (gen !== generation || subs.size === 0) { stop(); return; }
          stopSource = stop;
        }),
      )
      .catch(e => { starting = false; emitError({ code: 2, message: String(e?.message ?? e) }); });
    return;
  }

  if (!('geolocation' in navigator)) { emitError({ code: 2, message: 'This device does not support GPS location.' }); return; }
  const id = navigator.geolocation.watchPosition(
    p => emitFix({
      coords: { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy, heading: p.coords.heading, speed: p.coords.speed },
      timestamp: p.timestamp,
    }),
    e => emitError({ code: e.code, message: e.message }),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 25_000 },
  );
  stopSource = () => navigator.geolocation.clearWatch(id);
}

function shutdown() {
  generation++;
  stopSource?.();
  stopSource = null;
  lastFix = null;
}

/** Start receiving GPS fixes. Returns a function that stops listening. */
export function watchLocation(onFix: (f: LocationFix) => void, onError: (e: LocationError) => void = () => {}): () => void {
  const sub: Sub = { onFix, onError };
  subs.add(sub);
  if (lastFix && Date.now() - lastFix.timestamp < 15_000) { const f = lastFix; queueMicrotask(() => { if (subs.has(sub)) onFix(f); }); }
  startSource();
  return () => {
    subs.delete(sub);
    if (subs.size === 0) shutdown();
  };
}
