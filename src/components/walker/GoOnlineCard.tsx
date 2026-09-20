import { Link } from 'react-router-dom';
import { Loader2, Radio, ShieldAlert, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { goOnline, goOffline, useWalkerOnline } from '../../lib/liveTracking';

/**
 * The switch that makes a walker discoverable. While it is on, the walker's GPS
 * position is broadcast live so owners can find, message and book them.
 */
export default function GoOnlineCard({ compact = false }: { compact?: boolean }) {
  const { currentUser, data } = useApp();
  const { online, starting, error } = useWalkerOnline();
  if (!currentUser || currentUser.role !== 'walker') return null;

  // currentUser is cached at login; the users list is realtime, so admin approval shows up here.
  const me = data.users.find(u => u.id === currentUser.id) ?? currentUser;
  const approved = !me.walkerStatus || me.walkerStatus === 'active';

  if (!approved) {
    const suspended = me.walkerStatus === 'suspended';
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">
            {suspended ? 'Your walker account is not active' : 'Waiting for admin approval'}
          </p>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            {suspended
              ? 'Contact PawFleet support to get back online.'
              : 'Owners cannot see or book you until an admin approves your application. You will get a notification as soon as that happens.'}
          </p>
        </div>
      </div>
    );
  }

  const toggle = () => {
    if (online || starting) goOffline();
    else goOnline(currentUser.id, me.serviceLat != null && me.serviceLng != null);
  };

  return (
    <div className={`rounded-2xl border ${online ? 'border-green-300 bg-[#EBF5EF]' : 'border-surface-border bg-white'} p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${online ? 'text-white' : 'text-ink-muted bg-surface-secondary'}`}
          style={online ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
          {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-ink flex items-center gap-2">
            {online ? "You're live" : starting ? 'Finding your location…' : "You're offline"}
            {online && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          </p>
          <p className="text-xs text-ink-muted mt-0.5 leading-snug">
            {online
              ? 'Owners nearby can see you on the map and book you. Keep the app open.'
              : 'Go online so owners near you can find and book you.'}
          </p>
        </div>
        <button type="button" onClick={toggle}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${online || starting ? 'bg-white border border-surface-border text-ink' : 'text-white shadow-md'}`}
          style={!online && !starting ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
          {online || starting ? 'Go offline' : 'Go online'}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-xs font-medium text-danger flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
        </p>
      )}
      {!compact && online && (
        <Link to="/walker/map" className="mt-3 inline-block text-xs font-bold" style={{ color: '#2B8A50' }}>
          See jobs near you →
        </Link>
      )}
    </div>
  );
}
