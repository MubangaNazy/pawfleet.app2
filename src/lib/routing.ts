import { LatLng, DOG_WALK_KMH, destination, haversineKm, pathLengthKm, seedBearing } from './geo';

export interface PlannedRoute {
  points: LatLng[];
  distanceKm: number;
  durationMin: number;
  /** 'roads' = real pedestrian routing, 'approx' = offline geometric fallback. */
  source: 'roads' | 'approx';
}

// Free public pedestrian router run by the OpenStreetMap community (fair-use, CORS enabled).
const VALHALLA = 'https://valhalla1.openstreetmap.de/route';

/** Decode a Valhalla polyline (precision 6) into [lat, lng] pairs. */
function decodePolyline6(str: string): LatLng[] {
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

async function valhalla(stops: LatLng[], signal?: AbortSignal): Promise<{ points: LatLng[]; km: number; sec: number }> {
  const json = JSON.stringify({
    locations: stops.map(([lat, lon]) => ({ lat, lon })),
    costing: 'pedestrian',
    directions_options: { units: 'kilometers' },
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(json)}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const j = await res.json();
    const legs: any[] = j?.trip?.legs ?? [];
    if (!legs.length) throw new Error('no route');
    const points: LatLng[] = [];
    legs.forEach((leg, li) => {
      const seg = decodePolyline6(leg.shape);
      points.push(...(li === 0 ? seg : seg.slice(1)));
    });
    return { points, km: Number(j.trip.summary.length), sec: Number(j.trip.summary.time) };
  } finally {
    clearTimeout(timer);
  }
}

/** Walking route between two points. Falls back to a straight line if the router is unreachable. */
export async function getWalkingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<PlannedRoute> {
  try {
    const r = await valhalla([from, to], signal);
    return { points: r.points, distanceKm: r.km, durationMin: Math.max(1, Math.round(r.sec / 60)), source: 'roads' };
  } catch {
    const km = haversineKm(from, to);
    return { points: [from, to], distanceKm: km, durationMin: Math.max(1, Math.round((km / 5) * 60)), source: 'approx' };
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
  return { points, distanceKm: pathLengthKm(points), durationMin: Math.round((targetKm / DOG_WALK_KMH) * 60), source: 'approx' };
}

/**
 * Plan a loop that begins and ends at `start` and takes roughly `minutes` at dog-walking pace.
 * Uses real footpaths/roads and resizes the loop until its length is within ~15% of the target.
 */
export async function planLoopRoute(start: LatLng, minutes: number, seed = 'pawfleet', signal?: AbortSignal): Promise<PlannedRoute> {
  const targetKm = (minutes / 60) * DOG_WALK_KMH;
  const bearing = seedBearing(seed);
  let side = targetKm / (3 * 1.35); // triangle side; real roads add roughly 35% detour
  let best: { points: LatLng[]; km: number; sec: number } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const p1 = destination(start, bearing, side);
      const p2 = destination(start, bearing + 60, side);
      const r = await valhalla([start, p1, p2, start], signal);
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
    return { points: best.points, distanceKm: best.km, durationMin: Math.round((best.km / DOG_WALK_KMH) * 60), source: 'roads' };
  }
  return approxLoop(start, targetKm, bearing);
}

/** Planned walk length in minutes: booking notes tag first, then the duration column, else 30. */
export function plannedMinutes(walk: { notes?: string; duration?: number }): number {
  const m = walk.notes?.match(/DURATION:(\d+)/);
  if (m) return Number(m[1]);
  return walk.duration && walk.duration > 0 ? walk.duration : 30;
}
