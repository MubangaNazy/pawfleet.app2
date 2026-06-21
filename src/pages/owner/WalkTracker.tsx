import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone, Navigation, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import MapLibreMap from '../../components/ui/MapLibreMap';

type LatLng = [number, number];
const LUSAKA: LatLng = [-15.4167, 28.2833];

const SHEET_PEEK  = 148; // px visible when collapsed (drag handle + stats bar)
const SHEET_FULL  = 320; // px visible when expanded

export default function WalkTracker() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data }   = useApp();
  const navigate   = useNavigate();
  const [elapsed, setElapsed]     = useState(0);
  const [livePos, setLivePos]     = useState<LatLng | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Drag state
  const dragStartY  = useRef<number | null>(null);
  const dragStartOpen = useRef(false);

  const walk   = data.walks.find(w => w.id === walkId);
  const dog    = data.dogs.find(d => d.id === walk?.dogId);
  const walker = data.users.find(u => u.id === walk?.walkerId);

  useEffect(() => {
    if (walk?.status !== 'active') return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [walk?.status]);

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

  const startLat    = walk.startLocation ? [walk.startLocation.lat, walk.startLocation.lng] as LatLng : null;
  const endLat      = walk.endLocation   ? [walk.endLocation.lat,   walk.endLocation.lng]   as LatLng : null;
  const isActive    = walk.status === 'active';
  const isCompleted = walk.status === 'completed';

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = (elapsed % 60).toString().padStart(2, '0');
  const durationDisplay = elapsed > 0
    ? `${elapsedMin}:${elapsedSec}`
    : walk.duration ? `${walk.duration} min` : '—';

  const displayPos = livePos
    ? { lat: livePos[0], lng: livePos[1] }
    : startLat
    ? { lat: startLat[0], lng: startLat[1] }
    : null;

  const sheetHeight = sheetOpen ? SHEET_FULL : SHEET_PEEK;

  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY;
    dragStartOpen.current = sheetOpen;
  };
  const handleDragEnd = (clientY: number) => {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - clientY;
    if (delta > 30) setSheetOpen(true);
    if (delta < -30) setSheetOpen(false);
    dragStartY.current = null;
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0 z-[1001]"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button type="button" onClick={() => navigate('/owner')} aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-2xl transition-colors active:scale-95"
          style={{ background: '#F3F4F6' }}>
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">PawFleet</p>
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

      {/* ── Map (fills remaining space above sheet) ── */}
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {!displayPos ? (
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
            <MapLibreMap
              lat={displayPos.lat}
              lng={displayPos.lng}
              endLat={endLat ? endLat[0] : undefined}
              endLng={endLat ? endLat[1] : undefined}
            />
          </div>
        )}

        {/* Waiting spinner */}
        {isActive && !livePos && displayPos && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/95 text-ink text-xs px-3 py-1.5 rounded-xl shadow font-semibold z-[1000] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Waiting for live location…
          </div>
        )}

        {/* ── Floating action chips ── */}
        <div className="absolute left-4 right-4 z-[1000] flex gap-2"
          style={{ bottom: sheetHeight + 12, transition: 'bottom 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
          <Link to={`/owner/chat/${walkId}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-sm font-bold text-ink"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.14)' }}>
            <MessageCircle className="w-4 h-4" /> Chat
          </Link>
          {walker?.phone && (
            <a href={`tel:${walker.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-sm font-bold text-ink"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.14)' }}>
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
        </div>
      </div>

      {/* ── Bottom Sheet ── */}
      <div
        className="relative bg-white shrink-0 z-[1002]"
        style={{
          height: sheetHeight,
          transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
        }}
      >
        {/* Drag handle */}
        <div
          className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={e => handleDragStart(e.clientY)}
          onMouseUp={e => handleDragEnd(e.clientY)}
          onTouchStart={e => handleDragStart(e.touches[0].clientY)}
          onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientY)}
          onClick={() => setSheetOpen(o => !o)}
        >
          <div className="w-10 h-1 rounded-full bg-gray-200" />
          <div className="absolute right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
            {sheetOpen
              ? <ChevronDown className="w-4 h-4 text-ink-muted" />
              : <ChevronUp className="w-4 h-4 text-ink-muted" />}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-surface-border pt-10">
          {[
            { label: 'DISTANCE', value: '—' },
            { label: 'DURATION', value: durationDisplay },
            { label: 'STATUS',   value: isActive ? 'Active' : isCompleted ? 'Done' : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-3 gap-0.5">
              <span className="text-[9px] font-bold text-ink-muted tracking-widest">{label}</span>
              <span className="text-lg font-extrabold text-ink">{value}</span>
            </div>
          ))}
        </div>

        {/* Walker info — visible only when expanded */}
        <div
          className="overflow-hidden"
          style={{
            opacity: sheetOpen ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: sheetOpen ? 'auto' : 'none',
          }}
        >
          <div className="px-4 pt-1 pb-2 border-t border-surface-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary-50 flex items-center justify-center shrink-0"
                style={{ border: '2px solid rgba(43,138,80,0.15)' }}>
                {walker?.imageUrl
                  ? <img src={walker.imageUrl} alt={walker.name} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                      <span className="text-lg font-bold text-white">{walker?.name?.[0] || '?'}</span>
                    </div>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{walker?.name || 'Your walker'}</p>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                  {walk.startLocation?.address && (
                    <span className="truncate">📍 {walk.startLocation.address}</span>
                  )}
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
          </div>

          {/* Sticky CTA */}
          <div className="px-4 pt-2 pb-6">
            <Link to={`/owner/track/${walkId}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-sm active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <Navigation className="w-4 h-4" />
              {isActive ? 'Live Route' : 'View Route'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
