import { LatLng, DOG_WALK_KMH, haversineKm } from './geo';
import type { Maneuver, PlannedRoute } from './routing';

/** A route prepared for following: cumulative distances so progress can be measured along it. */
export interface Guide {
  points: LatLng[];
  cumKm: number[];
  totalKm: number;
  maneuvers: Maneuver[];
}

export function buildGuide(route: PlannedRoute): Guide {
  const cumKm: number[] = [0];
  for (let i = 1; i < route.points.length; i++) cumKm.push(cumKm[i - 1] + haversineKm(route.points[i - 1], route.points[i]));
  return { points: route.points, cumKm, totalKm: cumKm[cumKm.length - 1] ?? 0, maneuvers: [...(route.maneuvers ?? [])].sort((a, b) => a.index - b.index) };
}

export interface Snap {
  /** Index of the route segment the position is closest to. */
  seg: number;
  /** Distance travelled along the route, in km. */
  progressKm: number;
  /** How far the position is from the route line, in km. */
  offKm: number;
}

/** Nearest point on a segment, in local metres (accurate enough at walking scale). */
function project(p: LatLng, a: LatLng, b: LatLng): { t: number; distM: number } {
  const kx = 111320 * Math.cos((a[0] * Math.PI) / 180);
  const ky = 110540;
  const bx = (b[1] - a[1]) * kx, by = (b[0] - a[0]) * ky;
  const px = (p[1] - a[1]) * kx, py = (p[0] - a[0]) * ky;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return { t, distM: Math.hypot(px - t * bx, py - t * by) };
}

/**
 * Find where along the route a GPS position is.
 *
 * A loop ends where it starts, so "closest point on the route" alone is ambiguous: at the very start
 * the walker is also at the very end. Among all points that fit the position equally well we pick the
 * one that follows on from where the walker last was, so progress only moves forward in sensible steps.
 */
export function snapToGuide(g: Guide, pos: LatLng, lastProgressKm = 0): Snap {
  const n = g.points.length - 1;
  if (n < 1) return { seg: 0, progressKm: 0, offKm: g.points[0] ? haversineKm(pos, g.points[0]) : 0 };

  const cands: { seg: number; progressKm: number; distM: number }[] = [];
  let minM = Infinity;
  for (let i = 0; i < n; i++) {
    const r = project(pos, g.points[i], g.points[i + 1]);
    const segLen = g.cumKm[i + 1] - g.cumKm[i];
    cands.push({ seg: i, progressKm: g.cumKm[i] + r.t * segLen, distM: r.distM });
    if (r.distM < minM) minM = r.distM;
  }
  // everything within 15 m of the best fit counts as "on the route here"
  const near = cands.filter(c => c.distM <= minM + 15);
  // prefer the candidate at or just ahead of the last known progress (allow 50 m of GPS wobble backwards)
  const forward = near.filter(c => c.progressKm >= lastProgressKm - 0.05);
  const pool = forward.length ? forward : near;
  const pick = pool.reduce((a, b) => {
    const da = Math.abs(a.progressKm - lastProgressKm), db = Math.abs(b.progressKm - lastProgressKm);
    return da <= db ? a : b;
  });
  return { seg: pick.seg, progressKm: pick.progressKm, offKm: minM / 1000 };
}

export interface NextTurn {
  maneuver: Maneuver;
  /** Distance from the walker to the point where it happens, in km. */
  distKm: number;
}

/** The next instruction still ahead of the walker. */
export function nextTurn(g: Guide, progressKm: number): NextTurn | null {
  for (const m of g.maneuvers) {
    const at = g.cumKm[m.index] ?? 0;
    if (at - progressKm > -0.012) return { maneuver: m, distKm: Math.max(0, at - progressKm) };
  }
  return null;
}

export const remainingMinutes = (remainingKm: number) => Math.max(0, Math.round((remainingKm / DOG_WALK_KMH) * 60));

/** "In 120 metres" style distance, rounded the way people say it. */
export function spokenDistance(km: number): string {
  const m = km * 1000;
  if (m >= 950) return `${(m / 1000).toFixed(1)} kilometres`;
  const step = m >= 100 ? 50 : 10;
  return `${Math.max(step, Math.round(m / step) * step)} metres`;
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export const farPrompt = (m: Maneuver, distKm: number) => `In ${spokenDistance(distKm)}, ${lowerFirst(m.text)}`;
export const nearPrompt = (m: Maneuver) => m.text;

/** Arrow shown for each kind of instruction. */
export function turnGlyph(type: number): string {
  switch (type) {
    case 9: case 17: return '↗';        // slight / bear right
    case 10: case 20: case 22: return '→';
    case 11: return '↱';                // sharp right
    case 12: return '↩';                // u-turn right
    case 13: return '↪';                // u-turn left
    case 14: return '↰';                // sharp left
    case 15: case 19: case 23: return '←';
    case 16: case 18: return '↖';       // slight / bear left
    case 4: case 5: case 6: return '🏁';
    case 1: case 2: case 3: return '🚶';
    default: return '↑';
  }
}

/**
 * When the walker strays, rejoin the original route at its next turn about 120 m ahead instead of
 * abandoning it, so a 30 minute walk stays a 30 minute walk.
 */
export function rejoinIndex(g: Guide, progressKm: number): number {
  const ahead = g.maneuvers.find(m => (g.cumKm[m.index] ?? 0) - progressKm >= 0.12 && m.type !== 4 && m.type !== 5 && m.type !== 6);
  if (ahead) return ahead.index;
  // no turn left: rejoin near the end
  return Math.max(0, g.points.length - 1);
}

/** Join a detour (from where the walker is now to the rejoin point) onto the rest of the original route. */
export function spliceReroute(original: PlannedRoute, detour: PlannedRoute, rejoin: number): PlannedRoute {
  const head = detour.points;
  const tail = original.points.slice(rejoin + 1);
  const shift = head.length - 1 - rejoin; // original index k (>= rejoin) becomes k + shift
  const turns = (detour.maneuvers ?? []).filter(m => !(m.type >= 4 && m.type <= 6)); // arriving at the rejoin point is not the end
  const rest = (original.maneuvers ?? []).filter(m => m.index >= rejoin).map(m => ({ ...m, index: m.index + shift }));
  const points = [...head, ...tail];
  const distanceKm = points.reduce((s, p, i) => (i ? s + haversineKm(points[i - 1], p) : 0), 0);
  return {
    points, distanceKm, durationMin: Math.round((distanceKm / DOG_WALK_KMH) * 60),
    source: original.source === 'roads' && detour.source === 'roads' ? 'roads' : 'approx',
    maneuvers: [...turns, ...rest].sort((a, b) => a.index - b.index),
  };
}
