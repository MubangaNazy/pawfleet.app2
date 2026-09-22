import { useApp } from '../context/AppContext';
import { useWalkerOnline } from '../lib/liveTracking';
import { isValidCoord, type LatLng } from '../lib/geo';

export type RefPosSource = 'live' | 'saved' | null;

/**
 * Where to measure "nearby" from for a walker. Live position while online (most accurate),
 * otherwise their saved service area, so job scanning still works while offline.
 */
export function useWalkerRefPos(): { pos: LatLng | null; source: RefPosSource } {
  const { currentUser, data } = useApp();
  const { pos: livePos } = useWalkerOnline();
  const me = currentUser ? (data.users.find(u => u.id === currentUser.id) ?? currentUser) : null;

  if (livePos) return { pos: livePos, source: 'live' };
  if (me && isValidCoord(me.serviceLat, me.serviceLng)) return { pos: [me.serviceLat!, me.serviceLng!], source: 'saved' };
  return { pos: null, source: null };
}
