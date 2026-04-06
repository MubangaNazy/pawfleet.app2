import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, Clock, User, PawPrint, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { format, formatDistanceToNow } from 'date-fns';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Paw icon for walker position
const pawIcon = new L.DivIcon({
  html: `<div style="background:#6366f1;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🐾</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Start icon
const startIcon = new L.DivIcon({
  html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

export default function WalkTracker() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data } = useApp();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  const walk = data.walks.find(w => w.id === walkId);
  const dog = data.dogs.find(d => d.id === walk?.dogId);
  const walker = data.users.find(u => u.id === walk?.walkerId);

  // Tick elapsed time
  useEffect(() => {
    if (walk?.status !== 'active') return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [walk?.status]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!walk) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6">
        <PawPrint className="w-12 h-12 text-ink-muted" />
        <p className="text-ink-secondary text-center">Walk not found.</p>
        <button onClick={() => navigate('/owner')} className="text-primary text-sm font-medium">← Back to Dashboard</button>
      </div>
    );
  }

  const loc = walk.startLocation || { lat: -15.4167, lng: 28.2833 };
  const endLoc = walk.endLocation;
  const routePoints: [number, number][] = [
    [loc.lat, loc.lng],
    ...(endLoc ? [[endLoc.lat, endLoc.lng] as [number, number]] : []),
  ];
  const center: [number, number] = [loc.lat, loc.lng];

  const isActive = walk.status === 'active';
  const isCompleted = walk.status === 'completed';

  const statusColor = {
    active:    'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    pending:   'bg-amber-100 text-amber-700',
    assigned:  'bg-violet-100 text-violet-700',
    cancelled: 'bg-red-100 text-red-700',
  }[walk.status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="flex flex-col h-screen lg:h-auto lg:min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/owner')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-ink">
            {dog?.name}'s Walk
          </h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
            {walk.status}
          </span>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">LIVE</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1 lg:flex-none lg:h-72">
        {walk.startLocation ? (
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%', minHeight: '280px' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap center={center} />

            {/* Route line */}
            {routePoints.length > 1 && (
              <Polyline positions={routePoints} color="#6366f1" weight={4} opacity={0.8} />
            )}

            {/* Start marker */}
            <Marker position={[loc.lat, loc.lng]} icon={startIcon}>
              <Popup><p className="text-xs font-semibold">Walk started here</p></Popup>
            </Marker>

            {/* Walker position (paw) */}
            {isActive && (
              <Marker position={center} icon={pawIcon}>
                <Popup>
                  <p className="text-xs font-semibold">{walker?.name || 'Walker'}</p>
                  <p className="text-xs text-ink-muted">Currently here with {dog?.name}</p>
                </Popup>
              </Marker>
            )}

            {/* End marker */}
            {endLoc && (
              <Marker position={[endLoc.lat, endLoc.lng]}>
                <Popup><p className="text-xs font-semibold">Walk ended here</p></Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-surface-secondary min-h-[280px] gap-3">
            <MapPin className="w-10 h-10 text-ink-muted" />
            <p className="text-sm text-ink-secondary text-center">
              {walk.status === 'pending' || walk.status === 'assigned'
                ? 'Map tracking starts once the walker begins the walk'
                : 'No location data available'}
            </p>
          </div>
        )}
      </div>

      {/* Stats bar (active walk) */}
      {isActive && (
        <div className="bg-ink text-white grid grid-cols-3 divide-x divide-white/10 shrink-0">
          {[
            { icon: Clock,    label: 'Duration', value: formatElapsed(elapsed) },
            { icon: Activity, label: 'Distance',  value: '—' },
            { icon: Activity, label: 'Pace',      value: '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center py-4 gap-0.5">
              <Icon className="w-4 h-4 text-white/60 mb-1" />
              <span className="text-lg font-bold">{value}</span>
              <span className="text-white/60 text-[10px] uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Walk details card */}
      <div className="p-4 space-y-3 overflow-y-auto pb-24 lg:pb-6">
        {/* Walker info */}
        <div className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-muted">Your Walker</p>
            <p className="text-sm font-semibold text-ink">{walker?.name || 'Unassigned'}</p>
            {walker?.phone && <p className="text-xs text-ink-muted">{walker.phone}</p>}
          </div>
          {isActive && walker && (
            <a
              href={`tel:${walker.phone}`}
              className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-xl"
            >
              Call
            </a>
          )}
        </div>

        {/* Walk info */}
        <div className="bg-white border border-surface-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Walk Details</p>
          {[
            { label: 'Dog', value: `${dog?.name}${dog?.breed ? ` · ${dog.breed}` : ''}` },
            { label: 'Requested', value: format(new Date(walk.createdAt), 'MMM d, yyyy · h:mm a') },
            { label: 'Status', value: walk.status.charAt(0).toUpperCase() + walk.status.slice(1) },
            ...(walk.startTime ? [{ label: 'Started', value: format(new Date(walk.startTime), 'h:mm a') }] : []),
            ...(walk.endTime ? [{ label: 'Ended', value: format(new Date(walk.endTime), 'h:mm a') }] : []),
            ...(walk.duration ? [{ label: 'Duration', value: `${walk.duration} min` }] : []),
            { label: 'Walk Fee', value: `ZMW ${walk.price}` },
            ...(walk.notes ? [{ label: 'Instructions', value: walk.notes }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="text-xs text-ink-muted shrink-0">{label}</span>
              <span className="text-xs font-medium text-ink text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Completed state */}
        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-bold text-ink mb-1">Walk Complete!</p>
            <p className="text-xs text-ink-secondary">
              {dog?.name} had a great walk
              {walk.duration ? ` (${walk.duration} min)` : ''}.
            </p>
          </div>
        )}

        {/* Pending/assigned state */}
        {(walk.status === 'pending' || walk.status === 'assigned') && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-2">⏳</p>
            <p className="text-sm font-bold text-ink mb-1">
              {walk.status === 'pending' ? 'Awaiting Walker Assignment' : 'Walker Assigned — Walk Upcoming'}
            </p>
            <p className="text-xs text-ink-secondary">
              {walk.status === 'pending'
                ? 'Our team is assigning the best available walker for you.'
                : `${walker?.name} will arrive soon.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
