import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Square, Clock, MapPin, Zap, AlertTriangle, Camera } from 'lucide-react';
import MapLibreMap from '../../components/ui/MapLibreMap';
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

export default function WalkerLiveWalk() {
  const { walkId } = useParams<{ walkId: string }>();
  const { data, endWalk, startWalk, currentUser, sendNotification } = useApp();
  const [sosConfirm, setSosConfirm] = useState(false);
  const [sosDone, setSosDone]       = useState(false);
  const navigate = useNavigate();

  const [myPos, setMyPos]     = useState<LatLng | null>(null);
  const [route, setRoute]     = useState<LatLng[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const routeRef = useRef<LatLng[]>([]);
  const [gpsError, setGpsError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMade, setPayMade]           = useState<boolean | null>(null);
  const [payMethod, setPayMethod]       = useState('');
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [chatPopup, setChatPopup]     = useState<{ senderName: string; text: string } | null>(null);
  const popupTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const photoInputRef                 = useRef<HTMLInputElement>(null);

  const walk  = data.walks.find(w => w.id === walkId);
  const dog   = data.dogs.find(d => d.id === walk?.dogId);
  const owner = data.users.find(u => u.id === walk?.ownerId);

  const isActive   = walk?.status === 'active';
  const isAssigned = walk?.status === 'assigned';

  // Elapsed timer — starts from actual walk start time so re-opening the page shows correct time
  useEffect(() => {
    if (!isActive) return;
    const startMs = walk?.startTime ? new Date(walk.startTime).getTime() : Date.now();
    setElapsed(Math.floor((Date.now() - startMs) / 1000));
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Chat message subscription — show floating popup when owner sends a message
  useEffect(() => {
    if (!walkId || !currentUser) return;
    const ch = supabase
      .channel(`chat-popup-walker-${walkId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `walk_id=eq.${walkId}` },
        (payload) => {
          const msg = payload.new as { sender_id?: string; user_id?: string; content?: string; text?: string };
          const senderId = msg.sender_id || msg.user_id;
          if (senderId === currentUser.id) return; // ignore own messages
          const sender = data.users.find(u => u.id === senderId);
          const text = (msg.content || msg.text || '').slice(0, 80);
          if (!text) return;
          if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
          setChatPopup({ senderName: sender?.name || 'Owner', text });
          popupTimerRef.current = setTimeout(() => setChatPopup(null), 5000);
        })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, [walkId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS + Supabase broadcast (only when active)
  useEffect(() => {
    if (!walkId || !isActive) return;
    if (!navigator.geolocation) { setGpsError(true); return; }

    const channel = supabase.channel(`walk-location-${walkId}`, { config: { broadcast: { self: false } } });
    let watchId: number | null = null;

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      channelRef.current = channel;
      watchId = navigator.geolocation.watchPosition(
        pos => {
          const pt: LatLng = [pos.coords.latitude, pos.coords.longitude];
          routeRef.current = [...routeRef.current, pt];
          setMyPos(pt);
          setRoute(routeRef.current);
          const distKm = totalDistance(routeRef.current);
          const startMs = walk?.startTime ? new Date(walk.startTime).getTime() : Date.now();
          channel.send({
            type: 'broadcast', event: 'location',
            payload: { lat: pt[0], lng: pt[1], distKm, elapsedSec: Math.floor((Date.now() - startMs) / 1000) },
          });
        },
        () => setGpsError(true),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      supabase.removeChannel(channel);
      channelRef.current = null;
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
    setPayMade(null);
    setPayMethod('');
    setShowPayModal(true);
  };

  const confirmEnd = async () => {
    if (!walkId) return;
    const loc = myPos ? { lat: myPos[0], lng: myPos[1] } : { lat: LUSAKA[0], lng: LUSAKA[1] };
    if (payMade && payMethod) {
      // Update payment record with method and walker confirmation
      const payment = data.payments?.find((p: any) => p.walkId === walkId);
      if (payment) {
        await supabase.from('payments').update({ payment_method: payMethod, walker_confirmed: true, status: 'paid' }).eq('id', payment.id);
      }
    }
    const routePointsArr: [number, number][] = routeRef.current.map(p => [p[0], p[1]]);
    endWalk(walkId, loc, routePointsArr.length > 0 ? routePointsArr : undefined);
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

  const currentPos = myPos
    ? { lat: myPos[0], lng: myPos[1] }
    : walk.startLocation
    ? { lat: walk.startLocation.lat, lng: walk.startLocation.lng }
    : null;

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 720;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handlePhotoSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !walkId || !currentUser) return;
    setSendingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        walk_id: walkId,
        sender_id: currentUser.id,
        text: dataUrl,
      });
    } catch (err) {
      console.warn('Photo send failed:', err);
    } finally {
      setSendingPhoto(false);
    }
  };

  const triggerSOS = () => {
    const admins = data.users.filter(u => u.role === 'admin');
    const locStr = myPos ? `GPS: ${myPos[0].toFixed(5)}, ${myPos[1].toFixed(5)}` : 'Location unavailable';
    const msg = `🚨 SOS from walker ${currentUser?.name || 'Walker'} — walking ${dog?.name || 'dog'} for ${owner?.name || 'owner'}. ${locStr}`;
    admins.forEach(admin => sendNotification(admin.id, 'sos', '🚨 Emergency SOS Alert', msg, { walkId: walkId ?? '' }));
    setSosConfirm(false);
    setSosDone(true);
  };

  return (
    <div className="flex flex-col h-screen bg-ink">
      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3 shrink-0 z-[1001]">
        <button type="button" onClick={() => navigate('/walker/walks')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl transition-colors active:scale-95"
          style={{ background: '#F3F4F6' }}>
          <ArrowLeft className="w-5 h-5 text-ink" />
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

      {/* Map — MapLibre GL */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {currentPos ? (
            <MapLibreMap
              lat={currentPos.lat}
              lng={currentPos.lng}
              trail={route}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EBF5EF', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 40 }}>📍</div>
              <p style={{ color: '#2B8A50', fontWeight: 600 }}>Getting GPS…</p>
            </div>
          )}
        </div>

        {/* Chat popup */}
        {chatPopup && (
          <div className="absolute top-3 left-3 right-3 z-[1002] flex items-center gap-3 bg-white rounded-2xl shadow-xl px-4 py-3"
            style={{ animation: 'slideDown 0.25s ease-out', border: '1px solid rgba(0,0,0,0.08)' }}>
            <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
              {chatPopup.senderName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-ink">{chatPopup.senderName}</p>
              <p className="text-xs text-ink-muted truncate">{chatPopup.text}</p>
            </div>
            <button type="button"
              onClick={() => { setChatPopup(null); navigate(`/chat/${walkId}`); }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
              Reply
            </button>
            <button type="button" onClick={() => setChatPopup(null)}
              className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 text-ink-muted hover:bg-gray-100">
              ✕
            </button>
          </div>
        )}

        {/* Overlays sit on top of the map */}
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

        {/* Estimation card */}
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
      <div className="bg-white px-4 pt-3 pb-4 shrink-0 z-[1001]"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex gap-2.5">
          {isAssigned && (
            <button type="button" onClick={handleStart} disabled={starting}
              className="flex items-center gap-2 flex-1 justify-center text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 shadow-lg"
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
                  className="flex items-center gap-2 flex-1 justify-center py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  style={{ background: '#EBF5EF', color: '#1B4332' }}>
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
              <Link to={`/walker/chat/${walkId}`}
                className="flex items-center gap-2 flex-1 justify-center py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}>
                <MessageCircle className="w-4 h-4" />
                Chat
              </Link>
              <button type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={sendingPhoto}
                className="flex items-center gap-2 flex-1 justify-center py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ background: '#EBF5EF', color: '#1B4332' }}>
                <Camera className="w-4 h-4" />
                {sendingPhoto ? '…' : 'Photo'}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSend} />
              <button type="button" onClick={handleEnd}
                className="flex items-center gap-2 flex-1 justify-center text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ background: '#DC2626' }}>
                <Square className="w-4 h-4" />
                End
              </button>
            </>
          )}
        </div>

        {/* SOS row — only during active walk */}
        {isActive && (
          <button type="button"
            onClick={() => sosDone ? undefined : setSosConfirm(true)}
            className="mt-2.5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: sosDone ? '#ECFDF5' : '#FEF2F2',
              color: sosDone ? '#16a34a' : '#DC2626',
              border: `1.5px solid ${sosDone ? '#bbf7d0' : '#fecaca'}`,
            }}>
            {sosDone
              ? '✓ Admin team alerted — help is on the way'
              : <><AlertTriangle className="w-4 h-4" /> Emergency SOS — Alert Admin</>}
          </button>
        )}
      </div>

      {/* SOS confirmation dialog */}
      {sosConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <p className="text-base font-extrabold text-gray-900 mb-2">Send SOS alert?</p>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              This will immediately notify the PawFleet admin team with your GPS location and walk details.
            </p>
            <button type="button" onClick={triggerSOS}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm mb-3"
              style={{ background: '#DC2626' }}>
              Yes, Send SOS
            </button>
            <button type="button" onClick={() => setSosConfirm(false)}
              className="w-full py-2 text-sm font-medium text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment confirmation modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPayModal(false); }}>
          <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-6 pb-10 shadow-2xl animate-slide-up"
            style={{ animation: 'slideUp 0.25s ease-out' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-5" />

            <p className="text-base font-extrabold text-ink mb-1 text-center">End Walk</p>
            <p className="text-sm text-ink-muted text-center mb-6">Has payment been made for this walk?</p>

            {/* Yes / No */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[true, false].map(val => (
                <button key={String(val)} type="button"
                  onClick={() => { setPayMade(val); if (!val) setPayMethod(''); }}
                  className={`py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                    payMade === val
                      ? val ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'
                      : 'bg-surface-secondary border-surface-border text-ink-secondary hover:bg-surface-hover'
                  }`}>
                  {val ? '✓ Yes, paid' : '✗ Not yet'}
                </button>
              ))}
            </div>

            {/* Payment method (shown when yes) */}
            {payMade === true && (
              <div className="mb-5">
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mobile_money', label: 'Mobile Money', icon: '📱' },
                    { id: 'cash',         label: 'Cash',         icon: '💵' },
                    { id: 'bank_transfer',label: 'Bank Transfer', icon: '🏦' },
                  ].map(m => (
                    <button key={m.id} type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                        payMethod === m.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-surface-border bg-white text-ink-secondary hover:bg-surface-hover'
                      }`}>
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[10px] font-bold text-center leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm button */}
            <button type="button"
              onClick={confirmEnd}
              disabled={payMade === null || (payMade === true && !payMethod)}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Confirm & End Walk
            </button>

            <button type="button" onClick={() => setShowPayModal(false)}
              className="w-full mt-3 py-3 rounded-2xl text-sm font-medium text-ink-muted hover:text-ink transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
