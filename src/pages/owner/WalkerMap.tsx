import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useApp } from '../../context/AppContext';

const CENTER: [number, number] = [28.2833, -15.4167]; // [lng, lat]

const OFFSETS = [
  [0.004, 0.003], [-0.005, 0.007], [0.008, -0.004],
  [-0.002, -0.006], [0.006, 0.009], [-0.009, 0.002],
];

export default function WalkerMap() {
  const navigate = useNavigate();
  const { data } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const walkers = data.users.filter(u => u.role === 'walker' && u.walkerStatus === 'active');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: CENTER,
      zoom: 13,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    // Add a marker for each walker at an offset position around Lusaka
    walkers.forEach((walker, i) => {
      const off = OFFSETS[i % OFFSETS.length];
      const lngLat: [number, number] = [CENTER[0] + off[0], CENTER[1] + off[1]];

      const el = document.createElement('div');
      el.style.cssText = [
        'width:42px;height:42px;border-radius:50%;border:3px solid white;',
        'box-shadow:0 3px 10px rgba(0,0,0,0.35);cursor:pointer;',
        'display:flex;align-items:center;justify-content:center;font-size:18px;',
        'background:linear-gradient(135deg,#1B4332,#2B8A50);',
      ].join('');
      el.textContent = walker.imageUrl ? '' : walker.name[0].toUpperCase();

      if (walker.imageUrl) {
        const img = document.createElement('img');
        img.src = walker.imageUrl;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        el.appendChild(img);
      } else {
        el.style.color = 'white';
        el.style.fontWeight = '700';
        el.style.fontSize = '16px';
      }

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false })
        .setHTML(`
          <div style="padding:4px 2px;">
            <p style="font-weight:700;font-size:13px;color:#111827;margin:0 0 2px">${walker.name}</p>
            <p style="font-size:11px;color:#6B7280;margin:0 0 8px">Professional walker · Available</p>
            <button onclick="window.location.href='/owner/request'"
              style="width:100%;padding:6px 0;border-radius:10px;background:linear-gradient(135deg,#1B4332,#2B8A50);color:white;font-weight:700;font-size:12px;border:none;cursor:pointer;">
              Book now
            </button>
          </div>
        `);

      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(lngLat)
        .setPopup(popup)
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
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
        <div className="flex-1">
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">PawFleet</p>
          <p className="text-sm font-bold text-ink">Walkers Nearby</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: '#EBF5EF' }}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold" style={{ color: '#1B4332' }}>{walkers.length} online</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Hint */}
        <div className="absolute bottom-4 left-4 z-[999] bg-white rounded-2xl px-4 py-2.5 shadow-lg border border-surface-border">
          <p className="text-xs text-ink-muted">Tap a pin to book a walker</p>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-white border-t border-surface-border px-4 py-4 pb-8 shrink-0">
        <button type="button" onClick={() => navigate('/owner/request')}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-sm active:scale-[0.98] transition-all shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
          Book a Walker Now
        </button>
      </div>
    </div>
  );
}
