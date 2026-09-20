import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, Pause, MapPin, ChevronRight, Map as MapIcon } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useApp } from '../../context/AppContext';
import type { Dog } from '../../types';

// ── Geo helpers ──────────────────────────────────────────────
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371e3;
  const r = (d: number) => d * Math.PI / 180;
  const dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

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

// Hero images
const HERO_WALK  = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80'; // person walking dog on sunny path
const HERO_IMG   = 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=900&q=80'; // summary fallback

// ── Live Route Map ────────────────────────────────────────────
interface LiveRouteMapProps {
  routePoints: [number, number][]; // [lng, lat]
  currentPos:  [number, number] | null;
  paused: boolean;
}

function LiveRouteMap({ routePoints, currentPos, paused }: LiveRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm-tiles' }],
      },
      center: currentPos ?? [28.2833, -15.4166], // default: Lusaka
      zoom: 16,
      attributionControl: false,
      interactive: true,
    });

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2B8A50', 'line-width': 5, 'line-opacity': 0.9 },
      });
    });

    // Blue dot marker
    const el = document.createElement('div');
    el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2B8A50;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)';
    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(currentPos ?? [28.2833, -15.4166])
      .addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line

  // Update route line whenever routePoints changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routePoints } });
  }, [routePoints]);

  // Pan to current position
  useEffect(() => {
    if (!currentPos || !mapRef.current) return;
    markerRef.current?.setLngLat(currentPos);
    if (!paused) mapRef.current.easeTo({ center: currentPos, duration: 600 });
  }, [currentPos, paused]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      {/* Dark overlay top-left corner attribution */}
      <div style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 9, color: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }}>
        © OpenStreetMap
      </div>
    </div>
  );
}

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
  const [routeLen, setRouteLen] = useState(0);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);

  const timerRef   = useRef<number | null>(null);
  const watchRef   = useRef<number | null>(null);
  const lastPosRef = useRef<[number, number] | null>(null);
  const pausedRef  = useRef(false);
  const distRef    = useRef(0);

  const stopAll = useCallback(() => {
    if (timerRef.current)  clearInterval(timerRef.current);
    if (watchRef.current !== null) navigator.geolocation?.clearWatch(watchRef.current);
    timerRef.current = null;
    watchRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const handleStart = () => {
    setElapsed(0);
    setDistanceM(0);
    setRouteLen(0);
    setRoutePoints([]);
    setCurrentPos(null);
    lastPosRef.current = null;
    distRef.current = 0;
    pausedRef.current = false;
    savedRef.current = false;
    setPaused(false);
    setGpsNote('');
    setPhase('active');

    timerRef.current = window.setInterval(() => {
      if (!pausedRef.current) setElapsed(e => e + 1);
    }, 1000);

    if (!navigator.geolocation) {
      setGpsNote('GPS not available — time tracking only');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // [lng, lat] for MapLibre
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        const latLng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setCurrentPos(lngLat);
        if (pausedRef.current) return;
        if (lastPosRef.current) {
          const d = haversine(lastPosRef.current, latLng);
          if (d > 3 && d < 200) {
            distRef.current += d;
            setDistanceM(distRef.current);
            setRouteLen(n => n + 1);
            setRoutePoints(pts => [...pts, lngLat]);
          }
        } else {
          setRoutePoints([lngLat]);
        }
        lastPosRef.current = latLng;
      },
      () => setGpsNote('GPS signal weak — distance may be approximate'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handlePause = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
  };

  const handleStop = () => {
    stopAll();
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
        notes: `SELF_WALK:distance=${Math.round(distRef.current)},calories=${cal}`,
      });
    }
  };

  // ── SELECT phase ──────────────────────────────────────────────
  if (phase === 'select') return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAF9' }}>

      {/* Hero banner — real photo with dark overlay */}
      <div className="relative overflow-hidden shrink-0" style={{ minHeight: 240 }}>
        <img src={HERO_WALK} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.45)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(7,26,14,0.3) 0%, rgba(7,26,14,0.75) 100%)' }} />

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="absolute top-5 left-4 z-10 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Label */}
        <div className="absolute top-5 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[11px] font-bold text-white/90 uppercase tracking-widest">Live GPS Tracking</p>
          </div>
        </div>

        {/* Illustration + heading */}
        <div className="px-5 pt-16 pb-8 flex items-end gap-5">
          {/* SVG dog-walk illustration */}
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none" style={{ flexShrink: 0 }}>
            <ellipse cx="50" cy="87" rx="46" ry="3.5" fill="rgba(0,0,0,0.2)" />
            {/* Person */}
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
            {/* Leash */}
            <path d="M36 46 Q60 30 72 54" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Dog */}
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

      {/* Stat chips */}
      <div className="flex gap-3 px-4 py-4">
        {[
          { icon: '📍', label: 'GPS Distance', color: '#EBF5EF', tc: '#1B4332' },
          { icon: '⏱', label: 'Live Timer', color: '#EFF6FF', tc: '#1E40AF' },
          { icon: '🔥', label: 'Calories', color: '#FFF7ED', tc: '#C2410C' },
        ].map(f => (
          <div key={f.label} className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl"
            style={{ background: f.color }}>
            <span className="text-xl">{f.icon}</span>
            <p className="text-[10px] font-bold" style={{ color: f.tc }}>{f.label}</p>
          </div>
        ))}
      </div>

      {/* Dog selector */}
      <div className="flex-1 px-4 pb-10 space-y-4">
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
                        {dog.age && (
                          <p className="text-xs text-ink-muted">
                            {dog.age < 1
                              ? `${Math.round(dog.age * 12)} months old`
                              : `${dog.age} yr${dog.age !== 1 ? 's' : ''} old`}
                          </p>
                        )}
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

            <button onClick={handleStart} disabled={!selectedDog}
              className="w-full h-16 rounded-3xl text-white font-extrabold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 100%)', boxShadow: '0 12px 32px rgba(27,67,50,0.32)' }}>
              <Play className="w-6 h-6 fill-white" />
              Start Walk
              <ChevronRight className="w-5 h-5 opacity-70" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ── ACTIVE phase ──────────────────────────────────────────────
  if (phase === 'active') return (
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
          {selectedDog && (
            <p className="text-white font-bold text-sm mt-0.5">{selectedDog.name}</p>
          )}
        </div>
        <div className="w-10 flex items-center justify-end">
          <MapIcon className="w-5 h-5 text-green-400/60" />
        </div>
      </div>

      {/* Live Map */}
      <div className="shrink-0 mx-4 rounded-3xl overflow-hidden" style={{ height: '42vh', border: '1px solid rgba(255,255,255,0.08)' }}>
        <LiveRouteMap routePoints={routePoints} currentPos={currentPos} paused={paused} />
      </div>

      {gpsNote && (
        <p className="text-yellow-400/80 text-xs font-medium text-center mt-2 px-4">{gpsNote}</p>
      )}

      {/* Timer + Stats */}
      <div className="flex-1 flex flex-col justify-center px-5 gap-3 mt-2">

        {/* Big timer */}
        <div className="flex items-center justify-center gap-3">
          {!paused && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          <p style={{
            fontSize: 56, fontWeight: 900, color: 'white',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            letterSpacing: '-0.04em',
          }}>
            {fmtTime(elapsed)}
          </p>
        </div>

        {/* Stats row */}
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
          {paused
            ? <><Play className="w-4 h-4 fill-current" /> Resume Walk</>
            : <><Pause className="w-4 h-4" /> Pause</>}
        </button>
        <button onClick={handleStop}
          className="w-full py-4 rounded-3xl font-extrabold text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #DC2626, #991B1B)', boxShadow: '0 6px 20px rgba(220,38,38,0.3)' }}>
          <Square className="w-4 h-4 fill-white" /> Finish Walk
        </button>
      </div>
    </div>
  );

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
        <button onClick={handleStart}
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
