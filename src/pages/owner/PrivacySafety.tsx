import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, EyeOff, AlertTriangle, Phone, Lock, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function PrivacySafety() {
  const navigate = useNavigate();
  const [locationSharing, setLocationSharing] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative ${value ? '' : 'bg-surface-border'}`}
      style={value ? { background: '#1B4332' } : {}}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-7' : 'left-1'}`} />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto pb-28">
      <div className="sticky top-0 z-10 bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink flex-1">Privacy & Safety</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Safety tips */}
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-white" />
            <p className="font-bold text-white text-sm">Your Safety Matters</p>
          </div>
          <p className="text-white/80 text-xs leading-relaxed">All walkers on PawFleet are verified with valid NRC/ID. If you ever feel unsafe, use the emergency button below.</p>
        </div>

        {/* Emergency */}
        <div className="bg-white border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-ink text-sm">Emergency Contact</p>
              <p className="text-xs text-ink-muted">PawFleet safety line: +260 977 000 000</p>
            </div>
            <a href="tel:+260977000000" className="text-xs font-bold text-white px-3 py-2 rounded-xl bg-red-500">
              Call
            </a>
          </div>
        </div>

        {/* Privacy settings */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
          <p className="px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wide">Privacy Settings</p>
          {[
            { label: 'Share my location during walks', sub: 'Walkers can see your pickup address', icon: Eye, value: locationSharing, onChange: setLocationSharing },
            { label: 'Public profile visible to walkers', sub: 'Walkers can see your name & photo', icon: EyeOff, value: profileVisible, onChange: setProfileVisible },
            { label: 'Marketing emails', sub: 'Promotions and tips from PawFleet', icon: Lock, value: marketingEmails, onChange: setMarketingEmails },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-4">
              <item.icon className="w-5 h-5 text-ink-secondary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="text-xs text-ink-muted">{item.sub}</p>
              </div>
              <Toggle value={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>

        {/* Report / Block */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
          <p className="px-4 py-3 text-xs font-bold text-ink-muted uppercase tracking-wide">Safety Actions</p>
          {[
            { label: 'Report a walker', icon: AlertTriangle, danger: true },
            { label: 'Block a user', icon: Lock, danger: false },
            { label: 'Data & privacy policy', icon: Shield, danger: false },
          ].map(item => (
            <button key={item.label} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-surface-hover transition-colors text-left">
              <item.icon className={`w-5 h-5 shrink-0 ${item.danger ? 'text-danger' : 'text-ink-secondary'}`} />
              <span className={`flex-1 text-sm font-semibold ${item.danger ? 'text-danger' : 'text-ink'}`}>{item.label}</span>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted pb-2">PawFleet v1.0 · Made by Pegasus AI</p>
      </div>
    </div>
  );
}
