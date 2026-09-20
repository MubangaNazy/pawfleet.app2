import { useEffect, useMemo, useRef, useState } from 'react';
import { LatLng, haversineKm } from '../lib/geo';
import { getWalkingRoute, type PlannedRoute } from '../lib/routing';
import {
  buildGuide, farPrompt, nearPrompt, nextTurn, rejoinIndex, remainingMinutes, snapToGuide, spliceReroute,
  type Guide, type NextTurn,
} from '../lib/guidance';
import { speak, voiceSupported } from '../lib/voice';

export interface TurnByTurn {
  guide: Guide | null;
  /** Distance covered on the current route, km. */
  progressKm: number;
  remainingKm: number;
  remainingMin: number;
  next: NextTurn | null;
  offRoute: boolean;
  rerouting: boolean;
  arrived: boolean;
}

interface Options {
  route: PlannedRoute | null;
  pos: LatLng | null;
  /** Off while paused or before the walk starts. */
  enabled: boolean;
  voice: boolean;
  /** 'loop' walks a planned loop and rejoins it if you stray. 'destination' heads to the end point. */
  mode: 'loop' | 'destination';
  /** Changing this starts a fresh session (new walk), so "let's go" and "halfway" are said again. */
  sessionKey: string;
  startText?: string;
  /** Called with a corrected route when the walker strays. */
  onRoute?: (route: PlannedRoute) => void;
}

const FAR_KM = 0.16;
const NEAR_KM = 0.05;
const OFF_KM = 0.045;
const OFF_NOW_KM = 0.09;

/**
 * Follows a walker along a route: works out what is next, says it out loud at the right moment,
 * and finds a way back if they wander off.
 */
export function useTurnByTurn(o: Options): TurnByTurn {
  const guide = useMemo(() => (o.route && o.route.points.length > 1 ? buildGuide(o.route) : null), [o.route]);

  const [progressKm, setProgress] = useState(0);
  const [offRoute, setOff] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [arrived, setArrived] = useState(false);

  const last = useRef(0);            // progress on the current route
  const base = useRef(0);            // distance covered before the last reroute
  const said = useRef(new Set<string>());
  const flags = useRef({ started: false, half: false, arrived: false });
  const offCount = useRef(0);
  const lastRerouteAt = useRef(0);
  const travelled = useRef(0);
  const lastPos = useRef<LatLng | null>(null);
  const pendingReroute = useRef<number | null>(null);
  const routeRef = useRef<PlannedRoute | null>(o.route);
  const opts = useRef(o);
  routeRef.current = o.route;
  opts.current = o;

  // New walk: forget everything said so far.
  useEffect(() => {
    flags.current = { started: false, half: false, arrived: false };
    said.current.clear(); last.current = 0; base.current = 0; travelled.current = 0; lastPos.current = null; offCount.current = 0;
    setProgress(0); setOff(false); setArrived(false);
  }, [o.sessionKey]);

  // A different route arrived: either our own reroute (keep the distance already covered) or a fresh one.
  useEffect(() => {
    said.current.clear();
    last.current = 0;
    if (pendingReroute.current != null) { base.current += pendingReroute.current; pendingReroute.current = null; }
    else base.current = 0;
    setProgress(0);
    setOff(false);
    offCount.current = 0;
  }, [guide]);

  useEffect(() => {
    const cur = opts.current;
    if (!cur.enabled || !guide || !cur.pos) return;
    const talk = (t: string) => { if (cur.voice && voiceSupported()) speak(t); };

    if (lastPos.current) travelled.current += haversineKm(lastPos.current, cur.pos);
    lastPos.current = cur.pos;

    const snap = snapToGuide(guide, cur.pos, last.current);
    last.current = Math.max(last.current, snap.progressKm);
    setProgress(last.current);

    offCount.current = snap.offKm > OFF_KM ? offCount.current + 1 : 0;
    const isOff = offCount.current >= 2 || snap.offKm > OFF_NOW_KM;
    setOff(isOff);

    if (isOff) {
      const now = Date.now();
      if (now - lastRerouteAt.current < 15_000) return;
      lastRerouteAt.current = now;
      setRerouting(true);
      talk('Off route. Recalculating.');
      const from = cur.pos;
      const prog = last.current;
      const original = routeRef.current;
      (async () => {
        try {
          if (!original) return;
          const route = cur.mode === 'loop'
            ? (() => { const rj = rejoinIndex(guide, prog); return getWalkingRoute(from, guide.points[rj]).then(det => spliceReroute(original, det, rj)); })()
            : getWalkingRoute(from, guide.points[guide.points.length - 1]);
          const fixed = await route;
          pendingReroute.current = prog;
          opts.current.onRoute?.(fixed);
        } finally {
          setRerouting(false);
        }
      })();
      return;
    }

    // Start of the walk.
    if (!flags.current.started) {
      flags.current.started = true;
      const first = guide.maneuvers[0];
      talk([cur.startText, first && first.type >= 1 && first.type <= 3 ? first.text : ''].filter(Boolean).join(' '));
    }

    // Next turn: "In 100 metres, turn left" then "Turn left".
    const nt = nextTurn(guide, last.current);
    if (nt && !(nt.maneuver.type >= 4 && nt.maneuver.type <= 6) && !(nt.maneuver.type >= 1 && nt.maneuver.type <= 3)) {
      const kFar = `${nt.maneuver.index}:far`, kNear = `${nt.maneuver.index}:near`;
      if (nt.distKm <= NEAR_KM && !said.current.has(kNear)) { said.current.add(kNear); said.current.add(kFar); talk(nearPrompt(nt.maneuver)); }
      else if (nt.distKm <= FAR_KM && !said.current.has(kFar)) { said.current.add(kFar); talk(farPrompt(nt.maneuver, nt.distKm)); }
    }

    // Halfway.
    const overall = base.current + last.current;
    const overallTotal = base.current + guide.totalKm;
    if (cur.mode === 'loop' && !flags.current.half && overall >= overallTotal / 2 && overallTotal > 0.6) {
      flags.current.half = true;
      talk(`Halfway. About ${remainingMinutes(guide.totalKm - last.current)} minutes to go.`);
    }

    // Arrived. Needs real distance covered, so the start of a loop (which is also its end) does not count.
    if (!flags.current.arrived && last.current >= guide.totalKm - 0.03 && travelled.current >= Math.min(0.15, guide.totalKm * 0.4)) {
      flags.current.arrived = true;
      setArrived(true);
      talk(cur.mode === 'loop' ? 'You are back where you started. Great walk!' : 'You have arrived.');
    }
  }, [o.pos, guide, o.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useMemo(() => (guide ? nextTurn(guide, progressKm) : null), [guide, progressKm]);
  const remainingKm = guide ? Math.max(0, guide.totalKm - progressKm) : 0;

  return { guide, progressKm, remainingKm, remainingMin: remainingMinutes(remainingKm), next, offRoute, rerouting, arrived };
}
