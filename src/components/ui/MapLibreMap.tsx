import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  lat: number;
  lng: number;
  /** Optional second marker for completed walk endpoint */
  endLat?: number;
  endLng?: number;
  /** Optional trail points [[lat,lng],...] */
  trail?: [number, number][];
  zoom?: number;
}

export default function MapLibreMap({ lat, lng, endLat, endLng, trail, zoom = 15 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const markerRef    = useRef<maplibregl.Marker | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lng, lat],
      zoom,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    // Main (walker) marker — green paw pin
    const el = document.createElement('div');
    el.style.cssText = 'width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1B4332,#2B8A50);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:default;';
    el.textContent = '🐕';
    markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);

    // End marker if provided
    if (endLat != null && endLng != null) {
      const endEl = document.createElement('div');
      endEl.style.cssText = 'width:28px;height:28px;border-radius:50%;background:#EF4444;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;';
      endEl.textContent = '🏁';
      new maplibregl.Marker({ element: endEl, anchor: 'center' })
        .setLngLat([endLng, endLat])
        .addTo(map);
    }

    // Draw trail once map loads
    if (trail && trail.length > 1) {
      map.on('load', () => {
        map.addSource('trail', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: trail.map(([la, lo]) => [lo, la]),
            },
            properties: {},
          },
        });
        map.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail',
          paint: {
            'line-color': '#2B8A50',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      });
    }

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoothly move marker when position updates
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.easeTo({ center: [lng, lat], duration: 800 });
  }, [lat, lng]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
