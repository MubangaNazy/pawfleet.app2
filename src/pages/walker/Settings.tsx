import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Info, ChevronRight, CheckCircle2, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ZAMBIA_AREAS = [
  'Libala', 'Chelstone', 'Kabulonga', 'Woodlands', 'Ibex Hill',
  'Rhodespark', 'Northmead', 'Handsworth Park', 'Roma', 'Olympia',
  'Avondale', 'Matero', 'Chilenje', 'Chaisa', 'Kabwata',
  'Emmasdale', 'Mtendere', 'Foxdale', 'Garden', 'Longacres',
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-primary' : 'bg-surface-border'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
    </button>
  );
}

export default function WalkerSettings() {
  const navigate = useNavigate();
  const { currentUser, updateUser } = useApp();

  const [walkNotifs,    setWalkNotifs]    = useState(() => localStorage.getItem('pf_notif_walk')    !== 'false');
  const [earningNotifs, setEarningNotifs] = useState(() => localStorage.getItem('pf_notif_earn')    !== 'false');
  const [chatNotifs,    setChatNotifs]    = useState(() => localStorage.getItem('pf_notif_chat')    !== 'false');
  const [soundEnabled,  setSoundEnabled]  = useState(() => localStorage.getItem('pf_sound')         !== 'false');

  const save = (key: string, val: boolean) => localStorage.setItem(key, String(val));

  const existingAreas: string[] = (currentUser?.pricing as any)?.serviceAreas ?? [];
  const [serviceAreas, setServiceAreas] = useState<string[]>(existingAreas);
  const [areasSaved, setAreasSaved] = useState(false);

  const toggleArea = (area: string) => {
    setServiceAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const saveAreas = async () => {
    if (!currentUser) return;
    const existing = (currentUser.pricing as any) || {};
    await updateUser(currentUser.id, { pricing: { ...existing, serviceAreas } });
    setAreasSaved(true);
    setTimeout(() => setAreasSaved(false), 2000);
  };

  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const appVersion = '1.0.0';

  return (
    <div className="max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-extrabold text-ink leading-tight">App Settings</h1>
          <p className="text-xs text-ink-muted">Customise your experience</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-ink">Notifications</p>
          </div>
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
            {[
              { label: 'New Walk Requests',   desc: 'Alert when a new walk is available',   val: walkNotifs,    key: 'pf_notif_walk',    set: setWalkNotifs   },
              { label: 'Payment Updates',      desc: 'When earnings are confirmed',          val: earningNotifs, key: 'pf_notif_earn',    set: setEarningNotifs },
              { label: 'Chat Messages',        desc: 'Messages from owners & admins',        val: chatNotifs,    key: 'pf_notif_chat',    set: setChatNotifs   },
              { label: 'Notification Sounds',  desc: 'Play sound for alerts',                val: soundEnabled,  key: 'pf_sound',         set: setSoundEnabled  },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-3 px-4 py-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{item.desc}</p>
                </div>
                <Toggle on={item.val} onToggle={() => {
                  const next = !item.val;
                  item.set(next);
                  save(item.key, next);
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-ink">Service Areas</p>
            </div>
            <span className="text-xs text-ink-muted">{serviceAreas.length} selected</span>
          </div>
          <p className="text-xs text-ink-muted mb-3">Select the areas in Lusaka where you offer walks. Owners booking in these areas will find you.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ZAMBIA_AREAS.map(area => {
              const selected = serviceAreas.includes(area);
              return (
                <button key={area} type="button" onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selected
                      ? 'text-white border-primary'
                      : 'text-ink-secondary border-surface-border bg-white hover:border-primary/50'
                  }`}
                  style={selected ? { background: 'linear-gradient(135deg,#1B4332,#2B8A50)' } : {}}>
                  {area}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={saveAreas}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border border-primary text-primary hover:bg-primary/5">
            {areasSaved ? <><CheckCircle2 className="w-4 h-4 text-primary" /> Areas Saved!</> : 'Save Service Areas'}
          </button>
        </div>

        {/* About */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-ink">About</p>
          </div>
          <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
            {[
              { label: 'App Version',         value: appVersion },
              { label: 'Account',             value: currentUser?.name ?? '' },
              { label: 'Role',                value: 'Walker' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-4 py-4">
                <p className="text-sm font-medium text-ink">{item.label}</p>
                <p className="text-sm text-ink-muted">{item.value}</p>
              </div>
            ))}
            <button type="button" onClick={() => window.open('https://pawfleetapp2.vercel.app', '_blank')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-hover text-left">
              <p className="text-sm font-medium text-ink">Privacy Policy</p>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </button>
            <button type="button" onClick={() => window.open('https://pawfleetapp2.vercel.app', '_blank')}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-hover text-left">
              <p className="text-sm font-medium text-ink">Terms of Service</p>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </button>
          </div>
        </div>

        {/* Save button */}
        <button type="button" onClick={handleSave}
          className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          {saved
            ? <><CheckCircle2 className="w-4 h-4" /> Settings Saved!</>
            : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
