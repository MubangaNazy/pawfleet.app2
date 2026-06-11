import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { ArrowLeft, MessageCircle, Phone, Navigation } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

type LatLng = [number, number];
const LUSAKA: LatLng = [-15.4167, 28.2833];

const walkerIcon = L.divIcon({
  html: `<div style="width:48px;height:48px;background:#1B4332;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.4);font-size:22px;line-height:1;transform:translate(-50%,-50%)">🐾</div>`,
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const startIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:#10b981;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:translate(-50%,-50%)"></div>`,
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const endIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:translate(-50%,-50%)"></div>`,
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function WalkTracker() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data }   = useApp();
  const navigate   = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [livePos, setLivePos] = useState<LatLng | null>(null);

  const walk   = data.walks.find(w => w.id === walkId);
  const dog    = data.dogs.find(d => d.id === walk?.dogId);
  const walker = data.users.find(u => u.id === walk?.walkerId);

  useEffect(() => {
    if (walk?.status !== 'active') return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [walk?.status]);

  // Listen for walker's live broadcast
  useEffect(() => {
    if (!walkId) return;
    const channel = supabase
      .channel(`walk-location-${walkId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'location' }, ({ payload }) => {
        if (payload?.lat != null && payload?.lng != null) {
          setLivePos([payload.lat, payload.lng]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walkId]);

  if (!walk) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
        <span className="text-4xl">🐾</span>
        <p className="text-ink-secondary">Walk not found.</p>
        <button type="button" onClick={() => navigate('/owner')} className="text-primary text-sm font-semibold">
          ← Back to Home
        </button>
      </div>
    );
  }

  const startLat = walk.startLocation ? [walk.startLocation.lat, walk.startLocation.lng] as LatLng : null;
  const endLat   = walk.endLocation   ? [walk.endLocation.lat,   walk.endLocation.lng]   as LatLng : null;
  const isActive    = walk.status === 'active';
  const isCompleted = walk.status === 'completed';

  const mapCenter = livePos ?? startLat ?? LUSAKA;

  const routePath: LatLng[] = [
    ...(startLat ? [startLat] : []),
    ...(livePos  ? [livePos]  : []),
    ...(endLat && !isActive ? [endLat] : []),
  ];

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = (elapsed % 60).toString().padStart(2, '0');
  const durationDisplay = elapsed > 0
    ? `${elapsedMin}:${elapsedSec}`
    : walk.duration ? `${walk.duration} min` : '—';

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-white shrink-0 z-[1001]">
        <button type="button" onClick={() => navigate('/owner')} aria-label="Back to home"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-ink-muted font-semibold uppercase tracking-wider">PawFleet</p>
          <p className="text-sm font-bold text-ink">
            {dog?.name ? `${dog.name}'s walk` : 'Live tracking'}
          </p>
        </div>
        {isActive && livePos && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-light border border-success/20">
            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-xs font-bold text-success">LIVE</span>
          </div>
        )}
      </div>

      {/* Map — absolute inner div forces Leaflet to get a real pixel height */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        {!startLat && !livePos ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-secondary gap-3 p-6 text-center">
            <span className="text-4xl">🗺️</span>
            <p className="text-sm text-ink-secondary">
              {walk.status === 'pending' || walk.status === 'assigned'
                ? 'Map tracking starts when the walker begins the walk'
                : 'No location data available'}
            </p>
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0 }}>
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              <MapResizer />
              {routePath.length > 1 && (
                <Polyline positions={routePath} pathOptions={{ color: '#1B4332', weight: 5, opacity: 0.9 }} />
              )}
              {startLat && <Marker position={startLat} icon={startIcon} />}
              {isActive && livePos && <Marker position={livePos} icon={walkerIcon} />}
              {endLat && <Marker position={endLat} icon={endIcon} />}
            </MapContainer>
          </div>
        )}
        {isActive && !livePos && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 text-ink text-xs px-3 py-1.5 rounded-xl shadow font-semibold z-[1000] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Waiting for walker's location…
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-surface-border bg-white border-t border-surface-border shrink-0">
        {[
          { label: 'DISTANCE', value: '—' },
          { label: 'DURATION', value: durationDisplay },
          { label: 'STATUS',   value: isActive ? 'Active' : isCompleted ? 'Done' : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-4 gap-0.5">
            <span className="text-[10px] font-bold text-ink-muted tracking-widest">{label}</span>
            <span className="text-xl font-extrabold text-ink">{value}</span>
          </div>
        ))}
      </div>

      {/* Walker info card */}
      <div className="px-4 py-4 border-t border-surface-border bg-white shrink-0 pb-28 lg:pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-50 flex items-center justify-center shrink-0 border-2 border-surface-border">
            {walker?.imageUrl
              ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
              : <span className="text-lg font-bold text-primary">{walker?.name?.[0] || '?'}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ink">{walker?.name || 'Your walker'}</p>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
              {walk.startLocation?.address && (
                <span className="truncate">📍 {walk.startLocation.address}</span>
              )}
              {isActive && <span>· ETA soon</span>}
            </div>
            {walk.startTime && (
              <p className="text-xs text-ink-muted mt-0.5">
                ⏱ Started {format(new Date(walk.startTime), 'h:mm a')}
              </p>
            )}
            {isCompleted && walk.endTime && (
              <p className="text-xs text-success font-semibold mt-0.5">
                ✓ Completed at {format(new Date(walk.endTime), 'h:mm a')} · {walk.duration} min
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Link to={`/owner/chat/${walkId}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink hover:bg-surface-hover transition-colors">
            <MessageCircle className="w-4 h-4" /> Chat
          </Link>
          {walker?.phone && (
            <a href={`tel:${walker.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink hover:bg-surface-hover transition-colors">
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
          <button type="button"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-colors bg-[#1B4332]">
            <Navigation className="w-4 h-4" /> Route
          </button>
        </div>
      </div>
    </div>
  );
}
