import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LatLng, LUSAKA } from '../../lib/geo';

export type MarkerKind = 'walker' | 'walker-offline' | 'groomer' | 'me' | 'owner' | 'pickup' | 'job' | 'dog' | 'vet' | 'vet-listed' | 'trainer';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: MarkerKind;
  /** Pulsing ring, used for anything that is live right now. */
  live?: boolean;
  selected?: boolean;
  title?: string;
}

export interface MapLine {
  id: string;
  points: LatLng[];
  color?: string;
  width?: number;
  dashed?: boolean;
  opacity?: number;
}

interface Props {
  markers: MapMarker[];
  lines?: MapLine[];
  center?: LatLng;
  zoom?: number;
  /** Change this value to re-fit the map around all markers and lines. */
  fitKey?: string | number;
  /** Keep the camera centred on this point as it moves (e.g. the walker during a walk). */
  follow?: LatLng | null;
  /** Pixels of the map covered by a bottom sheet, so fitted content stays visible. */
  bottomPadding?: number;
  onSelect?: (id: string) => void;
  onMapClick?: () => void;
}

const STYLE_ID = 'pf-map-styles';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes pf-live-ring { 0% { transform: scale(.85); opacity: .7 } 100% { transform: scale(1.9); opacity: 0 } }
    .pf-pin { position: relative; display:flex; align-items:center; justify-content:center; transition: transform .2s ease; cursor: pointer; }
    .pf-pin.sel { transform: scale(1.22); z-index: 5; }
    .pf-ring { position:absolute; inset:0; border-radius:50%; background: rgba(43,138,80,.45); animation: pf-live-ring 1.8s ease-out infinite; pointer-events:none; }
  `;
  document.head.appendChild(s);
}

const KIND: Record<MarkerKind, { size: number; bg: string; glyph: string; opacity?: number; border?: string }> = {
  walker:           { size: 42, bg: 'linear-gradient(135deg,#1B4332,#2B8A50)', glyph: '🦮' },
  'walker-offline': { size: 36, bg: 'linear-gradient(135deg,#6B7280,#9CA3AF)', glyph: '🦮', opacity: 0.85 },
  groomer:          { size: 42, bg: 'linear-gradient(135deg,#1B4332,#2B8A50)', glyph: '✂️' },
  me:               { size: 18, bg: '#3B82F6', glyph: '' },
  owner:            { size: 34, bg: '#3B82F6', glyph: '🧍' },
  pickup:           { size: 38, bg: 'linear-gradient(135deg,#1B4332,#2B8A50)', glyph: '📍' },
  job:              { size: 36, bg: 'linear-gradient(135deg,#D97706,#F59E0B)', glyph: '🐾' },
  dog:              { size: 36, bg: 'linear-gradient(135deg,#1B4332,#2B8A50)', glyph: '🐕' },
  vet:              { size: 40, bg: 'linear-gradient(135deg,#0F766E,#0891B2)', glyph: '🏥' },
  'vet-listed':     { size: 34, bg: 'linear-gradient(135deg,#64748B,#94A3B8)', glyph: '🏥', opacity: 0.9 },
  trainer:          { size: 40, bg: 'linear-gradient(135deg,#1B4332,#2B8A50)', glyph: '🎓' },
};

function buildPin(m: MapMarker): HTMLDivElement {
  const k = KIND[m.kind];
  const root = document.createElement('div');
  root.style.width = root.style.height = `${k.size}px`;
  const inner = document.createElement('div');
  inner.className = 'pf-pin' + (m.selected ? ' sel' : '');
  inner.style.cssText += `width:${k.size}px;height:${k.size}px;border-radius:50%;background:${k.bg};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);font-size:${Math.round(k.size * 0.44)}px;${k.opacity ? `opacity:${k.opacity};` : ''}`;
  if (m.live) {
    const ring = document.createElement('span');
    ring.className = 'pf-ring';
    inner.appendChild(ring);
  }
  if (k.glyph) {
    const g = document.createElement('span');
    g.style.position = 'relative';
    g.textContent = k.glyph;
    inner.appendChild(g);
  }
  if (m.title) root.title = m.title;
  root.appendChild(inner);
  return root;
}

const pinSignature = (m: MapMarker) => `${m.kind}|${m.live ? 1 : 0}|${m.selected ? 1 : 0}|${m.title ?? ''}`;

export default function LiveRouteMap({ markers, lines = [], center = LUSAKA, zoom = 13, fitKey, follow, bottomPadding = 0, onSelect, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const pinsRef = useRef(new Map<string, { marker: maplibregl.Marker; sig: string }>());
  const linesRef = useRef<MapLine[]>(lines);
  const markersRef = useRef<MapMarker[]>(markers);
  const cbRef = useRef({ onSelect, onMapClick });
  const fitPendingRef = useRef<boolean>(false);
  const paddingRef = useRef(bottomPadding);
  cbRef.current = { onSelect, onMapClick };
  linesRef.current = lines;
  markersRef.current = markers;
  paddingRef.current = bottomPadding;

  const syncLines = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const wanted = new Set(linesRef.current.map(l => l.id));
    (map.getStyle()?.layers ?? []).forEach(layer => {
      if (layer.id.startsWith('pfline-') && !wanted.has(layer.id.slice(7))) {
        map.removeLayer(layer.id);
        if (map.getSource(layer.id)) map.removeSource(layer.id);
      }
    });
    linesRef.current.forEach(l => {
      const id = `pfline-${l.id}`;
      const data: GeoJSON.Feature = {
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: l.points.map(([la, lo]) => [lo, la]) },
      };
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) { src.setData(data); return; }
      map.addSource(id, { type: 'geojson', data });
      map.addLayer({
        id, type: 'line', source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': l.color ?? '#2B8A50',
          'line-width': l.width ?? 4,
          'line-opacity': l.opacity ?? 0.9,
          ...(l.dashed ? { 'line-dasharray': [2, 2] } : {}),
        },
      });
    });
  };

  const fit = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) { fitPendingRef.current = true; return; }
    const b = new maplibregl.LngLatBounds();
    let n = 0;
    markersRef.current.forEach(m => { b.extend([m.lng, m.lat]); n++; });
    linesRef.current.forEach(l => l.points.forEach(([la, lo]) => { b.extend([lo, la]); n++; }));
    if (n === 0) return;
    if (n === 1) { const m = markersRef.current[0]; map.easeTo({ center: [m.lng, m.lat], zoom: 15, duration: 500 }); return; }
    map.fitBounds(b, { padding: { top: 70, left: 50, right: 50, bottom: 50 + paddingRef.current }, maxZoom: 16, duration: 600 });
  };

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    ensureStyles();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('click', () => cbRef.current.onMapClick?.());
    map.on('load', () => {
      loadedRef.current = true;
      syncLines();
      if (fitPendingRef.current) { fitPendingRef.current = false; fit(); }
    });
    mapRef.current = map;
    const pins = pinsRef.current;
    return () => {
      pins.forEach(p => p.marker.remove());
      pins.clear();
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile markers in place so live movement animates instead of re-creating pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pins = pinsRef.current;
    const seen = new Set<string>();
    markers.forEach(m => {
      seen.add(m.id);
      const sig = pinSignature(m);
      const existing = pins.get(m.id);
      if (existing && existing.sig === sig) {
        existing.marker.setLngLat([m.lng, m.lat]);
        return;
      }
      existing?.marker.remove();
      const el = buildPin(m);
      el.addEventListener('click', e => { e.stopPropagation(); cbRef.current.onSelect?.(m.id); });
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([m.lng, m.lat]).addTo(map);
      pins.set(m.id, { marker, sig });
    });
    pins.forEach((p, id) => { if (!seen.has(id)) { p.marker.remove(); pins.delete(id); } });
  }, [markers]);

  useEffect(() => { syncLines(); }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (fitKey !== undefined) fit(); }, [fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (follow && mapRef.current) mapRef.current.easeTo({ center: [follow[1], follow[0]], duration: 800 });
  }, [follow?.[0], follow?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
