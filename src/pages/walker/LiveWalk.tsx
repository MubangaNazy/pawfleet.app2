import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Phone, MessageCircle, Square, Navigation, Clock, MapPin, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

type LatLng = [number, number];
const LUSAKA: LatLng = [-15.4167, 28.2833];

// Distance in km between two lat/lng points
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function totalDistance(pts: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  return d;
}

const walkerIcon = L.divIcon({
  html: `<div style="width:44px;height:44px;background:#2B8A50;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);font-size:20px;line-height:1;transform:translate(-50%,-50%);position:relative">🐾</div>`,
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function MapFollower({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  const firstRef = useRef(true);
  useEffect(() => {
    if (!pos) return;
    if (firstRef.current) {
      map.setView(pos, 17);
      firstRef.current = false;
    } else {
      map.panTo(pos);
    }
  }, [pos, map]);
  return null;
}

export default function WalkerLiveWalk() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data, endWalk, startWalk } = useApp();
  const navigate = useNavigate();

  const [myPos, setMyPos]     = useState<LatLng | null>(null);
  const [route, setRoute]     = useState<LatLng[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [gpsError, setGpsError] = useState(false);
  const [starting, setStarting] = useState(false);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const walk  = data.walks.find(w => w.id === walkId);
  const dog   = data.dogs.find(d => d.id === walk?.dogId);
  const owner = data.users.find(u => u.id === walk?.ownerId);

  const isActive   = walk?.status === 'active';
  const isAssigned = walk?.status === 'assigned';

  // Elapsed timer (only when active)
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  // Wake lock
  useEffect(() => {
    if (!isActive) return;
    (async () => {
      try {
        if ('wakeLock' in navigator)
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch { /* unsupported */ }
    })();
    return () => { wakeLockRef.current?.release(); wakeLockRef.current = null; };
  }, [isActive]);

  // GPS + Supabase broadcast (only when active)
  useEffect(() => {
    if (!walkId || !isActive) return;
    const channel = supabase.channel(`walk-location-${walkId}`);
    channel.subscribe();
    channelRef.current = channel;
    if (!navigator.geolocation) { setGpsError(true); return; }

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const pt: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setMyPos(pt);
        setRoute(prev => [...prev, pt]);
        channel.send({ type: 'broadcast', event: 'location', payload: { lat: pt[0], lng: pt[1] } });
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(channel);
    };
  }, [walkId, isActive]);

  // Get current position for display even when not yet active
  useEffect(() => {
    if (isActive || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 8000 }
    );
  }, [isActive]);

  const handleEnd = () => {
    if (!walkId) return;
    const loc = myPos ? { lat: myPos[0], lng: myPos[1] } : { lat: LUSAKA[0], lng: LUSAKA[1] };
    endWalk(walkId, loc);
    navigate('/walker/walks');
  };

  const handleStart = async () => {
    if (!walkId) return;
    setStarting(true);
    const loc = myPos ? { lat: myPos[0], lng: myPos[1] } : { lat: LUSAKA[0], lng: LUSAKA[1] };
    startWalk(walkId, loc);
    setStarting(false);
  };

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const distKm = totalDistance(route);
  // Estimate: average walking speed with dog ~4 km/h
  const estMinPerKm = 15;
  const estTimeLeft = walk?.duration
    ? Math.max(0, walk.duration - Math.floor(elapsed / 60))
    : null;

  // Show the live walk page for both 'active' and 'assigned' statuses
  if (!walk || (walk.status !== 'active' && walk.status !== 'assigned')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
        <p className="text-ink-secondary">No walk found or walk is not in progress.</p>
        <button type="button" onClick={() => navigate('/walker/walks')} className="text-primary text-sm font-medium">
          ← Back to Walks
        </button>
      </div>
    );
  }

  const mapCenter = myPos ?? (walk.startLocation
    ? [walk.startLocation.lat, walk.startLocation.lng] as LatLng
    : LUSAKA);

  return (
    <div className="flex flex-col h-screen bg-ink">
      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3 shrink-0 z-[1001]">
        <button type="button" onClick={() => navigate('/walker/walks')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">{dog?.name ? `${dog.name}'s Walk` : 'Live Walk'}</p>
          <p className="text-xs text-ink-muted">Owner: {owner?.name || '—'}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${
          isActive
            ? 'bg-success/10 border border-success/30'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-amber-400'}`} />
          <span className={`text-xs font-semibold ${isActive ? 'text-success' : 'text-amber-600'}`}>
            {isActive ? 'LIVE' : 'READY'}
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapContainer
          center={mapCenter}
          zoom={16}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          <MapFollower pos={myPos} />
          {route.length > 1 && (
            <Polyline positions={route} pathOptions={{ color: '#2B8A50', weight: 5, opacity: 0.9 }} />
          )}
          {myPos && <Marker position={myPos} icon={walkerIcon} />}
        </MapContainer>

        {gpsError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-xl shadow font-semibold z-[1000]">
            GPS unavailable — location not being shared
          </div>
        )}
        {!gpsError && !myPos && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 text-ink text-xs px-3 py-1.5 rounded-xl shadow font-semibold z-[1000] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Getting your location…
          </div>
        )}

        {/* Estimation card (visible when active + has data) */}
        {isActive && (distKm > 0 || estTimeLeft !== null) && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur rounded-2xl shadow-lg px-4 py-3 z-[1000]">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold text-ink">{formatElapsed(elapsed)}</p>
                <p className="text-[10px] text-ink-muted">Elapsed</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold text-ink">{distKm < 1 ? `${(distKm * 1000).toFixed(0)}m` : `${distKm.toFixed(2)}km`}</p>
                <p className="text-[10px] text-ink-muted">Distance</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm font-bold text-ink">
                  {estTimeLeft !== null
                    ? estTimeLeft > 0 ? `~${estTimeLeft}m left` : 'Done'
                    : distKm > 0 ? `~${Math.round(distKm * estMinPerKm)}m` : '—'}
                </p>
                <p className="text-[10px] text-ink-muted">{estTimeLeft !== null ? 'Est. remaining' : 'Est. time'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="bg-white border-t border-surface-border px-4 py-4 flex gap-3 shrink-0 z-[1001]">
        {isAssigned && (
          <button type="button" onClick={handleStart} disabled={starting}
            className="flex items-center gap-2 flex-1 justify-center text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
            {starting ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Starting…</>
            ) : (
              <><span className="text-base">▶</span> Start Walk</>
            )}
          </button>
        )}
        {isActive && (
          <>
            {owner?.phone && (
              <a href={`tel:${owner.phone}`}
                className="flex items-center gap-2 flex-1 justify-center bg-primary-50 text-primary border border-primary/20 py-3 rounded-xl font-semibold text-sm hover:bg-primary/10 transition-colors">
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            <Link to={`/walker/chat/${walkId}`}
              className="flex items-center gap-2 flex-1 justify-center bg-surface-secondary text-ink border border-surface-border py-3 rounded-xl font-semibold text-sm hover:bg-surface-hover transition-colors">
              <MessageCircle className="w-4 h-4" />
              Chat
            </Link>
            <button type="button" onClick={handleEnd}
              className="flex items-center gap-2 flex-1 justify-center bg-danger text-white py-3 rounded-xl font-semibold text-sm hover:bg-danger/90 transition-colors">
              <Square className="w-4 h-4" />
              End
            </button>
          </>
        )}
      </div>
    </div>
  );
}
