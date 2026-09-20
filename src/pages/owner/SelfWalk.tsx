import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Pause, ChevronRight, Map as MapIcon, Loader2, RefreshCw, Volume2, VolumeX, Navigation } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Dog } from '../../types';
import LiveRouteMap from '../../components/map/LiveRouteMap';
import GuidanceBanner from '../../components/map/GuidanceBanner';
import { useTurnByTurn } from '../../hooks/useTurnByTurn';
import { useMyLocation } from '../../hooks/useMyLocation';
import { LOOP_DIRECTIONS, loopBearing, planLoopRoute, type PlannedRoute } from '../../lib/routing';
import { LatLng, formatKm, haversineKm } from '../../lib/geo';
import { getVoicePref, primeVoice, setVoicePref, stopSpeaking, voiceSupported } from '../../lib/voice';

// ── Formatting helpers ───────────────────────────────────────
function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

function pace(m: number, secs: number): string {
  if (m < 10 || secs < 10) return '—';
  const minPer1k = secs / 60 / (m / 1000);
  const mins = Math.floor(minPer1k);
  const s = Math.round((minPer1k - mins) * 60);
  return `${mins}:${String(s).padStart(2, '0')} /km`;
}

type Phase = 'select' | 'active' | 'summary';
type Mode = 'route' | 'free';

const MINUTES = [20, 30, 45, 60] as const;

// Hero images
const HERO_WALK  = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80'; // person walking dog on sunny path
const HERO_IMG   = 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=900&q=80'; // summary fallback

