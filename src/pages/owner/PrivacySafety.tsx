import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, EyeOff, AlertTriangle, Phone, Lock, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

type ModalType = 'report' | 'block' | 'policy' | null;

function Modal({ type, onClose }: { type: ModalType; onClose: () => void }) {
  const [walkerName, setWalkerName] = useState('');
  const [reason, setReason] = useState('');
  const [blockTarget, setBlockTarget] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!type) return null;

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => { onClose(); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />

        {/* Report Walker */}
        {type === 'report' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Report a Walker</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted"><X className="w-4 h-4" /></button>
            </div>
            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: '#2B8A50' }} />
                <p className="font-bold text-ink">Report Submitted</p>
                <p className="text-sm text-ink-muted">Our team will review this within 24 hours.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink-muted">Your report is confidential. We take all reports seriously.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-ink-muted mb-1 block">Walker Name / Phone</label>
                    <input type="text" value={walkerName} onChange={e => setWalkerName(e.target.value)}
                      placeholder="e.g. James Mwale or 0971234567"
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted mb-1 block">Reason for Report</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {['Late arrival', 'Rough with dog', 'Unprofessional', 'No-show', 'Theft', 'Other'].map(r => (
                        <button key={r} onClick={() => setReason(r)}
                          className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${reason === r ? 'border-danger bg-danger/10 text-danger' : 'border-surface-border text-ink-muted'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted mb-1 block">Additional Details</label>
                    <textarea rows={3} placeholder="Describe what happened..."
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none" />
                  </div>
                </div>
                <button onClick={handleSubmit} disabled={!walkerName.trim() || !reason}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }}>
                  Submit Report
                </button>
              </>
            )}
          </>
        )}

        {/* Block User */}
        {type === 'block' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Block a User</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted"><X className="w-4 h-4" /></button>
            </div>
            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: '#2B8A50' }} />
                <p className="font-bold text-ink">User Blocked</p>
                <p className="text-sm text-ink-muted">They will no longer be matched with you.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-ink-muted">Blocked users won't appear in your walker list and can't message you.</p>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Walker Name or Phone Number</label>
                  <input type="text" value={blockTarget} onChange={e => setBlockTarget(e.target.value)}
                    placeholder="e.g. James Mwale or 0971234567"
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-800">⚠️ Blocking is permanent unless you contact support to reverse it.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-surface-border text-sm font-semibold text-ink-secondary hover:bg-surface-hover">Cancel</button>
                  <button onClick={handleSubmit} disabled={!blockTarget.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }}>
                    Block User
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Data Policy */}
        {type === 'policy' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">Data & Privacy Policy</h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4 text-sm text-ink-secondary leading-relaxed">
              <div>
                <p className="font-bold text-ink mb-1">What We Collect</p>
                <p>We collect your name, phone number, email, and location data during walks. Dog profiles and walk history are stored to provide our service.</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">How We Use Your Data</p>
                <p>Your data is used to match you with walkers, process payments, and improve PawFleet. We never sell your personal data to third parties.</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Location Data</p>
                <p>GPS location is only active during a walk session. Location data is used to show live tracking to the dog owner and is deleted after 30 days.</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Payments</p>
                <p>Payment processing is handled by Lenco. PawFleet does not store card or PIN details. Transaction records are kept for 12 months for compliance.</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Your Rights</p>
                <p>You may request deletion of your account and data at any time by contacting support@pawfleet.zm. We will process requests within 7 days.</p>
              </div>
              <div>
                <p className="font-bold text-ink mb-1">Contact Us</p>
                <p>PawFleet, Lusaka, Zambia · support@pawfleet.zm · +260 977 000 000</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              I Understand
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PrivacySafety() {
  const navigate = useNavigate();
  const [locationSharing, setLocationSharing] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

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
            { label: 'Report a walker', icon: AlertTriangle, danger: true, modal: 'report' as ModalType },
            { label: 'Block a user', icon: Lock, danger: false, modal: 'block' as ModalType },
            { label: 'Data & privacy policy', icon: Shield, danger: false, modal: 'policy' as ModalType },
          ].map(item => (
            <button key={item.label} onClick={() => setActiveModal(item.modal)}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-surface-hover transition-colors text-left">
              <item.icon className={`w-5 h-5 shrink-0 ${item.danger ? 'text-danger' : 'text-ink-secondary'}`} />
              <span className={`flex-1 text-sm font-semibold ${item.danger ? 'text-danger' : 'text-ink'}`}>{item.label}</span>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-ink-muted pb-2">PawFleet v1.0 · Made by Pegasus AI</p>
      </div>

      <Modal type={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
