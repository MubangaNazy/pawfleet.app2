import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ApplicationForm from './ApplicationForm';
import {
  APPLICATION_FORMS, applicationProblem, cleanApplication, uploadApplicationPhotos,
  type ApplicationValues, type ApplyService,
} from '../../lib/applications';

/** For someone already on PawFleet who wants to add a service (e.g. a walker applying for grooming). */
export default function ApplyServiceSheet({ service, onClose, onDone }: { service: ApplyService; onClose: () => void; onDone: () => void }) {
  const { currentUser, applyForService } = useApp();
  const [answers, setAnswers] = useState<ApplicationValues>(() => (currentUser?.applications?.[service] as ApplicationValues) || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ctx = { isBusiness: false };

  const submit = async () => {
    if (!currentUser || saving) return;
    const problem = applicationProblem(service, answers, ctx);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError('');
    const uploaded = await uploadApplicationPhotos(currentUser.id, service, answers);
    const lost = Object.entries(answers).some(([k, v]) => typeof v === 'string' && v.startsWith('data:') && !uploaded[k]);
    if (lost) { setSaving(false); setError('A photo could not be uploaded. Check your connection and try again.'); return; }
    const err = await applyForService(service, {
      applications: { ...(currentUser.applications || {}), [service]: cleanApplication(service, uploaded, ctx) },
    });
    setSaving(false);
    if (err) { setError(err); return; }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 flex items-center justify-between border-b border-surface-border">
          <h3 className="text-lg font-extrabold text-ink">Apply: {APPLICATION_FORMS[service].title.replace(' details', '')}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <ApplicationForm service={service} value={answers} onChange={setAnswers} ctx={ctx} />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <button type="button" onClick={submit} disabled={saving}
            className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send application'}
          </button>
        </div>
      </div>
    </div>
  );
}
