import { LatLng, DOG_WALK_KMH, destination, haversineKm, pathLengthKm, seedBearing } from './geo';

/** One instruction on a route, such as "Turn left onto Cairo Road". `index` is the point where it happens. */
export interface Maneuver {
  index: number;
  /** Valhalla maneuver type: 1-3 start, 4-6 arrive, 8 continue, 9-11 right, 14-16 left, 12-13 u-turn. */
  type: number;
  text: string;
  lengthKm: number;
  street?: string;
}

export interface PlannedRoute {
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
  /** 'roads' = real pedestrian routing, 'approx' = offline geometric fallback. */
  source: 'roads' | 'approx';
  /** Turn-by-turn instructions. Empty for the offline fallback. */
  maneuvers?: Maneuver[];
}

// Free public pedestrian router run by the OpenStreetMap community (fair-use, CORS enabled).
const VALHALLA = 'https://valhalla1.openstreetmap.de/route';

/** Decode a Valhalla polyline (precision 6) into [lat, lng] pairs. */
export function decodePolyline6(str: string): LatLng[] {
  const out: LatLng[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte: number;
      do {
        byte = str.charCodeAt(i++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && i < str.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push([lat / 1e6, lng / 1e6]);
  }
  return out;
}

interface RawRoute { points: LatLng[]; km: number; sec: number; maneuvers: Maneuver[] }

/**
 * Convert a Valhalla response into one continuous polyline plus a clean list of turns.
 * Multi-leg routes (a loop through waypoints) start and finish each leg with "start"/"arrive"
 * instructions that mean nothing to a walker passing through, so those are dropped.
 */
export function parseValhalla(j: any, loop: boolean): RawRoute {
  const legs: any[] = j?.trip?.legs ?? [];
  if (!legs.length) throw new Error('no route');
  const points: LatLng[] = [];
  const maneuvers: Maneuver[] = [];
  legs.forEach((leg, li) => {
    const seg = decodePolyline6(leg.shape);
    const base = li === 0 ? 0 : points.length - 1; // leg point k lands at combined index base + k
    points.push(...(li === 0 ? seg : seg.slice(1)));
    (leg.maneuvers ?? []).forEach((m: any) => {
      const t = Number(m.type);
      const isStart = t >= 1 && t <= 3;
      const isArrive = t >= 4 && t <= 6;
      if (t === 0 || t === 7) return;                 // "none" and "street name changes"
      if (isStart && li > 0) return;                  // start of a later leg is just the middle of the walk
      if (isArrive && li < legs.length - 1) return;   // arriving at a waypoint is not the end
      const text = isArrive && loop ? 'You are back where you started' : String(m.instruction ?? '').replace(/\.$/, '');
      if (!text) return;
      maneuvers.push({
        index: Math.min(points.length - 1, base + Number(m.begin_shape_index ?? 0)),
        type: t, text, lengthKm: Number(m.length ?? 0),
        street: Array.isArray(m.street_names) ? m.street_names[0] : undefined,
      });
    });
  });
  return { points, km: Number(j.trip.summary.length), sec: Number(j.trip.summary.time), maneuvers };
}

async function valhalla(stops: LatLng[], loop: boolean, signal?: AbortSignal): Promise<RawRoute> {
  const json = JSON.stringify({
    locations: stops.map(([lat, lon]) => ({ lat, lon })),
    costing: 'pedestrian',
    directions_options: { units: 'kilometers', language: 'en-US' },
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(json)}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    return parseValhalla(await res.json(), loop);
  } finally {
    clearTimeout(timer);
  }
}

/** Walking route between two points. Falls back to a straight line if the router is unreachable. */
export async function getWalkingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<PlannedRoute> {
  try {
    const r = await valhalla([from, to], false, signal);
    return { points: r.points, distanceKm: r.km, durationMin: Math.max(1, Math.round(r.sec / 60)), source: 'roads', maneuvers: r.maneuvers };
  } catch {
    const km = haversineKm(from, to);
    return { points: [from, to], distanceKm: km, durationMin: Math.max(1, Math.round((km / 5) * 60)), source: 'approx', maneuvers: [] };
  }
}

/** Offline fallback: a round loop that starts and ends at `start`. */
function approxLoop(start: LatLng, targetKm: number, bearing: number): PlannedRoute {
  const radius = targetKm / (2 * Math.PI);
  const centre = destination(start, bearing, radius);
  const back = (bearing + 180) % 360;
  const points: LatLng[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) points.push(destination(centre, back + (i / steps) * 360, radius));
  points[0] = start;
  points[steps] = start;
  return { points, distanceKm: pathLengthKm(points), durationMin: Math.round((targetKm / DOG_WALK_KMH) * 60), source: 'approx', maneuvers: [] };
}

export interface LoopOptions {
  /** Compass direction (0-359) the loop heads out in. Defaults to a stable direction from `seed`. */
  bearing?: number;
  signal?: AbortSignal;
}

/**
 * Plan a loop that begins and ends at `start` and takes roughly `minutes` at dog-walking pace.
 * Uses real footpaths/roads and resizes the loop until its length is within ~15% of the target.
 */
export async function planLoopRoute(start: LatLng, minutes: number, seed = 'pawfleet', opts: LoopOptions = {}): Promise<PlannedRoute> {
  const { signal } = opts;
  const targetKm = (minutes / 60) * DOG_WALK_KMH;
  const bearing = opts.bearing ?? seedBearing(seed);
  let side = targetKm / (3 * 1.35); // triangle side; real roads add roughly 35% detour
  let best: RawRoute | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const p1 = destination(start, bearing, side);
      const p2 = destination(start, bearing + 60, side);
      const r = await valhalla([start, p1, p2, start], true, signal);
      if (!best || Math.abs(r.km - targetKm) < Math.abs(best.km - targetKm)) best = r;
      if (Math.abs(r.km - targetKm) / targetKm <= 0.15) break;
      side = Math.min(Math.max(side * (targetKm / r.km), 0.15), 4);
    } catch {
      if (signal?.aborted) throw new Error('aborted');
      break; // keep whatever good attempt we already have
    }
  }
  // A real-road loop within 40% of the target beats a made-up circle; otherwise fall back offline.
  if (best && Math.abs(best.km - targetKm) / targetKm <= 0.4) {
    return {
      points: best.points, distanceKm: best.km, durationMin: Math.round((best.km / DOG_WALK_KMH) * 60),
      source: 'roads', maneuvers: best.maneuvers,
    };
  }
  return approxLoop(start, targetKm, bearing);
}

/** The four compass directions a loop can head out in, starting from the suggested one. */
export const LOOP_DIRECTIONS = ['Suggested route', 'Route heading east', 'Route heading south', 'Route heading west'] as const;

export function loopBearing(seed: string, option: number): number {
  return (seedBearing(seed) + option * 90) % 360;
}

/** Planned walk length in minutes: booking notes tag first, then the duration column, else 30. */
export function plannedMinutes(walk: { notes?: string; duration?: number }): number {
  const m = walk.notes?.match(/DURATION:(\d+)/);
  if (m) return Number(m[1]);
  return walk.duration && walk.duration > 0 ? walk.duration : 30;
}

/** The compass direction the owner chose for the loop, if any. */
export function plannedBearing(walk: { notes?: string }): number | undefined {
  const m = walk.notes?.match(/ROUTE:(\d+)/);
  return m ? Number(m[1]) % 360 : undefined;
}
