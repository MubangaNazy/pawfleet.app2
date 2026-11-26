import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Phone, Mail, MapPin, IdCard, Search, Loader2, Store } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { SERVICE_LABEL, providerTitle } from '../../lib/providers';
import type { User, ServiceKey, ApprovalStatus } from '../../types';

type Tab = ServiceKey | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'walking', label: 'Walkers' },
  { id: 'grooming', label: 'Groomers' },
  { id: 'training', label: 'Trainers' },
  { id: 'breeder', label: 'Breeders' },
  { id: 'all', label: 'All providers' },
];
const PROVIDER_SERVICES: ServiceKey[] = ['walking', 'grooming', 'training'];

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  applied: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
};

export default function AdminApplications() {
  const { data, setApproval } = useApp();
  const [tab, setTab] = useState<Tab>('walking');
  const [status, setStatus] = useState<ApprovalStatus>('applied');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const people = useMemo(() => {
    const query = q.trim().toLowerCase();
    return data.users.filter(u => {
      if (tab === 'all') {
        if (u.role !== 'walker') return false;
      } else if (u.approvals?.[tab] !== status) return false;
      if (!query) return true;
      return [u.name, u.businessName, u.email, u.phone, u.businessAddress].filter(Boolean).join(' ').toLowerCase().includes(query);
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [data.users, tab, status, q]);

  const count = (k: ServiceKey) => data.users.filter(u => u.approvals?.[k] === 'applied').length;

  const decide = async (u: User, key: ServiceKey, next: ApprovalStatus | null) => {
    let reason: string | undefined;
    if (next === 'rejected') {
      const r = prompt(`Reason for ${u.businessName || u.name} (shown to them, optional):`);
      if (r === null) return;
      reason = r || undefined;
    }
    setBusy(`${u.id}:${key}`);
    const err = await setApproval(u.id, key, next, reason);
    setBusy('');
    setMsg(err ? `Could not save: ${err}` : `${u.businessName || u.name}: ${SERVICE_LABEL[key]} ${next ?? 'removed'}.`);
    window.setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Applications</h1>
        <p className="text-sm text-ink-muted">
          Each service is approved on its own. Approving someone as a walker does not make them a groomer.
          Vets and shops are added in <Link to="/admin/partners" className="text-primary font-semibold">Vets &amp; Shop Owners</Link>;
          pets for adoption in <Link to="/admin/adoptions" className="text-primary font-semibold">Adoptions</Link>.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const n = t.id === 'all' ? 0 : count(t.id);
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 h-9 rounded-full text-sm font-semibold shrink-0 ${tab === t.id ? 'text-white' : 'bg-white border border-surface-border text-ink'}`}
              style={tab === t.id ? { background: '#2B8A50' } : undefined}>
              {t.label}{n ? <span className="ml-1.5 px-1.5 rounded-full bg-amber-400 text-[10px] text-white">{n}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {tab !== 'all' && (['applied', 'approved', 'rejected'] as ApprovalStatus[]).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 h-8 rounded-lg text-xs font-bold border ${status === s ? STATUS_STYLE[s] : 'bg-white border-surface-border text-ink-muted'}`}>
            {s === 'applied' ? 'Waiting' : s === 'approved' ? 'Approved' : 'Rejected'}
          </button>
        ))}
        <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white border border-surface-border ml-auto w-full sm:w-64">
          <Search className="w-4 h-4 text-ink-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, business, phone"
            className="flex-1 text-sm bg-transparent focus:outline-none" />
        </div>
      </div>

      {msg && <p className="text-sm rounded-xl px-3 py-2 bg-[#EBF5EF] text-primary font-semibold">{msg}</p>}

      {people.length === 0 && <p className="text-sm text-ink-muted text-center py-12">Nobody here.</p>}

      <div className="grid md:grid-cols-2 gap-3">
        {people.map(u => {
          const services: ServiceKey[] = tab === 'breeder' ? ['breeder'] : u.role === 'walker' ? PROVIDER_SERVICES : [];
          return (
            <div key={u.id} className="bg-white rounded-2xl border border-surface-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                {u.imageUrl
                  ? <img src={u.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  : <div className="w-14 h-14 rounded-xl bg-[#EBF5EF] shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink truncate">{u.businessName || u.name}</p>
                  {u.businessName && <p className="text-xs text-ink-muted truncate">Contact: {u.name}</p>}
                  <p className="text-[11px] font-semibold text-primary mt-0.5">
                    {u.role === 'walker' ? providerTitle(u) : u.businessType === 'shelter' ? 'Shelter / rescue' : u.approvals?.breeder ? 'Breeder' : u.role}
                  </p>
                </div>
                <p className="text-[10px] text-ink-muted shrink-0">{u.createdAt ? format(parseISO(u.createdAt), 'd MMM yyyy') : ''}</p>
              </div>

              <div className="grid grid-cols-1 gap-1 text-xs text-ink-secondary">
                {u.phone && <a href={`tel:${u.phone}`} className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {u.phone}</a>}
                {u.email && <a href={`mailto:${u.email}`} className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {u.email}</a>}
                {u.businessAddress && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {u.businessAddress}</p>}
                {u.nrc && <p className="flex items-center gap-1.5"><IdCard className="w-3 h-3" /> {u.nrc}</p>}
                {u.businessType && <p className="flex items-center gap-1.5"><Store className="w-3 h-3" /> {u.businessType.replace('_', ' ')}</p>}
              </div>

              {u.nrcImageUrl && (
                <a href={u.nrcImageUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={u.nrcImageUrl} alt="ID document" className="w-full h-32 object-cover rounded-xl border border-surface-border" />
                  <span className="text-[10px] text-ink-muted">ID / registration document — tap to open full size</span>
                </a>
              )}

              <div className="space-y-2 pt-1">
                {services.map(k => {
                  const st = u.approvals?.[k];
                  const isBusy = busy === `${u.id}:${k}`;
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink w-28 shrink-0">{SERVICE_LABEL[k]}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st ? STATUS_STYLE[st] : 'bg-surface-secondary text-ink-muted border-transparent'}`}>
                        {st === 'applied' ? 'waiting' : st || 'off'}
                      </span>
                      <div className="ml-auto flex gap-1.5">
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : (
                          <>
                            {st !== 'approved' && (
                              <button onClick={() => decide(u, k, 'approved')} title="Approve"
                                className="h-8 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1" style={{ background: '#2B8A50' }}>
                                <Check className="w-3.5 h-3.5" /> {st ? 'Approve' : 'Turn on'}
                              </button>
                            )}
                            {st && st !== 'rejected' && (
                              <button onClick={() => decide(u, k, 'rejected')} title={st === 'approved' ? 'Remove' : 'Reject'}
                                className="h-8 px-3 rounded-lg text-xs font-bold border border-red-200 text-red-500 flex items-center gap-1">
                                <X className="w-3.5 h-3.5" /> {st === 'approved' ? 'Remove' : 'Reject'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {services.includes('grooming') && u.approvals?.grooming === 'approved' && u.pricing?.grooming == null && (
                  <p className="text-[11px] text-amber-700">Approved for grooming, but has not set a grooming price yet, so owners can't book them.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
