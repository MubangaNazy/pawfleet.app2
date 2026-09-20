import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { LatLng, haversineKm, isValidCoord, pathLengthKm } from './geo';
import { planLoopRoute, type Maneuver } from './routing';
import { locationSupported, watchLocation, type LocationError, type LocationFix } from './nativeLocation';

/* ────────────────────────────────────────────────────────────────────────────
 * 1. LIVE WALKER ROSTER  (who is online right now, and where)
 *
 * Walkers who tap "Go Online" broadcast their GPS position on one shared Supabase
 * Realtime channel. Everyone else listens. There is no server-side "who is online"
 * list to go stale: a walker counts as live only while their broadcasts keep arriving
 * (they also send an explicit "offline" message), and is dropped after 60 s of silence.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LiveWalker { id: string; lat: number; lng: number; ts: number }

const TOPIC = 'walkers-live';
const STALE_MS = 60_000;
const HEARTBEAT_MS = 20_000;
const RESUME_KEY = 'pawfleet_walker_online';

let channel: RealtimeChannel | null = null;
let subscribed = false;
let roster: Record<string, LiveWalker> = {};
let viewers = 0;
const rosterListeners = new Set<() => void>();
let lastPayload: { id: string; lat: number; lng: number } | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;

const emitRoster = () => rosterListeners.forEach(f => f());

function sendPos() {
  if (channel && subscribed && lastPayload && onlineState.online) {
    channel.send({ type: 'broadcast', event: 'pos', payload: lastPayload }).catch(() => {});
  }
}

function ensureChannel(): RealtimeChannel {
  if (channel) return channel;
  const ch = supabase.channel(TOPIC, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
    if (!payload?.id || !isValidCoord(payload.lat, payload.lng)) return;
    // Stamp with our own clock on arrival, so a phone with a wrong clock cannot look stale.
    roster = { ...roster, [payload.id]: { id: payload.id, lat: payload.lat, lng: payload.lng, ts: Date.now() } };
    emitRoster();
  }).on('broadcast', { event: 'offline' }, ({ payload }) => {
    if (payload?.id && roster[payload.id]) {
      const { [payload.id]: _gone, ...rest } = roster;
      roster = rest;
      emitRoster();
    }
  }).on('broadcast', { event: 'hello' }, () => {
    // A viewer just opened the map: answer with our position (small random delay avoids a reply storm).
    if (onlineState.online) setTimeout(sendPos, Math.random() * 1200);
  }).subscribe(status => {
    subscribed = status === 'SUBSCRIBED';
    if (!subscribed) return;
    sendPos();
    if (viewers > 0) ch.send({ type: 'broadcast', event: 'hello', payload: {} }).catch(() => {});
  });
  channel = ch;
  return ch;
}

function releaseChannel() {
  if (channel && viewers <= 0 && !onlineState.online && !onlineState.starting) {
    supabase.removeChannel(channel);
    channel = null; subscribed = false; roster = {};
    emitRoster();
  }
}

/** Live roster of online walkers, keyed by walker id. Updates in real time. */
export function useWalkersLive(userId: string | undefined): Record<string, LiveWalker> {
  const [r, setR] = useState<Record<string, LiveWalker>>(roster);
  useEffect(() => {
    if (!userId) return;
    viewers++;
    const ch = ensureChannel();
    if (subscribed) ch.send({ type: 'broadcast', event: 'hello', payload: {} }).catch(() => {});
    const fn = () => setR(roster);
    rosterListeners.add(fn);
    fn();
    // Drop walkers we have not heard from in a while (closed the app, lost signal).
    const prune = setInterval(() => {
      const now = Date.now();
      const fresh = Object.fromEntries(Object.entries(roster).filter(([, w]) => now - w.ts < STALE_MS));
      if (Object.keys(fresh).length !== Object.keys(roster).length) { roster = fresh; emitRoster(); }
    }, 10_000);
    return () => { clearInterval(prune); rosterListeners.delete(fn); viewers--; releaseChannel(); };
  }, [userId]);
  return r;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. WALKER ONLINE MANAGER  (Go Online / Go Offline)
 *
 * A single app-wide GPS watcher. It lives outside React so it keeps running as
 * the walker moves between screens.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface OnlineState { online: boolean; starting: boolean; pos: LatLng | null; error: string | null }

let onlineState: OnlineState = { online: false, starting: false, pos: null, error: null };
const onlineListeners = new Set<() => void>();
const setOnlineState = (patch: Partial<OnlineState>) => {
  onlineState = { ...onlineState, ...patch };
  onlineListeners.forEach(f => f());
};

export function useWalkerOnline(): OnlineState {
  return useSyncExternalStore(
    cb => { onlineListeners.add(cb); return () => { onlineListeners.delete(cb); }; },
    () => onlineState,
  );
}

let stopWatchFn: (() => void) | null = null;
let myId = '';
let saveBase = false;
let lastSentAt = 0;
let lastSentPos: LatLng | null = null;
let lastPersistAt = 0;
let lastPersisted: LatLng | null = null;

function persist(isOnline: boolean, pos?: LatLng | null) {
  if (!myId) return;
  const row: Record<string, unknown> = { is_online: isOnline };
  if (isOnline) row.went_online_at = new Date().toISOString();
  if (pos) {
    row.online_lat = pos[0];
    row.online_lng = pos[1];
    if (saveBase) { row.service_lat = pos[0]; row.service_lng = pos[1]; saveBase = false; }
  }
  // Fire-and-forget: liveness comes from the broadcasts, the DB copy is only the "last known" position.
  supabase.from('users').update(row).eq('id', myId).then(({ error }) => {
    if (error) console.warn('walker online persist:', error.message);
  });
  lastPersistAt = Date.now();
  if (pos) lastPersisted = pos;
}

function onFix(p: LocationFix) {
  const pos: LatLng = [p.coords.latitude, p.coords.longitude];
  const now = Date.now();
  const first = !onlineState.online;
  setOnlineState({ online: true, starting: false, pos, error: null });
  lastPayload = { id: myId, lat: pos[0], lng: pos[1] };
  // Send once the walker has moved about 10 m; the heartbeat covers standing still.
  if (first || !lastSentPos || haversineKm(lastSentPos, pos) > 0.01) {
    lastSentAt = now; lastSentPos = pos; sendPos();
  }
  const moved = lastPersisted ? haversineKm(lastPersisted, pos) : Infinity;
  if (first || (now - lastPersistAt > 60_000 && moved > 0.03) || now - lastPersistAt > 5 * 60_000) persist(true, pos);
}

function onFixError(e: LocationError) {
  if (e.code === 1) {
    stopWatch();
    setOnlineState({ online: false, starting: false, error: 'Location permission is blocked. Allow location for PawFleet in your browser or phone settings, then try again.' });
    try { localStorage.removeItem(RESUME_KEY); } catch { /* private mode */ }
    releaseChannel();
  } else if (!onlineState.online) {
    setOnlineState({ error: 'Still looking for a GPS signal… move to an open area.' });
  }
}

function stopWatch() {
  if (stopWatchFn) { stopWatchFn(); stopWatchFn = null; }
  if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
}

/** Start broadcasting this walker's live position. `hasBase` = walker already saved a service location. */
export function goOnline(userId: string, hasBase: boolean) {
  if (onlineState.online || onlineState.starting) return;
  if (!locationSupported()) {
    setOnlineState({ error: 'This device does not support GPS location.' });
    return;
  }
  myId = userId;
  saveBase = !hasBase;
  lastSentAt = 0; lastSentPos = null;
  setOnlineState({ starting: true, error: null });
  ensureChannel();
  stopWatchFn = watchLocation(onFix, onFixError);
  heartbeat = setInterval(() => { lastSentAt = Date.now(); sendPos(); }, HEARTBEAT_MS);
  try { localStorage.setItem(RESUME_KEY, userId); } catch { /* private mode */ }
}

export function goOffline() {
  const ch = channel;
  const id = myId;
  stopWatch();
  lastPayload = null;
  persist(false);
  try { localStorage.removeItem(RESUME_KEY); } catch { /* private mode */ }
  setOnlineState({ online: false, starting: false });
  // Tell listeners straight away instead of making them wait for the timeout.
  if (ch && subscribed && id) {
    Promise.resolve(ch.send({ type: 'broadcast', event: 'offline', payload: { id } })).catch(() => {}).finally(releaseChannel);
  } else {
    releaseChannel();
  }
}

/** Called once after login: if the walker was online when the app closed, go live again. */
export function shouldResumeOnline(userId: string): boolean {
  try { return localStorage.getItem(RESUME_KEY) === userId; } catch { return false; }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. WALK ROOM  (one booked walk: walker ↔ owner)
 *
 * Carries: walker position, owner pickup position, and the planned route.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface WalkerPosMsg { lat: number; lng: number; distKm?: number; elapsedSec?: number; ts?: number }
export interface OwnerPosMsg { lat: number; lng: number; ts?: number }
export interface RouteMsg { points: LatLng[]; distanceKm: number; durationMin: number; source: string; maneuvers?: Maneuver[] }

export interface RoomHandlers {
  onWalkerPos?: (m: WalkerPosMsg) => void;
  onOwnerPos?: (m: OwnerPosMsg) => void;
  onRoute?: (r: RouteMsg) => void;
  /** Someone just joined and would like the latest route/position. */
  onHello?: () => void;
  onReady?: () => void;
}

export function useWalkRoom(walkId: string | undefined, handlers: RoomHandlers) {
  const h = useRef(handlers);
  h.current = handlers;
  const chRef = useRef<RealtimeChannel | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!walkId) return;
    const ch = supabase.channel(`walk-live-${walkId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'walker-pos' }, ({ payload }) => { if (isValidCoord(payload?.lat, payload?.lng)) h.current.onWalkerPos?.(payload); })
      .on('broadcast', { event: 'owner-pos' }, ({ payload }) => { if (isValidCoord(payload?.lat, payload?.lng)) h.current.onOwnerPos?.(payload); })
      .on('broadcast', { event: 'route' }, ({ payload }) => { if (Array.isArray(payload?.points) && payload.points.length > 1) h.current.onRoute?.(payload); })
      .on('broadcast', { event: 'hello' }, () => h.current.onHello?.())
      .subscribe(status => {
        readyRef.current = status === 'SUBSCRIBED';
        if (readyRef.current) h.current.onReady?.();
      });
    chRef.current = ch;
    return () => { readyRef.current = false; chRef.current = null; supabase.removeChannel(ch); };
  }, [walkId]);

  const send = useCallback((event: 'walker-pos' | 'owner-pos' | 'route' | 'hello', payload: object = {}) => {
    if (readyRef.current) chRef.current?.send({ type: 'broadcast', event, payload: { ...payload, ts: Date.now() } });
  }, []);

  return { send };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. ACTIVE WALK SESSION  (walker side, app-wide)
 *
 * While a walk is active, this records the GPS trail and broadcasts the walker's
 * position and the planned route to the owner. It lives outside React so it keeps
 * running when the walker opens chat or another screen.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface WalkSession {
  walkId: string;
  startMs: number;
  pos: LatLng | null;
  trail: LatLng[];
  distKm: number;
  gpsError: boolean;
  ownerPos: LatLng | null;
  plan: RouteMsg | null;
}

let session: WalkSession | null = null;
const sessionListeners = new Set<() => void>();
let sessCh: RealtimeChannel | null = null;
let sessReady = false;
let sessStop: (() => void) | null = null;
let sessSentAt = 0;

const trailKey = (id: string) => `pawfleet_trail_${id}`;
const planKey = (id: string) => `pawfleet_plan_${id}`;

function patchSession(p: Partial<WalkSession>) {
  if (!session) return;
  session = { ...session, ...p };
  sessionListeners.forEach(f => f());
}

function sessSend(event: 'walker-pos' | 'route', payload: object) {
  if (sessReady) sessCh?.send({ type: 'broadcast', event, payload: { ...payload, ts: Date.now() } });
}

function sessSendPos() {
  if (!session?.pos) return;
  sessSend('walker-pos', {
    lat: session.pos[0], lng: session.pos[1], distKm: session.distKm,
    elapsedSec: Math.floor((Date.now() - session.startMs) / 1000),
  });
}

export function useWalkSession(): WalkSession | null {
  return useSyncExternalStore(
    cb => { sessionListeners.add(cb); return () => { sessionListeners.delete(cb); }; },
    () => session,
  );
}

export function startWalkSession(opts: { walkId: string; startMs: number; minutes: number; pickup?: LatLng | null; bearing?: number }) {
  if (session?.walkId === opts.walkId) return;
  if (session) stopWalkSession();

  let trail: LatLng[] = [];
  let plan: RouteMsg | null = null;
  try {
    trail = JSON.parse(localStorage.getItem(trailKey(opts.walkId)) || '[]');
    plan = JSON.parse(localStorage.getItem(planKey(opts.walkId)) || 'null');
  } catch { /* corrupt cache */ }

  session = {
    walkId: opts.walkId, startMs: opts.startMs,
    pos: trail.length ? trail[trail.length - 1] : null,
    trail, distKm: trail.length > 1 ? pathLengthKm(trail) : 0,
    gpsError: false, ownerPos: null, plan,
  };
  sessionListeners.forEach(f => f());

  const ch = supabase.channel(`walk-live-${opts.walkId}`, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'owner-pos' }, ({ payload }) => {
    if (isValidCoord(payload?.lat, payload?.lng)) patchSession({ ownerPos: [payload.lat, payload.lng] });
  }).on('broadcast', { event: 'hello' }, () => {
    if (session?.plan) sessSend('route', session.plan);
    sessSendPos();
  }).subscribe(status => {
    sessReady = status === 'SUBSCRIBED';
    if (sessReady) { if (session?.plan) sessSend('route', session.plan); sessSendPos(); }
  });
  sessCh = ch;

  if (!locationSupported()) { patchSession({ gpsError: true }); return; }

  let planning = !!plan;
  sessStop = watchLocation(
    p => {
      if (!session || session.walkId !== opts.walkId) return;
      const pt: LatLng = [p.coords.latitude, p.coords.longitude];
      const last = session.trail[session.trail.length - 1];
      // Ignore GPS jitter under 4 m so distance and file size stay honest.
      const nextTrail = !last || haversineKm(last, pt) >= 0.004 ? [...session.trail, pt] : session.trail;
      const distKm = nextTrail === session.trail ? session.distKm : session.distKm + (last ? haversineKm(last, pt) : 0);
      patchSession({ pos: pt, trail: nextTrail, distKm, gpsError: false });
      if (nextTrail !== session.trail || nextTrail.length === 1) {
        try { localStorage.setItem(trailKey(opts.walkId), JSON.stringify(nextTrail)); } catch { /* quota */ }
      }
      const now = Date.now();
      if (now - sessSentAt > 2500) { sessSentAt = now; sessSendPos(); }

      if (!planning) {
        planning = true;
        planLoopRoute(opts.pickup ?? pt, opts.minutes, opts.walkId, { bearing: opts.bearing }).then(r => {
          if (!session || session.walkId !== opts.walkId) return;
          const msg: RouteMsg = { points: r.points, distanceKm: r.distanceKm, durationMin: r.durationMin, source: r.source, maneuvers: r.maneuvers };
          try { localStorage.setItem(planKey(opts.walkId), JSON.stringify(msg)); } catch { /* quota */ }
          patchSession({ plan: msg });
          sessSend('route', msg);
        }).catch(() => { planning = false; });
      }
    },
    () => patchSession({ gpsError: true }),
  );
}

/** Replace the planned route mid-walk (the walker strayed and was re-routed) and tell the owner. */
export function setWalkPlan(route: RouteMsg) {
  if (!session) return;
  try { localStorage.setItem(planKey(session.walkId), JSON.stringify(route)); } catch { /* quota */ }
  patchSession({ plan: route });
  sessSend('route', route);
}

/** Stop tracking and return the recorded trail so it can be saved with the finished walk. */
export function stopWalkSession(): LatLng[] {
  if (!session) return [];
  const { trail, walkId } = session;
  if (sessStop) { sessStop(); sessStop = null; }
  if (sessCh) { supabase.removeChannel(sessCh); sessCh = null; }
  sessReady = false;
  try { localStorage.removeItem(trailKey(walkId)); localStorage.removeItem(planKey(walkId)); } catch { /* private mode */ }
  session = null;
  sessionListeners.forEach(f => f());
  return trail;
}
