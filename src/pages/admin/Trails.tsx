import { useEffect, useMemo, useState } from 'react';
import { Route, Loader2, AlertTriangle, MapPin, ExternalLink } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import LiveRouteMap, { type MapLine, type MapMarker } from '../../components/map/LiveRouteMap';
import type { LatLng } from '../../lib/geo';

// Every finished walk's GPS route (table `trails`, filled by a database trigger when a walk completes).
// Routes are drawn see-through, so roads that many walks use show up darker: the popular trails.

interface TrailRow {
  walk_id: string; walker_id: string | null; dog_id: string | null; started_at: string | null; created_at: string;
  duration_min: number | null; distance_m: number | null; point_count: number | null; points: LatLng[];
  start_lat: number | null; start_lng: number | null;
}

const RANGES = [
  { days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }, { days: 0, label: 'All' },
];
const CELL = 0.005; // about 550 m, for "busiest areas"

/** At most `max` points per line, so hundreds of routes still draw quickly. */
function thin(points: LatLng[], max = 150): LatLng[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: LatLng[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

export default function AdminTrails() {
  const { data } = useApp();
  const [rows, setRows] = useState<TrailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      let query = supabase.from('trails')
        .select('walk_id,walker_id,dog_id,started_at,created_at,duration_min,distance_m,point_count,points,start_lat,start_lng')
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(600);
      if (days) query = query.gte('started_at', subDays(new Date(), days).toISOString());
      const { data: d, error: e } = await query;
      if (cancelled) return;
      if (e) {
        setError(/relation|does not exist|schema cache/i.test(e.message)
          ? 'The trails database is not set up yet. Run supabase/migrations/20261128_admin_sections.sql in the Supabase SQL Editor.'
          : `Could not load trails: ${e.message}`);
        setRows([]);
      } else {
        setRows(((d ?? []) as TrailRow[]).filter(r => Array.isArray(r.points) && r.points.length > 1));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [days]);

  const stats = useMemo(() => {
    const km = rows.reduce((s, r) => s + (r.distance_m || 0), 0) / 1000;
    const mins = rows.filter(r => r.duration_min).map(r => r.duration_min!);
    // Busiest areas: count how many different walks pass through each ~550 m square.
    const cells = new Map<string, { n: number; lat: number; lng: number }>();
    rows.forEach(r => {
      const seen = new Set<string>();
      r.points.forEach(([la, lo]) => {
        const key = `${Math.floor(la / CELL)}:${Math.floor(lo / CELL)}`;
        if (seen.has(key)) return;
        seen.add(key);
        const c = cells.get(key) || { n: 0, lat: (Math.floor(la / CELL) + 0.5) * CELL, lng: (Math.floor(lo / CELL) + 0.5) * CELL };
        c.n++;
        cells.set(key, c);
      });
    });
    const busiest = [...cells.values()].sort((a, b) => b.n - a.n).slice(0, 6);
    return {
      count: rows.length,
      km,
      avgKm: rows.length ? km / rows.length : 0,
      avgMin: mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : 0,
      busiest,
    };
  }, [rows]);

  const lines: MapLine[] = useMemo(() => rows.map(r => ({
    id: r.walk_id,
    points: thin(r.points),
    color: r.walk_id === selected ? '#F59E0B' : '#2B8A50',
    width: r.walk_id === selected ? 5 : 3,
    opacity: r.walk_id === selected ? 1 : rows.length > 100 ? 0.18 : 0.35,
  })), [rows, selected]);

  const markers: MapMarker[] = stats.busiest.map((c, i) => ({ id: `hot-${i}`, lat: c.lat, lng: c.lng, kind: 'pickup' as const, title: `${c.n} walks` }));
  const nameOf = (id: string | null) => (id ? data.users.find(u => u.id === id)?.name : '') || 'Unknown';
  const dogOf = (id: string | null) => (id ? data.dogs.find(d => d.id === id)?.name : '') || '';

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-ink flex items-center gap-2"><Route className="w-5 h-5 text-primary" /> Trails</h1>
          <p className="text-sm text-ink-muted">Every route walked with PawFleet. Darker lines are roads many walks use.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-surface-secondary">
          {RANGES.map(r => (
            <button key={r.days} type="button" onClick={() => setDays(r.days)}
              className={`px-3 h-8 rounded-lg text-xs font-bold ${days === r.days ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Trails" value={stats.count.toLocaleString()} />
        <Stat label="Kilometres walked" value={stats.km.toFixed(1)} />
        <Stat label="Average walk" value={`${stats.avgKm.toFixed(2)} km`} />
        <Stat label="Average time" value={`${Math.round(stats.avgMin)} min`} />
      </div>

      {error && <p className="text-sm rounded-xl px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

      <div className="rounded-2xl overflow-hidden border border-surface-border h-[420px] relative">
        <LiveRouteMap markers={markers} lines={lines} fitKey={`${days}:${rows.length}`} onSelect={id => !id.startsWith('hot-') && setSelected(id)} />
        {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {!loading && rows.length === 0 && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="bg-white/90 rounded-xl px-4 py-2 text-sm text-ink-muted">No trails in this period yet. They appear as walks are completed.</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-bold text-ink mb-2">Busiest areas</p>
          {stats.busiest.length === 0 ? <p className="text-xs text-ink-muted">Not enough walks yet.</p> : stats.busiest.map((c, i) => (
            <a key={i} href={`https://www.google.com/maps?q=${c.lat.toFixed(5)},${c.lng.toFixed(5)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between py-2 border-b border-surface-border last:border-0 text-xs">
              <span className="flex items-center gap-1.5 text-ink"><MapPin className="w-3.5 h-3.5 text-primary" /> Area {i + 1} <ExternalLink className="w-3 h-3 text-ink-muted" /></span>
              <span className="font-bold text-ink">{c.n} walk{c.n === 1 ? '' : 's'}</span>
            </a>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-bold text-ink mb-2">Recent trails</p>
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
            {rows.slice(0, 200).map(r => (
              <button key={r.walk_id} type="button" onClick={() => setSelected(selected === r.walk_id ? '' : r.walk_id)}
                className={`w-full flex items-center justify-between gap-3 py-2 text-left text-xs ${selected === r.walk_id ? 'bg-amber-50' : ''}`}>
                <span className="min-w-0 truncate">
                  <b className="text-ink">{r.started_at ? format(parseISO(r.started_at), 'd MMM, HH:mm') : format(parseISO(r.created_at), 'd MMM')}</b>
                  <span className="text-ink-muted"> · {nameOf(r.walker_id)}{dogOf(r.dog_id) ? ` with ${dogOf(r.dog_id)}` : ''}</span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{((r.distance_m || 0) / 1000).toFixed(2)} km{r.duration_min ? ` · ${r.duration_min} min` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-4">
      <p className="text-xl font-extrabold text-ink">{value}</p>
      <p className="text-[11px] text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}