export default function SelfWalk() {
  const { data, currentUser, createWalk } = useApp();
  const navigate = useNavigate();
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const savedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedDog, setSelectedDog] = useState<Dog | null>(myDogs[0] ?? null);
  const [elapsed, setElapsed] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gpsNote, setGpsNote] = useState('');
  const [trail, setTrail] = useState<LatLng[]>([]);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);

  // Route planning
  const loc = useMyLocation(true);
  const [mode, setMode] = useState<Mode>('route');
  const [minutes, setMinutes] = useState<number>(30);
  const [routeOption, setRouteOption] = useState(0);
  const [preview, setPreview] = useState<PlannedRoute | null>(null);
  const [planning, setPlanning] = useState(false);
  const [activeRoute, setActiveRoute] = useState<PlannedRoute | null>(null);
  const [sessionKey, setSessionKey] = useState('self-0');
  const [voiceOn, setVoiceOn] = useState(getVoicePref);
  const [overview, setOverview] = useState(false);
  const [overviewTick, setOverviewTick] = useState(0);

  const timerRef   = useRef<number | null>(null);
  const watchRef   = useRef<number | null>(null);
  const lastPosRef = useRef<LatLng | null>(null);
  const pausedRef  = useRef(false);
  const distRef    = useRef(0);
  const wakeRef    = useRef<WakeLockSentinel | null>(null);

  // The dog list arrives a moment after the page: pick the first one when it does.
  useEffect(() => { if (!selectedDog && myDogs[0]) setSelectedDog(myDogs[0]); }, [myDogs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const posKey = loc.pos ? `${loc.pos[0].toFixed(3)},${loc.pos[1].toFixed(3)}` : '';

  // Plan a loop from wherever the owner is standing. Changes to length or direction re-plan.
  useEffect(() => {
    if (phase !== 'select' || mode !== 'route' || !loc.pos) { setPreview(null); setPlanning(false); return; }
    const start = loc.pos;
    const ctrl = new AbortController();
    setPlanning(true);
    setPreview(null);
    const t = setTimeout(() => {
      planLoopRoute(start, minutes, posKey, { bearing: loopBearing(posKey, routeOption), signal: ctrl.signal })
        .then(r => { if (!ctrl.signal.aborted) { setPreview(r); setPlanning(false); } })
        .catch(() => { if (!ctrl.signal.aborted) setPlanning(false); });
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [phase, mode, minutes, routeOption, posKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const tbt = useTurnByTurn({
    route: activeRoute,
    pos: currentPos,
    enabled: phase === 'active' && !paused && mode === 'route' && !!activeRoute,
    voice: voiceOn && voiceSupported(),
    mode: 'loop',
    sessionKey,
    startText: `Starting your ${minutes} minute walk with ${selectedDog?.name ?? 'your dog'}.`,
    onRoute: setActiveRoute,
  });

  const stopAll = useCallback(() => {
    if (timerRef.current)  clearInterval(timerRef.current);
    if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
    timerRef.current = null;
    watchRef.current = null;
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  }, []);

  useEffect(() => () => { stopAll(); stopSpeaking(); }, [stopAll]);

  const handleStart = () => {
    setElapsed(0);
    setDistanceM(0);
    setTrail([]);
    setCurrentPos(null);
    setOverview(false);
    lastPosRef.current = null;
    distRef.current = 0;
    pausedRef.current = false;
    savedRef.current = false;
    setPaused(false);
    setGpsNote('');
    setActiveRoute(mode === 'route' ? preview : null);
    setSessionKey(`self-${Date.now()}`);
    setPhase('active');
    if (voiceOn && voiceSupported()) primeVoice('Voice directions on');

    // Keep the screen awake so GPS and voice keep working while the phone is in your hand or pocket.
    (navigator as any).wakeLock?.request?.('screen').then((s: WakeLockSentinel) => { wakeRef.current = s; }).catch(() => {});

    timerRef.current = window.setInterval(() => {
      if (!pausedRef.current) setElapsed(e => e + 1);
    }, 1000);

    if (!navigator.geolocation) {
      setGpsNote('GPS not available — time tracking only');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ll: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(ll);
        if (pausedRef.current) return;
        if (lastPosRef.current) {
          const d = haversineKm(lastPosRef.current, ll) * 1000;
          if (d > 3 && d < 200) {
            distRef.current += d;
            setDistanceM(distRef.current);
            setTrail(pts => [...pts, ll]);
          }
        } else {
          setTrail([ll]);
        }
        lastPosRef.current = ll;
      },
      () => setGpsNote('GPS signal weak — distance may be approximate'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handlePause = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    if (next) stopSpeaking();
  };

  const handleStop = () => {
    stopAll();
    stopSpeaking();
    setPhase('summary');
    // Save completed self-walk to Supabase (once only)
    if (!savedRef.current && currentUser && selectedDog) {
      savedRef.current = true;
      const cal = Math.round(distRef.current / 1000 * 4.5 + 1);
      const endISO = new Date().toISOString();
      const startISO = new Date(Date.now() - elapsed * 1000).toISOString();
      createWalk({
        dogId: selectedDog.id,
        ownerId: currentUser.id,
        status: 'completed',
        scheduledDate: endISO,
        startTime: startISO,
        endTime: endISO,
        duration: Math.max(1, Math.round(elapsed / 60)),
        price: 0,
        walkerEarning: 0,
        routePoints: trail.length > 1 ? trail : undefined,
        notes: `SELF_WALK:distance=${Math.round(distRef.current)},calories=${cal}`,
      });
    }
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setVoicePref(next);
    if (next) primeVoice('Voice directions on');
  };

  const routeLines = useMemo(() => {
    const src = phase === 'select' ? preview : activeRoute;
    return src ? [{ id: 'plan', points: src.points, color: '#52B788', width: 6, dashed: phase === 'active' }] : [];
  }, [phase, preview, activeRoute]);

  // ── SELECT phase ──────────────────────────────────────────────
  if (phase === 'select') {
    const turns = preview?.maneuvers?.filter(m => m.type >= 7).length ?? 0;
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F8FAF9' }}>

        {/* Hero banner — real photo with dark overlay */}
        <div className="relative overflow-hidden shrink-0" style={{ minHeight: 240 }}>
          <img src={HERO_WALK} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.45)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(7,26,14,0.3) 0%, rgba(7,26,14,0.75) 100%)' }} />

          <button onClick={() => navigate(-1)}
            className="absolute top-5 left-4 z-10 w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="absolute top-5 left-0 right-0 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[11px] font-bold text-white/90 uppercase tracking-widest">Guided walks with voice</p>
            </div>
          </div>

          <div className="px-5 pt-16 pb-8 flex items-end gap-5">
            <svg width="100" height="90" viewBox="0 0 100 90" fill="none" style={{ flexShrink: 0 }}>
              <ellipse cx="50" cy="87" rx="46" ry="3.5" fill="rgba(0,0,0,0.2)" />
              <ellipse cx="22" cy="5" rx="8" ry="7" fill="rgba(255,255,255,0.85)" />
              <circle cx="22" cy="17" r="8" fill="rgba(255,255,255,0.95)" />
              <path d="M14 27 Q16 24 22 25 Q28 24 30 27 L32 48 Q22 52 12 48 Z" fill="rgba(255,255,255,0.92)" />
              <line x1="15" y1="32" x2="8" y2="46" stroke="rgba(255,255,255,0.9)" strokeWidth="6" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="15 15 32;-15 15 32;15 15 32" dur="0.75s" repeatCount="indefinite" />
              </line>
              <line x1="29" y1="32" x2="36" y2="46" stroke="rgba(255,255,255,0.9)" strokeWidth="6" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="-15 29 32;15 29 32;-15 29 32" dur="0.75s" repeatCount="indefinite" />
              </line>
              <line x1="18" y1="48" x2="14" y2="74" stroke="rgba(255,255,255,0.9)" strokeWidth="7" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="-20 18 48;20 18 48;-20 18 48" dur="0.75s" repeatCount="indefinite" />
              </line>
              <line x1="26" y1="48" x2="30" y2="74" stroke="rgba(255,255,255,0.9)" strokeWidth="7" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="20 26 48;-20 26 48;20 26 48" dur="0.75s" repeatCount="indefinite" />
              </line>
              <path d="M36 46 Q60 30 72 54" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <ellipse cx="80" cy="68" rx="16" ry="9" fill="rgba(255,255,255,0.92)" />
              <path d="M88 60 Q92 62 92 68" stroke="rgba(255,255,255,0.92)" strokeWidth="7" strokeLinecap="round" fill="none" />
              <ellipse cx="91" cy="55" rx="9" ry="8" fill="rgba(255,255,255,0.92)" />
              <path d="M93 47 Q98 43 99 51 Q98 58 93 57 Q88 56 88 52 Z" fill="rgba(255,255,255,0.72)" />
              <ellipse cx="97" cy="57" rx="6" ry="4" fill="rgba(255,255,255,0.92)" />
              <circle cx="93" cy="51" r="2" fill="rgba(8,38,22,0.7)" />
              <path d="M64 64 Q58 55 61 47" stroke="rgba(255,255,255,0.9)" strokeWidth="3.5" strokeLinecap="round" fill="none">
                <animateTransform attributeName="transform" type="rotate" values="-18 64 64;24 64 64;-18 64 64" dur="0.45s" repeatCount="indefinite" />
              </path>
              <line x1="84" y1="76" x2="82" y2="88" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="-16 84 76;16 84 76;-16 84 76" dur="0.75s" repeatCount="indefinite" />
              </line>
              <line x1="90" y1="76" x2="92" y2="88" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="16 90 76;-16 90 76;16 90 76" dur="0.75s" repeatCount="indefinite" />
              </line>
              <line x1="70" y1="76" x2="67" y2="88" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="16 70 76;-16 70 76;16 70 76" dur="0.75s" repeatCount="indefinite" />
              </line>
              <line x1="76" y1="76" x2="78" y2="88" stroke="rgba(255,255,255,0.9)" strokeWidth="5" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" values="-16 76 76;16 76 76;-16 76 76" dur="0.75s" repeatCount="indefinite" />
              </line>
            </svg>

            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Your Personal Walk</p>
              <h1 className="text-white font-extrabold leading-tight" style={{ fontSize: 26 }}>Walk with<br />my dog</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 pt-4 pb-10 space-y-5">
          {myDogs.length === 0 ? (
            <div className="rounded-3xl p-8 text-center border border-surface-border bg-white">
              <p className="text-4xl mb-3">🐾</p>
              <p className="font-bold text-ink">No pets registered yet</p>
              <p className="text-sm text-ink-muted mt-1 mb-5">Add your dog first to track your walks</p>
              <button onClick={() => navigate('/owner/dogs')}
                className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                Add a Dog
              </button>
            </div>
          ) : (
            <>
              {/* Dog selector */}
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2.5">Who are you walking with?</p>
                <div className="space-y-2">
                  {myDogs.map(dog => {
                    const on = selectedDog?.id === dog.id;
                    return (
                      <button key={dog.id} type="button" onClick={() => setSelectedDog(dog)}
                        className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 text-left transition-all bg-white ${on ? 'border-primary' : 'border-surface-border hover:border-primary/30'}`}
                        style={on ? { boxShadow: '0 0 0 3px rgba(43,138,80,0.12)' } : {}}>
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-2xl"
                          style={{ background: '#EBF5EF' }}>
                          {dog.imageUrl
                            ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                            : <span>{dog.animalType === 'cat' ? '🐈' : '🐕'}</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-extrabold text-ink">{dog.name}</p>
                          {dog.breed && <p className="text-xs text-ink-muted">{dog.breed}</p>}
                          {dog.age ? (
                            <p className="text-xs text-ink-muted">
                              {dog.age < 1 ? `${Math.round(dog.age * 12)} months old` : `${dog.age} yr${dog.age !== 1 ? 's' : ''} old`}
                            </p>
                          ) : null}
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${on ? 'opacity-100' : 'opacity-0'}`}
                          style={{ background: '#2B8A50' }}>
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Route */}
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2.5">How do you want to walk?</p>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white border border-surface-border mb-3">
                  {([['route', '🧭 Guided route'], ['free', '🚶 Free walk']] as const).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setMode(key)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all ${mode === key ? 'text-white shadow' : 'text-ink-muted'}`}
                      style={mode === key ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'free' && (
                  <p className="text-xs text-ink-muted bg-white rounded-2xl border border-surface-border px-4 py-3 leading-relaxed">
                    Walk wherever you like. PawFleet tracks your time, distance and route on the map.
                  </p>
                )}

                {mode === 'route' && (
                  <div className="bg-white rounded-3xl border border-surface-border overflow-hidden">
                    <div className="p-4 pb-3">
                      <p className="text-xs font-bold text-ink mb-2">How long?</p>
                      <div className="grid grid-cols-4 gap-2">
                        {MINUTES.map(m => (
                          <button key={m} type="button" onClick={() => setMinutes(m)}
                            className={`py-3 rounded-2xl text-center transition-all ${minutes === m ? 'text-white shadow-md' : 'bg-[#F4F9F6] text-ink border border-[#DDE9E2]'}`}
                            style={minutes === m ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
                            <span className="block text-base font-extrabold leading-none">{m}</span>
                            <span className={`block text-[10px] font-semibold mt-0.5 ${minutes === m ? 'opacity-75' : 'text-ink-muted'}`}>min</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Map preview */}
                    <div className="relative h-52 bg-[#EBF5EF]">
                      {loc.pos ? (
                        <LiveRouteMap
                          markers={[{ id: 'start', lat: loc.pos[0], lng: loc.pos[1], kind: 'pickup', title: 'Start and finish' }]}
                          lines={routeLines}
                          center={loc.pos}
                          zoom={14}
                          fitKey={`${preview ? preview.points.length : 0}|${minutes}|${routeOption}`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                          {loc.status === 'asking'
                            ? <><Loader2 className="w-6 h-6 text-primary animate-spin" /><p className="text-xs text-ink-muted">Finding your location…</p></>
                            : <>
                                <p className="text-sm font-bold text-ink">We need your location to plan a route</p>
                                <button type="button" onClick={loc.request}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#1B4332' }}>
                                  Use my location
                                </button>
                                <p className="text-[11px] text-ink-muted">Or choose Free walk above.</p>
                              </>}
                        </div>
                      )}
                      {planning && loc.pos && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/95 rounded-full px-3 py-1.5 shadow text-[11px] font-semibold text-ink">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Planning your route…
                        </div>
                      )}
                    </div>

                    {/* Route facts */}
                    <div className="p-4 space-y-3">
                      {preview ? (
                        <>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-2xl bg-[#F4F9F6] py-2.5"><p className="text-base font-extrabold text-ink">{preview.distanceKm.toFixed(1)} km</p><p className="text-[10px] text-ink-muted">Distance</p></div>
                            <div className="rounded-2xl bg-[#F4F9F6] py-2.5"><p className="text-base font-extrabold text-ink">~{preview.durationMin} min</p><p className="text-[10px] text-ink-muted">Walking time</p></div>
                            <div className="rounded-2xl bg-[#F4F9F6] py-2.5"><p className="text-base font-extrabold text-ink">{turns}</p><p className="text-[10px] text-ink-muted">Turns</p></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-ink-secondary">{LOOP_DIRECTIONS[routeOption]}</p>
                            <button type="button" onClick={() => setRouteOption(o => (o + 1) % LOOP_DIRECTIONS.length)}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl" style={{ color: '#2B8A50', background: '#EBF5EF' }}>
                              <RefreshCw className="w-3.5 h-3.5" /> Try another route
                            </button>
                          </div>
                          {preview.source === 'approx' && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
                              Street directions are not available right now, so this is an approximate loop. You can still follow the line and hear the time and distance updates.
                            </p>
                          )}
                        </>
                      ) : (
                        !planning && loc.pos && <p className="text-xs text-ink-muted text-center">We could not plan a route here. Try again or choose Free walk.</p>
                      )}

                      {/* Voice */}
                      <button type="button" onClick={toggleVoice} disabled={!voiceSupported()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-surface-border bg-white disabled:opacity-50 text-left">
                        {voiceOn && voiceSupported() ? <Volume2 className="w-5 h-5" style={{ color: '#2B8A50' }} /> : <VolumeX className="w-5 h-5 text-ink-muted" />}
                        <div className="flex-1">
                          <p className="text-sm font-bold text-ink">Voice directions</p>
                          <p className="text-[11px] text-ink-muted">{voiceSupported() ? 'Says "turn left" and "turn right" as you walk' : 'Your browser cannot speak directions'}</p>
                        </div>
                        <span className={`w-11 h-6 rounded-full relative transition-colors ${voiceOn && voiceSupported() ? 'bg-primary' : 'bg-surface-border'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${voiceOn && voiceSupported() ? 'left-[22px]' : 'left-0.5'}`} />
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleStart} disabled={!selectedDog || (mode === 'route' && !preview)}
                className="w-full h-16 rounded-3xl text-white font-extrabold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)', boxShadow: '0 12px 32px rgba(27,67,50,0.32)' }}>
                <Play className="w-6 h-6 fill-white" />
                {mode === 'route' ? `Start ${minutes} min walk` : 'Start Walk'}
                <ChevronRight className="w-5 h-5 opacity-70" />
              </button>
              {mode === 'route' && !preview && <p className="text-center text-xs text-ink-muted -mt-3">{planning ? 'Planning your route…' : 'Waiting for your location'}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── ACTIVE phase ──────────────────────────────────────────────
  if (phase === 'active') {
    const routeMode = mode === 'route' && !!activeRoute;
    const pct = tbt.guide && tbt.guide.totalKm > 0 ? Math.min(100, Math.round((tbt.progressKm / tbt.guide.totalKm) * 100)) : 0;
    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: paused
          ? 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(160deg, #071a0e 0%, #0d2a1a 55%, #1B4332 100%)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
          <button onClick={() => { if (window.confirm('Stop this walk?')) handleStop(); }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">
              {paused ? '⏸ Paused' : '🟢 In Progress'}
            </p>
            {selectedDog && <p className="text-white font-bold text-sm mt-0.5">{selectedDog.name}</p>}
          </div>
          <div className="w-10 flex items-center justify-end">
            <MapIcon className="w-5 h-5 text-green-400/60" />
          </div>
        </div>

        {/* Live Map with turn-by-turn on top */}
        <div className="relative shrink-0 mx-4 rounded-3xl overflow-hidden" style={{ height: '46vh', border: '1px solid rgba(255,255,255,0.08)' }}>
          <LiveRouteMap
            markers={[
              ...(activeRoute ? [{ id: 'start', lat: activeRoute.points[0][0], lng: activeRoute.points[0][1], kind: 'pickup' as const }] : []),
              ...(currentPos ? [{ id: 'me', lat: currentPos[0], lng: currentPos[1], kind: 'dog' as const, live: !paused }] : []),
            ]}
            lines={[
              ...routeLines,
              ...(trail.length > 1 ? [{ id: 'trail', points: trail, color: '#1B4332', width: 4 }] : []),
            ]}
            center={currentPos ?? activeRoute?.points[0] ?? [-15.4167, 28.2833]}
            zoom={16}
            follow={overview || !currentPos ? null : currentPos}
            fitKey={overview ? overviewTick : undefined}
          />
          {routeMode && (
            <GuidanceBanner className="absolute top-3 left-3 right-3 z-[1001]" tbt={tbt} voiceOn={voiceOn} voiceAvailable={voiceSupported()}
              onToggleVoice={toggleVoice} endLabel="where you started" />
          )}
          <div className="absolute left-3 bottom-3 z-[1000] flex gap-2">
            <button type="button" onClick={() => { setOverview(true); setOverviewTick(t => t + 1); }}
              className="h-9 px-3 rounded-2xl bg-white shadow-lg text-[11px] font-bold text-ink active:scale-95">Whole route</button>
            {overview && (
              <button type="button" onClick={() => setOverview(false)}
                className="h-9 px-3 rounded-2xl text-white shadow-lg text-[11px] font-bold active:scale-95 flex items-center gap-1"
                style={{ background: '#1B4332' }}><Navigation className="w-3 h-3" /> Follow me</button>
            )}
          </div>
        </div>

        {gpsNote && <p className="text-yellow-400/80 text-xs font-medium text-center mt-2 px-4">{gpsNote}</p>}

        {/* Timer + Stats */}
        <div className="flex-1 flex flex-col justify-center px-5 gap-3 mt-2">
          <div className="flex items-center justify-center gap-3">
            {!paused && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            <p style={{ fontSize: 52, fontWeight: 900, color: 'white', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.04em' }}>
              {fmtTime(elapsed)}
            </p>
          </div>

          {routeMode && (
            <div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#52B788' }} />
              </div>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mt-1 text-center">
                {pct}% of route · {formatKm(tbt.remainingKm)} to go
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Distance', value: fmtDist(distanceM) },
              { label: 'Pace',     value: pace(distanceM, elapsed) },
              { label: 'Calories', value: `~${Math.round(distRef.current / 1000 * 4.5 + 1)} kcal` },
            ].map(s => (
              <div key={s.label} className="py-3 rounded-2xl text-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-base font-black text-white tabular-nums leading-none">{s.value}</p>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-wide mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 pb-10 space-y-3 shrink-0">
          <button onClick={handlePause}
            className="w-full py-4 rounded-3xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: paused ? 'rgba(82,183,136,0.18)' : 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${paused ? '#52B788' : 'rgba(255,255,255,0.12)'}`,
              color: paused ? '#52B788' : 'rgba(255,255,255,0.75)' }}>
            {paused ? <><Play className="w-4 h-4 fill-current" /> Resume Walk</> : <><Pause className="w-4 h-4" /> Pause</>}
          </button>
          <button onClick={handleStop}
            className="w-full py-4 rounded-3xl font-extrabold text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: tbt.arrived ? 'linear-gradient(135deg, #2B8A50, #1B4332)' : 'linear-gradient(135deg, #DC2626, #991B1B)', boxShadow: '0 6px 20px rgba(0,0,0,0.3)' }}>
            <Square className="w-4 h-4 fill-white" /> {tbt.arrived ? 'Finish walk' : 'Finish Walk'}
          </button>
        </div>
      </div>
    );
  }

  // ── SUMMARY phase ─────────────────────────────────────────────
  const calories = Math.round(elapsed / 60 * 4.5);

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Hero */}
      <div className="relative shrink-0" style={{ height: 240 }}>
        {selectedDog?.imageUrl ? (
          <img src={selectedDog.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(7,26,14,0.88) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 text-center">
          <p className="text-white/60 text-sm font-semibold mb-1">Walk complete!</p>
          <p className="text-white text-2xl font-extrabold">
            {selectedDog?.name ?? 'Your dog'} did great 🐾
          </p>
        </div>
      </div>

      {/* Stats card */}
      <div className="mx-4 -mt-5 bg-white rounded-3xl shadow-xl overflow-hidden border border-surface-border">
        <div className="grid grid-cols-2 divide-x divide-surface-border border-b border-surface-border">
          {[
            { label: 'Duration', value: fmtTime(elapsed), icon: '⏱️' },
            { label: 'Distance', value: fmtDist(distanceM), icon: '📍' },
          ].map(s => (
            <div key={s.label} className="py-5 text-center">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-xl font-extrabold text-ink tabular-nums">{s.value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 divide-x divide-surface-border">
          {[
            { label: 'Avg Pace', value: pace(distanceM, elapsed), icon: '🏃' },
            { label: 'Est. Calories', value: `~${calories} kcal`, icon: '🔥' },
          ].map(s => (
            <div key={s.label} className="py-5 text-center">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-xl font-extrabold text-ink tabular-nums">{s.value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Your route */}
      {trail.length > 1 && (
        <div className="mx-4 mt-4 rounded-3xl overflow-hidden border border-surface-border relative" style={{ height: 200 }}>
          <LiveRouteMap
            markers={[{ id: 'start', lat: trail[0][0], lng: trail[0][1], kind: 'pickup' }, { id: 'end', lat: trail[trail.length - 1][0], lng: trail[trail.length - 1][1], kind: 'dog' }]}
            lines={[{ id: 'trail', points: trail, color: '#2B8A50', width: 5 }]}
            fitKey={trail.length}
          />
        </div>
      )}

      {/* Tips */}
      <div className="mx-4 mt-4 p-5 rounded-3xl border border-surface-border space-y-2.5">
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Great job! 🎉</p>
        {[
          distanceM >= 1000
            ? `You walked over ${Math.floor(distanceM / 1000)} km with ${selectedDog?.name ?? 'your dog'}!`
            : `Every walk counts — ${selectedDog?.name ?? 'your dog'} loved it!`,
          'Daily walks improve your dog\'s mental health and behaviour.',
          'Book a professional walker for longer or midday walks.',
        ].map(tip => (
          <div key={tip} className="flex items-start gap-2">
            <span className="text-primary shrink-0 mt-0.5">•</span>
            <p className="text-sm text-ink-secondary">{tip}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 mt-5 pb-14 space-y-3">
        <button onClick={() => { setPhase('select'); setElapsed(0); setDistanceM(0); setTrail([]); }}
          className="w-full py-4 rounded-3xl text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.28)' }}>
          <Play className="w-4 h-4 fill-white" /> Walk Again
        </button>
        <button onClick={() => navigate('/owner')}
          className="w-full py-4 rounded-3xl font-bold text-sm border border-surface-border text-ink-secondary bg-white">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
