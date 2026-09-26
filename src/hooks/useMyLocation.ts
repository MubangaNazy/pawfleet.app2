import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '../lib/geo';
import { geocodeAddress } from '../lib/geocode';

export type LocationStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';

/**
 * The user's position for "near me" screens. Asks the phone once, and lets people type an area
 * instead if they would rather not share GPS.
 */
export function useMyLocation(autoAsk = true) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [source, setSource] = useState<'gps' | 'typed' | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const asked = useRef(false);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) { setStatus('unavailable'); return; }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      p => { setPos([p.coords.latitude, p.coords.longitude]); setSource('gps'); setStatus('ok'); },
      e => setStatus(e.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  }, []);

  /** Use an area typed by the person, e.g. "Kabulonga, Lusaka". Resolves false if it could not be found. */
  const setFromText = useCallback(async (text: string): Promise<boolean> => {
    const q = text.trim();
    if (q.length < 3) return false;
    setLookingUp(true);
    const hit = await geocodeAddress(q);
    setLookingUp(false);
    if (!hit) return false;
    setPos(hit); setSource('typed'); setStatus('ok');
    return true;
  }, []);

  /** Set an exact point directly, e.g. from a "drop a pin" picker. */
  const setPoint = useCallback((point: LatLng) => {
    setPos(point); setSource('typed'); setStatus('ok');
  }, []);

  useEffect(() => {
    if (autoAsk && !asked.current) { asked.current = true; request(); }
  }, [autoAsk, request]);

  return { pos, status, source, lookingUp, request, setFromText, setPoint };
}
