import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Polyline, OverlayView, Marker } from '@react-google-maps/api';
import { ArrowLeft, MessageCircle, Phone, Navigation } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

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

export default function WalkTracker() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data } = useApp();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [livePos, setLivePos] = useState<google.maps.LatLngLiteral | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
  });

  const walk = data.walks.find(w => w.id === walkId);
  const dog = data.dogs.find(d => d.id === walk?.dogId);
  const walker = data.users.find(u => u.id === walk?.walkerId);

  useEffect(() => {
    if (walk?.status !== 'active') return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [walk?.status]);

  // Listen for walker's live position
  useEffect(() => {
    if (!walkId || walk?.status !== 'active') return;
    const channel = supabase
      .channel(`walk-location-${walkId}`)
      .on('broadcast', { event: 'location' }, ({ payload }) => {
        setLivePos({ lat: payload.lat, lng: payload.lng });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walkId, walk?.status]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (walk?.startLocation) {
      map.setCenter({ lat: walk.startLocation.lat, lng: walk.startLocation.lng });
      map.setZoom(15);
    }
  }, [walk?.startLocation]);

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

  const startLoc = walk.startLocation ? { lat: walk.startLocation.lat, lng: walk.startLocation.lng } : null;
  const endLoc = walk.endLocation ? { lat: walk.endLocation.lat, lng: walk.endLocation.lng } : null;
  const liveCenter = livePos || startLoc || LUSAKA_CENTER;
  const isActive = walk.status === 'active';
  const isCompleted = walk.status === 'completed';

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = (elapsed % 60).toString().padStart(2, '0');
  const durationDisplay = elapsed > 0
    ? `${elapsedMin}:${elapsedSec}`
    : walk.duration ? `${walk.duration} min` : '—';

  const routePath: google.maps.LatLngLiteral[] = [
    ...(startLoc ? [startLoc] : []),
    ...(livePos ? [livePos] : []),
    ...(endLoc && !isActive ? [endLoc] : []),
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-white shrink-0">
        <button type="button" onClick={() => navigate('/owner')}
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

      {/* Map */}
      <div className="flex-1 relative min-h-0">
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
        ) : !startLoc && !livePos ? (
          <div className="flex flex-col items-center justify-center h-full bg-surface-secondary gap-3 p-6 text-center">
            <span className="text-4xl">🗺️</span>
            <p className="text-sm text-ink-secondary">
              {walk.status === 'pending' || walk.status === 'assigned'
                ? 'Map tracking starts when the walker begins the walk'
                : 'No location data available'}
            </p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={liveCenter}
            zoom={15}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
          >
            {routePath.length > 1 && (
              <Polyline
                path={routePath}
                options={{ strokeColor: '#1B4332', strokeWeight: 5, strokeOpacity: 0.9 }}
              />
            )}

            {/* Start marker */}
            {startLoc && (
              <OverlayView position={startLoc} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{
                  width: 14, height: 14,
                  background: '#10b981',
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                  transform: 'translate(-50%,-50%)',
                }} />
              </OverlayView>
            )}

            {/* Live walker position */}
            {isActive && livePos && (
              <OverlayView position={livePos} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{
                  width: 48, height: 48,
                  background: '#1B4332',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '3px solid white',
                  boxShadow: '0 3px 14px rgba(0,0,0,0.4)',
                  fontSize: 22,
                  transform: 'translate(-50%,-50%)',
                }}>🐾</div>
              </OverlayView>
            )}

            {/* End marker */}
            {endLoc && (
              <Marker position={endLoc} />
            )}
          </GoogleMap>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-surface-border bg-white border-t border-surface-border shrink-0">
        {[
          { label: 'DISTANCE', value: '—' },
          { label: 'DURATION', value: durationDisplay },
          { label: 'STATUS', value: isActive ? 'Active' : isCompleted ? 'Done' : '—' },
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
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-colors"
            style={{ background: '#1B4332' }}>
            <Navigation className="w-4 h-4" /> Route
          </button>
        </div>
      </div>
    </div>
  );
}
