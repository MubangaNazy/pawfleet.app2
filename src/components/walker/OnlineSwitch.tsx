import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { goOffline, goOnline, useWalkerOnline } from '../../lib/liveTracking';

/**
 * The Online / Offline switch for walkers, shown on every walker screen.
 * Offline: you can still browse and accept open jobs from the list.
 * Online: you also show on owners' maps and new requests ring on your phone.
 */
export default function OnlineSwitch({ className = '' }: { className?: string }) {
  const { currentUser, data } = useApp();
  const { online, starting } = useWalkerOnline();
  const navigate = useNavigate();
  if (!currentUser || currentUser.role !== 'walker') return null;

  const me = data.users.find(u => u.id === currentUser.id) ?? currentUser;
  const approved = !me.walkerStatus || me.walkerStatus === 'active';

  if (!approved) {
    return (
      <button type="button" onClick={() => navigate('/walker')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 ${className}`}>
        ⏳ Pending approval
      </button>
    );
  }

  const on = online || starting;
  const toggle = () => {
    if (on) goOffline();
    else goOnline(currentUser.id, me.serviceLat != null && me.serviceLng != null);
  };

  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle}
      className={`flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border text-[11px] font-bold transition-colors active:scale-95 ${
        online ? 'bg-[#EBF5EF] border-green-300 text-[#1B4332]' : 'bg-white border-surface-border text-ink-secondary'
      } ${className}`}>
      {starting
        ? <><Loader2 className="w-3 h-3 animate-spin" /> Locating…</>
        : <><span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />{online ? 'Online' : 'Offline'}</>}
      <span className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
