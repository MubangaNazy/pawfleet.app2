import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Polyline, OverlayView } from '@react-google-maps/api';
import { ArrowLeft, Phone, MessageCircle, Square, Navigation, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const LUSAKA_CENTER = { lat: -15.4167, lng: 28.2833 };
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

export default function WalkerLiveWalk() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data, endWalk } = useApp();
  const navigate = useNavigate();

  const [myPos, setMyPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [route, setRoute] = useState<google.maps.LatLngLiteral[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [gpsError, setGpsError] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isFirstCenter = useRef(true);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
  });

  const walk = data.walks.find(w => w.id === walkId);
  const dog = data.dogs.find(d => d.id === walk?.dogId);
  const owner = data.users.find(u => u.id === walk?.ownerId);

  // Elapsed ticker
  useEffect(() => {
    if (walk?.status !== 'active') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [walk?.status]);

  // Keep screen on
  useEffect(() => {
    if (walk?.status !== 'active') return;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator)
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch { /* unsupported */ }
    };
    acquire();
    return () => { wakeLockRef.current?.release(); wakeLockRef.current = null; };
  }, [walk?.status]);

  // GPS watch + Supabase broadcast
  useEffect(() => {
    if (!walkId || walk?.status !== 'active') return;
    const channel = supabase.channel(`walk-location-${walkId}`);
    channel.subscribe();
    channelRef.current = channel;
    if (!navigator.geolocation) { setGpsError(true); return; }

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos(pt);
        setRoute(prev => [...prev, pt]);
        channel.send({ type: 'broadcast', event: 'location', payload: pt });
        // Pan map to walker position
        if (mapRef.current) {
          if (isFirstCenter.current) {
            mapRef.current.setCenter(pt);
            mapRef.current.setZoom(17);
            isFirstCenter.current = false;
          } else {
            mapRef.current.panTo(pt);
          }
        }
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(channel);
    };
  }, [walkId, walk?.status]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleEnd = () => {
    if (!walkId) return;
    const loc = myPos || LUSAKA_CENTER;
    endWalk(walkId, loc);
    navigate('/walker/walks');
  };

  const center = myPos || (walk?.startLocation
    ? { lat: walk.startLocation.lat, lng: walk.startLocation.lng }
    : LUSAKA_CENTER);

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (!walk || walk.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
        <p className="text-ink-secondary">No active walk found.</p>
        <button type="button" onClick={() => navigate('/walker/walks')} className="text-primary text-sm font-medium">
          ← Back to Walks
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ink">
      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => navigate('/walker/walks')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink">{dog?.name}'s Walk</p>
          <p className="text-xs text-ink-muted">Owner: {owner?.name}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-success/10 border border-success/30 rounded-xl px-3 py-1.5">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-success">LIVE</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loadError || !MAPS_API_KEY ? (
          <div className="flex flex-col items-center justify-center h-full bg-surface-secondary gap-3 p-6 text-center">
            <span className="text-4xl">🗺️</span>
            <p className="text-sm text-ink-secondary font-medium">Google Maps not configured</p>
            <p className="text-xs text-ink-muted">Add VITE_GOOGLE_MAPS_API_KEY to your Vercel environment variables.</p>
          </div>
        ) : !isLoaded ? (
          <div className="flex items-center justify-center h-full bg-surface-secondary">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-ink-secondary">Loading map…</p>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={center}
            zoom={16}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
          >
            {route.length > 1 && (
              <Polyline
                path={route}
                options={{ strokeColor: '#2B8A50', strokeWeight: 5, strokeOpacity: 0.9 }}
              />
            )}
            {myPos && (
              <OverlayView position={myPos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{
                  width: 44, height: 44,
                  background: '#2B8A50',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid white',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
                  fontSize: 20,
                  transform: 'translate(-50%,-50%)',
                }}>🐾</div>
              </OverlayView>
            )}
          </GoogleMap>
        )}

        {gpsError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-xl shadow font-semibold z-[1000]">
            GPS unavailable — location not being shared
          </div>
        )}

        {isLoaded && !gpsError && !myPos && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 text-ink text-xs px-3 py-1.5 rounded-xl shadow font-semibold z-[1000] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Getting your location…
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="bg-ink text-white grid grid-cols-3 divide-x divide-white/10 shrink-0">
        {[
          { icon: Activity, label: 'Duration', value: formatElapsed(elapsed) },
          { icon: Navigation, label: 'Points', value: route.length.toString() },
          { icon: Activity, label: 'Status', value: 'Active' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center py-4 gap-0.5">
            <Icon className="w-4 h-4 text-white/50 mb-1" />
            <span className="text-base font-bold">{value}</span>
            <span className="text-white/50 text-[10px] uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="bg-white border-t border-surface-border px-4 py-4 flex gap-3 shrink-0">
        {owner?.phone && (
          <a href={`tel:${owner.phone}`}
            className="flex items-center gap-2 flex-1 justify-center bg-primary-50 text-primary border border-primary/20 py-3 rounded-xl font-semibold text-sm hover:bg-primary/10 transition-colors">
            <Phone className="w-4 h-4" />
            Call Owner
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
          End Walk
        </button>
      </div>
    </div>
  );
}
