import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, Footprints, MessageCircle, Scissors } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import LiveRouteMap, { MapMarker } from '../../components/map/LiveRouteMap';
import GoOnlineCard from '../../components/walker/GoOnlineCard';
import { useWalkerOnline, useWalkersLive } from '../../lib/liveTracking';
import { LatLng, LUSAKA, formatKm, haversineKm, isValidCoord } from '../../lib/geo';
import type { User, WalkerPricing } from '../../types';

type Service = 'walk' | 'grooming';
const DURATIONS = [20, 30, 40, 60] as const;

interface Entry {
  user: User;
  pos: LatLng | null;
  live: boolean;
  distKm: number | null;
}

/**
 * Live map. Owners scan for walkers or groomers around them; walkers see open jobs near them.
 * Walkers who are online appear and move in real time.
 */
export default function WalkerMap() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, currentUser } = useApp();
  const live = useWalkersLive(currentUser?.id);
  const myOnline = useWalkerOnline();

  const role = currentUser?.role;
  const isWalker = role === 'walker';
  const canBook = role === 'owner';

  const service: Service = params.get('service') === 'grooming' ? 'grooming' : 'walk';
  const urlDuration = Number(params.get('duration'));
  const [duration, setDuration] = useState<number>(DURATIONS.includes(urlDuration as any) ? urlDuration : 30);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [myPos, setMyPos] = useState<LatLng | null>(null);
  const [gpsNote, setGpsNote] = useState('');
  const [fitTick, setFitTick] = useState(0);

  // Where am I? Walkers reuse the broadcast position; everyone else asks the browser once.
  useEffect(() => {
    if (isWalker && myOnline.pos) { setMyPos(myOnline.pos); return; }
    if (myPos || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      p => { setMyPos([p.coords.latitude, p.coords.longitude]); setGpsNote(''); },
      () => setGpsNote('Turn on location to see how far each walker is from you.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }, [isWalker, myOnline.pos]); // eslint-disable-line react-hooks/exhaustive-deps

  const approved = useMemo(
    () => data.users.filter(u => u.role === 'walker' && (!u.walkerStatus || u.walkerStatus === 'active') && u.id !== currentUser?.id),
    [data.users, currentUser?.id],
  );
  const pendingApproval = data.users.filter(u => u.role === 'walker' && u.walkerStatus === 'pending_approval').length;

  const entries: Entry[] = useMemo(() => {
    const pool = service === 'grooming' ? approved.filter(u => u.pricing?.grooming != null) : approved;
    return pool.map(user => {
      const l = live[user.id];
      let pos: LatLng | null = null;
      if (l) pos = [l.lat, l.lng];
      else if (isValidCoord(user.onlineLat, user.onlineLng)) pos = [user.onlineLat!, user.onlineLng!];
      else if (isValidCoord(user.serviceLat, user.serviceLng)) pos = [user.serviceLat!, user.serviceLng!];
      return { user, pos, live: !!l, distKm: pos && myPos ? haversineKm(myPos, pos) : null };
    }).sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      if (a.distKm == null && b.distKm == null) return a.user.name.localeCompare(b.user.name);
      if (a.distKm == null) return 1;
      if (b.distKm == null) return -1;
      return a.distKm - b.distKm;
    });
  }, [approved, live, myPos, service]);

  // Open jobs, shown to walkers.
  const jobs = useMemo(() => {
    if (!isWalker) return [];
    return data.walks
      .filter(w => w.status === 'pending' && !w.walkerId && isValidCoord(w.startLocation?.lat, w.startLocation?.lng))
      .map(w => {
        const pos: LatLng = [w.startLocation!.lat!, w.startLocation!.lng!];
        return { walk: w, pos, distKm: myPos ? haversineKm(myPos, pos) : null };
      })
      .sort((a, b) => (a.distKm ?? 1e9) - (b.distKm ?? 1e9));
  }, [data.walks, isWalker, myPos]);

  const liveCount = entries.filter(e => e.live).length;

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    if (myPos) out.push({ id: 'me', lat: myPos[0], lng: myPos[1], kind: 'me', title: 'You' });
    if (isWalker) {
      jobs.forEach(j => out.push({ id: `job:${j.walk.id}`, lat: j.pos[0], lng: j.pos[1], kind: 'job', title: 'Open job' }));
    } else {
      entries.forEach(e => {
        if (!e.pos) return;
        out.push({
          id: e.user.id, lat: e.pos[0], lng: e.pos[1],
          kind: e.live ? (service === 'grooming' ? 'groomer' : 'walker') : 'walker-offline',
          live: e.live, selected: e.user.id === selectedId, title: e.user.name,
        });
      });
    }
    return out;
  }, [entries, jobs, myPos, isWalker, service, selectedId]);

  const fitKey = `${service}|${myPos ? 'me' : ''}|${markers.length > 0 ? 'data' : ''}|${fitTick}`;
  const center: LatLng = myPos ?? entries.find(e => e.pos)?.pos ?? LUSAKA;

  const priceFor = (u: User): number | undefined =>
    service === 'grooming' ? u.pricing?.grooming : u.pricing?.[`walk_${duration}` as keyof WalkerPricing];

  const base = role === 'admin' ? '/admin' : `/${role ?? 'owner'}`;
  const setService = (s: Service) => {
    const next = new URLSearchParams(params);
    if (s === 'grooming') next.set('service', 'grooming'); else next.delete('service');
    setParams(next, { replace: true });
    setSelectedId(null);
  };

  const selectedEntries = selectedId
    ? [...entries.filter(e => e.user.id === selectedId), ...entries.filter(e => e.user.id !== selectedId)]
    : entries;

  return (
    <div className="relative flex flex-col bg-white overflow-hidden h-[calc(100dvh-7.5rem)] lg:h-[100dvh]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0 z-[1001] border-b border-black/5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back"
          className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-95 transition-transform bg-[#F3F4F6]">
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">PawFleet live map</p>
          <p className="text-sm font-bold text-ink truncate">
            {isWalker ? 'Jobs near you' : service === 'grooming' ? 'Groomers nearby' : 'Walkers nearby'}
          </p>
        </div>
        {!isWalker && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF5EF]">
            <span className={`w-2 h-2 rounded-full ${liveCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs font-bold" style={{ color: '#1B4332' }}>{liveCount} live</span>
          </div>
        )}
      </div>

      {/* Service switch */}
      {!isWalker && (
        <div className="px-4 py-2 bg-white shrink-0 z-[1001] flex gap-2">
          {([['walk', 'Dog walkers', Footprints], ['grooming', 'Groomers', Scissors]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setService(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${service === key ? 'text-white shadow' : 'bg-[#F4F9F6] text-ink-muted'}`}
              style={service === key ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <LiveRouteMap
          markers={markers}
          center={center}
          zoom={13}
          fitKey={fitKey}
          bottomPadding={250}
          onSelect={id => { if (!id.startsWith('job:') && id !== 'me') setSelectedId(id); }}
          onMapClick={() => setSelectedId(null)}
        />
        <button type="button" onClick={() => setFitTick(t => t + 1)} aria-label="Show everyone"
          className="absolute top-3 left-3 z-[1000] w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center active:scale-95">
          <Crosshair className="w-5 h-5 text-ink" />
        </button>
        {gpsNote && !isWalker && (
          <div className="absolute top-3 left-16 right-16 z-[1000] bg-white/95 rounded-xl px-3 py-2 text-[11px] text-ink-muted shadow">{gpsNote}</div>
        )}

        {/* Bottom sheet */}
        <div className="absolute inset-x-0 bottom-0 z-[1000] bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-4 pt-3 pb-4 overflow-y-auto"
          style={{ maxHeight: '46%' }}>
          <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-3" />

          {isWalker && <div className="mb-3"><GoOnlineCard compact /></div>}

          {/* Duration chips (prices) */}
          {!isWalker && service === 'walk' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Walk length</span>
              <div className="flex gap-1.5">
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => setDuration(d)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${duration === d ? 'text-white' : 'bg-[#F4F9F6] text-ink-muted'}`}
                    style={duration === d ? { background: '#1B4332' } : {}}>
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Walker: open jobs */}
          {isWalker && (
            jobs.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-4">No open jobs with a pickup location right now. Stay online and new requests will ring on your phone.</p>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 20).map(j => (
                  <Link key={j.walk.id} to="/walker/walks"
                    className="flex items-center gap-3 p-3 rounded-2xl border border-surface-border bg-white">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-lg shrink-0">🐾</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{j.walk.startLocation?.address || 'Pickup location'}</p>
                      <p className="text-[11px] text-ink-muted">
                        K{j.walk.walkerEarning} earning{j.distKm != null ? ` · ${formatKm(j.distKm)} away` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#2B8A50' }}>View</span>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* Owner & others: walkers / groomers */}
          {!isWalker && (
            entries.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-3xl mb-1">{service === 'grooming' ? '✂️' : '🦮'}</p>
                <p className="text-sm font-bold text-ink">
                  {service === 'grooming' ? 'No groomers listed yet' : 'No approved walkers yet'}
                </p>
                <p className="text-xs text-ink-muted mt-1 max-w-xs mx-auto leading-relaxed">
                  {service === 'grooming'
                    ? 'Groomers are walkers who set a grooming price in their profile.'
                    : pendingApproval > 0 && role === 'admin'
                    ? `${pendingApproval} walker${pendingApproval === 1 ? ' is' : 's are'} waiting for your approval.`
                    : 'Walkers appear here once an admin approves them.'}
                </p>
                {role === 'admin' && pendingApproval > 0 && (
                  <Link to="/admin/walkers" className="inline-block mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#1B4332' }}>
                    Review applications
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {liveCount === 0 && (
                  <p className="text-[11px] text-ink-muted bg-[#F4F9F6] rounded-xl px-3 py-2 leading-relaxed">
                    Nobody is online at this moment. Grey pins show each {service === 'grooming' ? 'groomer' : 'walker'}'s usual area. You can still book and they will confirm.
                  </p>
                )}
                {selectedEntries.map(e => {
                  const price = priceFor(e.user);
                  return (
                    <div key={e.user.id}
                      onClick={() => setSelectedId(e.user.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${e.user.id === selectedId ? 'border-primary bg-[#EBF5EF]' : 'border-surface-border bg-white'}`}>
                      <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                        {e.user.imageUrl ? <img src={e.user.imageUrl} alt="" className="w-full h-full object-cover" /> : e.user.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{e.user.name}</p>
                        <p className="text-[11px] font-medium truncate" style={{ color: e.live ? '#16A34A' : '#9CA3AF' }}>
                          {e.live ? '● Live now' : '○ Offline'}
                          {e.distKm != null ? ` · ${formatKm(e.distKm)} away` : ''}
                          {price != null ? ` · K${price}${service === 'walk' ? ` / ${duration}m` : ''}` : ''}
                        </p>
                      </div>
                      <button type="button" aria-label={`Message ${e.user.name}`}
                        onClick={ev => { ev.stopPropagation(); navigate(`${base}/dm/${e.user.id}`); }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#EBF5EF] shrink-0 active:scale-95">
                        <MessageCircle className="w-4 h-4" style={{ color: '#2B8A50' }} />
                      </button>
                      {canBook && (
                        <button type="button"
                          onClick={ev => {
                            ev.stopPropagation();
                            navigate(service === 'grooming'
                              ? `/owner/grooming?groomer=${e.user.id}`
                              : `/owner/request?walker=${e.user.id}&duration=${duration}`);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shrink-0 active:scale-95"
                          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                          Book
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {canBook && (
            <button type="button" onClick={() => navigate(service === 'grooming' ? '/owner/grooming' : `/owner/request?duration=${duration}`)}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-extrabold text-white active:scale-[0.98]"
              style={{ background: '#1B4332' }}>
              {service === 'grooming' ? 'Book a groomer' : 'Book any available walker'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
