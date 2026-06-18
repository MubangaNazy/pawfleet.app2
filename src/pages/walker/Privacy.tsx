import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, Phone, Lock, Eye, X, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

type ModalType = 'report' | 'policy' | null;

function ReportModal({ onClose }: { onClose: () => void }) {
  const [ownerName, setOwnerName] = useState('');
  const [reason,    setReason]    = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">Report an Issue</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
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
            <div>
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">Owner / Person Name</label>
              <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                placeholder="Full name or phone number"
                className="mt-1.5 w-full border border-surface-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted uppercase tracking-wider">What happened?</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
                placeholder="Describe the incident or concern in detail…"
                className="mt-1.5 w-full border border-surface-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <button type="button" onClick={handleSubmit}
              disabled={!reason.trim()}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              Submit Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function WalkerPrivacy() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalType>(null);

  const sections = [
    {
      icon: Eye,
      title: 'Location Sharing',
      desc: 'Your location is shared with the owner only during an active walk. It is never stored after the walk ends.',
      color: '#2B8A50',
    },
    {
      icon: Lock,
      title: 'Data Privacy',
      desc: 'Your personal information and NRC details are encrypted and only accessible by PawFleet admin staff.',
      color: '#2B8A50',
    },
    {
      icon: Phone,
      title: 'Emergency Contact',
      desc: 'If you ever feel unsafe during a walk, call the PawFleet safety line or end the walk immediately.',
      color: '#2B8A50',
    },
  ];

  return (
    <div className="max-w-xl mx-auto pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-extrabold text-ink leading-tight">Privacy & Safety</h1>
          <p className="text-xs text-ink-muted">Your safety is our priority</p>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-4 mt-5 rounded-3xl p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-white font-extrabold text-base">You're Protected</p>
          <p className="text-white/80 text-xs mt-0.5 leading-snug">PawFleet verifies all owners and enforces a strict code of conduct.</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">

        {/* Privacy sections */}
        {sections.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="flex gap-4 p-4 bg-white border border-surface-border rounded-2xl">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: '#EBF5EF' }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{title}</p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="bg-white border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
          <button type="button" onClick={() => setModal('report')}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-hover text-left">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-danger" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Report a Safety Issue</p>
              <p className="text-xs text-ink-muted">Unsafe owner, harassment, or misconduct</p>
            </div>
          </button>
          <button type="button" onClick={() => setModal('policy')}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-hover text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
              <Lock className="w-4 h-4" style={{ color: '#2B8A50' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Privacy Policy</p>
              <p className="text-xs text-ink-muted">How we collect and use your data</p>
            </div>
          </button>
        </div>

        {/* Emergency notice */}
        <div className="rounded-2xl p-4 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-danger mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-danger">Emergency?</p>
              <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
                If you're in immediate danger, call <strong>991</strong> (Zambia Police) or end the walk and contact PawFleet admin immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {modal === 'report' && <ReportModal onClose={() => setModal(null)} />}

      {modal === 'policy' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-surface-border mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-ink">Privacy Policy</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4 text-sm text-ink-secondary leading-relaxed">
              <p><strong className="text-ink">Data We Collect:</strong> Name, phone, location during walks, walk history.</p>
              <p><strong className="text-ink">How We Use It:</strong> To match you with walk requests, process payments, and improve the platform.</p>
              <p><strong className="text-ink">Location Data:</strong> Only shared with the pet owner during an active walk. Never sold to third parties.</p>
              <p><strong className="text-ink">Your Rights:</strong> You can request deletion of your account data by contacting support.</p>
              <p><strong className="text-ink">Contact:</strong> support@pawfleet.zm</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
