import { LatLng, haversineKm, isValidCoord } from './geo';

/**
 * Best-effort scan of OpenStreetMap for veterinary clinics around a point.
 * Coverage in Zambia is thin and the public servers are slow, so this only adds to the clinics
 * that are registered with PawFleet. It never blocks the screen and always fails quietly.
 */

export interface OsmPlace {
  id: string;
  name: string;
  address: string;
  phone?: string;
  hours?: string;
  lat: number;
  lng: number;
}

const SERVERS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

const CACHE_PREFIX = 'pawfleet_vets_';
const CACHE_MS = 24 * 60 * 60 * 1000;

function cacheKey(c: LatLng, radiusKm: number) {
  // ~2 km grid, so walking around the corner reuses the same scan.
  return `${CACHE_PREFIX}${c[0].toFixed(2)}_${c[1].toFixed(2)}_${radiusKm}`;
}

function toPlace(e: any): OsmPlace | null {
  const lat = e.lat ?? e.center?.lat;
  const lng = e.lon ?? e.center?.lon;
  const t = e.tags ?? {};
  if (!isValidCoord(lat, lng) || !t.name) return null;
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] || t['addr:city']].filter(Boolean).join(' ')
    || t['addr:full'] || 'Address on the map';
  return {
    id: `osm-${e.type}-${e.id}`,
    name: String(t.name),
    address,
    phone: t.phone || t['contact:phone'],
    hours: t.opening_hours,
    lat, lng,
  };
}

async function queryServer(url: string, body: string, ms: number): Promise<any[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(body),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.elements) ? json.elements : [];
  } finally {
    clearTimeout(timer);
  }
}

export async function scanVetClinics(center: LatLng, radiusKm = 20): Promise<OsmPlace[]> {
  try {
    const cached = sessionStorage.getItem(cacheKey(center, radiusKm));
    if (cached) {
      const { at, places } = JSON.parse(cached);
      if (Date.now() - at < CACHE_MS) return places;
    }
  } catch { /* no cache */ }

  const r = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:25];(node["amenity"="veterinary"](around:${r},${center[0]},${center[1]});way["amenity"="veterinary"](around:${r},${center[0]},${center[1]}););out center tags 40;`;

  for (const server of SERVERS) {
    try {
      const elements = await queryServer(server, query, 20_000);
      const places = elements.map(toPlace).filter((p): p is OsmPlace => !!p)
        .sort((a, b) => haversineKm(center, [a.lat, a.lng]) - haversineKm(center, [b.lat, b.lng]));
      try { sessionStorage.setItem(cacheKey(center, radiusKm), JSON.stringify({ at: Date.now(), places })); } catch { /* quota */ }
      return places;
    } catch { /* try the next server */ }
  }
  return [];
}
