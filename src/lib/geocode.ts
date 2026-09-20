import type { LatLng } from './geo';

/** Coordinates to a readable address (OpenStreetMap Nominatim). Falls back to the raw coordinates. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/** A typed address to coordinates, biased to Lusaka but valid anywhere in Zambia. */
export async function geocodeAddress(q: string): Promise<LatLng | null> {
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=zm'
      + '&viewbox=27.8,-15.2,28.7,-15.75&q=' + encodeURIComponent(q);
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]) return [Number(rows[0].lat), Number(rows[0].lon)];
  } catch { /* offline or rate limited */ }
  return null;
}
