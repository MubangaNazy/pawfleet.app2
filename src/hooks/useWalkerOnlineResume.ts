import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { goOnline, shouldResumeOnline, startWalkSession, stopWalkSession, useWalkSession } from '../lib/liveTracking';
import { plannedBearing, plannedMinutes } from '../lib/routing';
import { isValidCoord, type LatLng } from '../lib/geo';

/** If a walker was online when the app was last closed, go live again once they are logged in and approved. */
export function useWalkerOnlineResume() {
  const { currentUser, data } = useApp();
  const me = currentUser ? (data.users.find(u => u.id === currentUser.id) ?? currentUser) : null;
  const approved = !!me && (!me.walkerStatus || me.walkerStatus === 'active');
  const isWalker = me?.role === 'walker';
  const id = me?.id;
  const hasBase = me?.serviceLat != null && me?.serviceLng != null;

  useEffect(() => {
    if (!id || !isWalker || !approved) return;
    if (shouldResumeOnline(id)) goOnline(id, hasBase);
  }, [id, isWalker, approved]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Keeps an active walk's GPS tracking and live broadcast running on every walker screen,
 * and stops it once the walk is finished from anywhere.
 */
export function useActiveWalkSession() {
  const { currentUser, data } = useApp();
  const session = useWalkSession();
  const isWalker = currentUser?.role === 'walker';
  const active = isWalker ? data.walks.find(w => w.walkerId === currentUser!.id && w.status === 'active') : undefined;

  useEffect(() => {
    if (!active) return;
    const pickup: LatLng | null = isValidCoord(active.startLocation?.lat, active.startLocation?.lng)
      ? [active.startLocation!.lat!, active.startLocation!.lng!] : null;
    startWalkSession({
      walkId: active.id,
      startMs: active.startTime ? new Date(active.startTime).getTime() : Date.now(),
      minutes: plannedMinutes(active),
      pickup,
      bearing: plannedBearing(active),
    });
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The walk was ended or cancelled somewhere else: stop tracking it.
  useEffect(() => {
    if (!session) return;
    const w = data.walks.find(x => x.id === session.walkId);
    if (w && w.status !== 'active') stopWalkSession();
  }, [session?.walkId, data.walks]); // eslint-disable-line react-hooks/exhaustive-deps
}
