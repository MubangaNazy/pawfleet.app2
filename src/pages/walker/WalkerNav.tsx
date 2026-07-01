import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useApp } from '../../context/AppContext';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function WalkerNav() {
  const { walkId } = useParams<{ walkId: string }>();
  const navigate = useNavigate();
  const { data } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const watchRef = useRef<number | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const routeSourceRef = useRef(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState(false);

  const walk = data.walks.find(w => w.id === walkId);
  const destLat = walk?.startLocation?.lat;
  const destLng = walk?.startLocation?.lng;
  const destAddr = walk?.startLocation?.address;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const dest: [number, number] = destLng != null && destLat != null
      ? [destLng, destLat]
      : [28.2833, -15.4167];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: dest,
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', () => {
      if (destLat == null || destLng == null) return;

      // Pulse ring behind destination
      const pulseEl = document.createElement('div');
      pulseEl.style.cssText = `
        width:60px;height:60px;border-radius:50%;
        border:2.5px solid rgba(43,138,80,0.35);
        pointer-events:none;
      `;
      pulseEl.innerHTML = `<style>
        @keyframes pf-nav-pulse{0%,100%{opacity:.6;transform:scale(.8)}50%{opacity:.2;transform:scale(1.2)}}
        .pf-pulse{animation:pf-nav-pulse 2s infinite}
      </style><div class="pf-pulse" style="width:100%;height:100%;border-radius:50%;border:2px solid rgba(43,138,80,0.3)"></div>`;
      new maplibregl.Marker({ element: pulseEl, anchor: 'center' })
        .setLngLat([destLng, destLat])
        .addTo(map);

      // Destination pin
      const destEl = document.createElement('div');
      destEl.style.cssText = `
        width:38px;height:38px;border-radius:50%;
        background:linear-gradient(135deg,#1B4332,#2B8A50);
        display:flex;align-items:center;justify-content:center;
        border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.4);
        cursor:pointer;
      `;
      destEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;

      new maplibregl.Marker({ element: destEl, anchor: 'center' })
        .setLngLat([destLng, destLat])
        .setPopup(
          new maplibregl.Popup({ offset: 28, closeButton: false })
            .setHTML(`<p style="font-weight:700;font-size:12px;color:#111827;margin:0;max-width:180px">${destAddr || 'Pickup location'}</p>`)
        )
        .addTo(map);

      // Route source + layer (dashed line)
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2B8A50', 'line-width': 3.5, 'line-dasharray': [2, 2.5] },
      });
      routeSourceRef.current = true;
    });

    const onPosition = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;

      // Blue user dot
      if (!userMarkerRef.current) {
        const userEl = document.createElement('div');
        userEl.style.cssText = `
          width:20px;height:20px;border-radius:50%;
          background:#3B82F6;border:3px solid white;
          box-shadow:0 2px 8px rgba(59,130,246,0.55);
        `;
        userMarkerRef.current = new maplibregl.Marker({ element: userEl, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([lng, lat]);
      }

      // Update route line
      if (routeSourceRef.current && destLat != null && destLng != null) {
        const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
        src?.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[lng, lat], [destLng, destLat]] },
          properties: {},
        });
      }

      // Distance
      if (destLat != null && destLng != null) {
        setDistance(haversineKm(lat, lng, destLat, destLng));

        // Fit both points
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([lng, lat]);
        bounds.extend([destLng, destLat]);
        map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 1200 });
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onPosition, () => setGpsError(true), { enableHighAccuracy: true, timeout: 10000 });
      watchRef.current = navigator.geolocation.watchPosition(onPosition, undefined, { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 });
    } else {
      setGpsError(true);
    }

    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      map.remove();
      mapRef.current = null;
      routeSourceRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0 z-[1001]"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button type="button" onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-transform"
          style={{ background: '#F3F4F6' }}>
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">In-app Navigation</p>
          <p className="text-sm font-bold text-ink truncate">{destAddr || 'Navigating to pickup'}</p>
        </div>
        {distance !== null && (
          <div className="shrink-0 px-3 py-1.5 rounded-full" style={{ background: '#EBF5EF' }}>
            <span className="text-xs font-bold" style={{ color: '#1B4332' }}>
              {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`} away
            </span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {!destLat && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-secondary gap-3 p-6 text-center z-10">
            <span className="text-4xl">🗺️</span>
            <p className="text-sm text-ink-secondary">No pickup location set for this walk</p>
          </div>
        )}

        {gpsError && (
          <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
            <span className="text-amber-600 text-lg">⚠️</span>
            <p className="text-xs text-amber-700 font-medium">Enable GPS to see your position on the map</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border-t border-surface-border px-4 py-3 pb-6 shrink-0">
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: '#3B82F6', border: '2px solid white', boxShadow: '0 0 0 2px rgba(59,130,246,0.3)' }} />
            <span className="text-xs font-medium text-ink-muted">Your location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-px h-4 border-l-2 border-dashed" style={{ borderColor: '#2B8A50' }} />
            <span className="text-xs font-medium text-ink-muted">Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }} />
            <span className="text-xs font-medium text-ink-muted">Pickup</span>
          </div>
        </div>
      </div>
    </div>
  );
}
