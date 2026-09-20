import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, MessageCircle, Phone, Play } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import LiveRouteMap, { MapLine, MapMarker } from '../../components/map/LiveRouteMap';
import { useWalkRoom } from '../../lib/liveTracking';
import { locationSupported, watchLocation } from '../../lib/nativeLocation';
import { LatLng, LUSAKA, formatKm, haversineKm, isValidCoord } from '../../lib/geo';
import { getWalkingRoute, type PlannedRoute } from '../../lib/routing';
import GuidanceBanner from '../../components/map/GuidanceBanner';
import { useTurnByTurn } from '../../hooks/useTurnByTurn';
import { getVoicePref, setVoicePref, primeVoice, voiceSupported } from '../../lib/voice';

/**
 * Walker heads to the pickup. Shows a real walking route, follows the owner's live
 * position if they share it, and lets the owner watch the walker arrive.
 */
export default function WalkerNav() {
  const { walkId } = useParams<{ walkId: string }>();
  const navigate = useNavigate();
  const { data } = useApp();

  const walk = data.walks.find(w => w.id === walkId);
  const owner = data.users.find(u => u.id === walk?.ownerId);
  const dog = data.dogs.find(d => d.id === walk?.dogId);
  const pickup: LatLng | null = isValidCoord(walk?.startLocation?.lat, walk?.startLocation?.lng)
    ? [walk!.startLocation!.lat!, walk!.startLocation!.lng!] : null;
  const pickupAddress = walk?.startLocation?.address;

  const [myPos, setMyPos] = useState<LatLng | null>(null);
  const [ownerPos, setOwnerPos] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [fitTick, setFitTick] = useState(0);
  const [voiceOn, setVoiceOn] = useState(getVoicePref);

  const lastSentAt = useRef(0);
  const lastRouteFrom = useRef<LatLng | null>(null);
  const lastRouteKey = useRef('');
  const lastRouteAt = useRef(0);

  const { send } = useWalkRoom(walkId, {
    onOwnerPos: m => setOwnerPos([m.lat, m.lng]),
    onReady: () => send('hello'),
  });

  // Where to walk to: the owner's live position if they are sharing it, else the booked pickup point.
  const target: LatLng | null = ownerPos ?? pickup;

  // Track my GPS and let the owner watch me arrive.
  useEffect(() => {
    if (!locationSupported()) { setGpsError(true); return; }
    const stop = watchLocation(
      p => {
        const pos: LatLng = [p.coords.latitude, p.coords.longitude];
        setMyPos(pos);
        setGpsError(false);
        const now = Date.now();
        if (now - lastSentAt.current > 3000) {
          lastSentAt.current = now;
          send('walker-pos', { lat: pos[0], lng: pos[1] });
        }
      },
      () => setGpsError(true),
    );
    return stop;
  }, [send]);

  // Real walking route. Fetched once, and again only if the target moves (the owner is walking towards you).
  // Straying from the route is handled by the turn-by-turn guide, which re-routes on its own.
  useEffect(() => {
    if (!myPos || !target) return;
    const key = `${target[0].toFixed(4)},${target[1].toFixed(4)}`;
    const targetMoved = lastRouteFrom.current ? haversineKm(lastRouteFrom.current, target) : Infinity;
    if (lastRouteKey.current && targetMoved < 0.08) return;
    lastRouteKey.current = key;
    lastRouteFrom.current = target; // remember the target we routed to
    lastRouteAt.current = Date.now();
    getWalkingRoute(myPos, target).then(setRoute);
  }, [myPos, target?.[0], target?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const tbt = useTurnByTurn({
    route,
    pos: myPos,
    enabled: !!route && !!myPos,
    voice: voiceOn && voiceSupported(),
    mode: 'destination',
    sessionKey: walkId ?? '',
    startText: 'Heading to the pickup.',
    onRoute: setRoute,
  });

  const distKm = myPos && target ? (route ? tbt.remainingKm : haversineKm(myPos, target)) : null;
  const straightKm = myPos && target ? haversineKm(myPos, target) : null;
  const arrived = straightKm != null && straightKm < 0.06;

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = [];
    if (pickup) m.push({ id: 'pickup', lat: pickup[0], lng: pickup[1], kind: 'pickup', title: pickupAddress || 'Pickup' });
    if (ownerPos) m.push({ id: 'owner', lat: ownerPos[0], lng: ownerPos[1], kind: 'owner', live: true, title: `${owner?.name || 'Owner'} (live)` });
    if (myPos) m.push({ id: 'me', lat: myPos[0], lng: myPos[1], kind: 'me', title: 'You' });
    return m;
  }, [pickup?.[0], pickup?.[1], ownerPos, myPos, pickupAddress, owner?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines: MapLine[] = useMemo(
    () => (route && route.points.length > 1 ? [{ id: 'route', points: route.points, color: '#2B8A50', width: 5 }] : []),
    [route],
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0 z-[1001] border-b border-black/5"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-transform bg-[#F3F4F6]">
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Heading to pickup</p>
          <p className="text-sm font-bold text-ink truncate">{pickupAddress || (dog?.name ? `${dog.name}'s pickup` : 'Pickup location')}</p>
        </div>
        {distKm != null && (
          <div className="shrink-0 px-3 py-1.5 rounded-full bg-[#EBF5EF] text-right">
            <p className="text-xs font-bold" style={{ color: '#1B4332' }}>{formatKm(distKm)}</p>
            {route && <p className="text-[9px] text-ink-muted leading-none">{route.durationMin} min walk</p>}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <LiveRouteMap
          markers={markers}
          lines={lines}
          center={target ?? myPos ?? LUSAKA}
          zoom={14}
          fitKey={`${myPos ? 'me' : ''}|${target ? 't' : ''}|${fitTick}`}
          bottomPadding={40}
        />
        <button type="button" onClick={() => setFitTick(t => t + 1)} aria-label="Fit route"
          className="absolute bottom-3 right-3 z-[1000] w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center active:scale-95">
          <Crosshair className="w-5 h-5 text-ink" />
        </button>

        {route && (
          <GuidanceBanner className="absolute top-3 left-3 right-3 z-[1001]" tbt={tbt} voiceOn={voiceOn} voiceAvailable={voiceSupported()}
            onToggleVoice={() => { const n = !voiceOn; setVoiceOn(n); setVoicePref(n); if (n) primeVoice('Voice directions on'); }}
            endLabel="the pickup point" />
        )}

        {!target && (
          <div className="absolute inset-x-4 top-3 z-[1000] flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <span className="text-lg">🗺️</span>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              The owner typed an address we could not place on the map{pickupAddress ? ` (${pickupAddress})` : ''}. Message or call them for directions.
            </p>
          </div>
        )}
        {gpsError && (
          <div className="absolute inset-x-4 top-16 z-[1000] flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
            <span className="text-amber-600 text-lg">⚠️</span>
            <p className="text-xs text-amber-700 font-medium">Turn on GPS to see your position and route.</p>
          </div>
        )}
        {ownerPos && (
          <div className="absolute left-3 bottom-3 z-[1000] flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-bold text-ink">Following {owner?.name?.split(' ')[0] || 'owner'} live</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white border-t border-surface-border px-4 pt-3 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2">
          <Link to={`/walker/chat/${walkId}`}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#EBF5EF] shrink-0 active:scale-95" aria-label="Chat">
            <MessageCircle className="w-5 h-5" style={{ color: '#2B8A50' }} />
          </Link>
          {owner?.phone && (
            <a href={`tel:${owner.phone}`}
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#EBF5EF] shrink-0 active:scale-95" aria-label="Call owner">
              <Phone className="w-5 h-5" style={{ color: '#2B8A50' }} />
            </a>
          )}
          <button type="button" onClick={() => navigate(`/walker/live/${walkId}`)}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold text-white active:scale-[0.98]"
            style={{ background: arrived ? 'linear-gradient(135deg,#1B4332,#2B8A50)' : '#1B4332', boxShadow: arrived ? '0 0 0 4px rgba(43,138,80,0.25)' : undefined }}>
            <Play className="w-4 h-4" /> {arrived ? "I've arrived — start walk" : 'Go to walk screen'}
          </button>
        </div>
      </div>
    </div>
  );
}
