import { useEffect, useState } from 'react';
import { Check, X, PawPrint, Phone, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchListings, setListingStatus, deleteListing, ageLabel, missingTable,
  type AdoptionListing, type AdoptionStatus,
} from '../../lib/adoption';

const TABS: { id: AdoptionStatus; label: string }[] = [
  { id: 'pending', label: 'Waiting' },
  { id: 'approved', label: 'Live' },
  { id: 'adopted', label: 'Adopted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminAdoptions() {
  const { data, sendNotification } = useApp();
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [tab, setTab] = useState<AdoptionStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await fetchListings();
    setLoading(false);
    if (r.error) setError(missingTable(r.error) ? 'The adoption_listings table is missing. Run supabase/migrations/20261126_adoption_listings.sql in the Supabase SQL Editor.' : r.error);
    else { setError(''); setListings(r.data); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (l: AdoptionListing, status: AdoptionStatus) => {
    let reason: string | undefined;
    if (status === 'rejected') {
      reason = prompt(`Why is ${l.name} not approved? (shown to the person who listed it)`) ?? undefined;
      if (reason === undefined) return;
    }
    setBusy(l.id);
    const err = await setListingStatus(l.id, status, reason);
    setBusy('');
    if (err) { alert(err); return; }
    setListings(prev => prev.map(x => x.id === l.id ? { ...x, status, rejectReason: reason || '' } : x));
    sendNotification(l.listerId, 'adoption_update',
      status === 'approved' ? `${l.name} is now live 🐾` : `${l.name} was not approved`,
      status === 'approved'
        ? `Your adoption listing for ${l.name} is now visible in Adopt a Pet.`
        : `Your listing for ${l.name} was not approved${reason ? `: ${reason}` : '.'}`,
      { listingId: l.id });
  };

  const remove = async (l: AdoptionListing) => {
    if (!confirm(`Delete ${l.name}'s listing permanently?`)) return;
    setBusy(l.id);
    const err = await deleteListing(l.id);
    setBusy('');
    if (err) { alert(err); return; }
    setListings(prev => prev.filter(x => x.id !== l.id));
  };

  const shown = listings.filter(l => l.status === tab);
  const lister = (id: string) => data.users.find(u => u.id === id);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Adoptions</h1>
          <p className="text-sm text-ink-muted">Check each pet before it appears in Adopt a Pet.</p>
        </div>
        <button onClick={load} className="w-10 h-10 rounded-xl border border-surface-border flex items-center justify-center" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map(t => {
          const n = listings.filter(l => l.status === t.id).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 h-9 rounded-full text-sm font-semibold shrink-0 ${tab === t.id ? 'text-white' : 'bg-white border border-surface-border text-ink'}`}
              style={tab === t.id ? { background: '#2B8A50' } : undefined}>
              {t.label}{n ? ` (${n})` : ''}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger bg-red-50 rounded-xl p-3">{error}</p>}
      {!loading && !error && shown.length === 0 && <p className="text-sm text-ink-muted py-10 text-center">Nothing here.</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {shown.map(l => {
          const who = lister(l.listerId);
          return (
            <div key={l.id} className="bg-white rounded-2xl border border-surface-border overflow-hidden">
              {l.photoUrl
                ? <img src={l.photoUrl} alt="" className="w-full h-48 object-cover" />
                : <div className="w-full h-48 bg-[#EBF5EF] flex items-center justify-center"><PawPrint className="w-10 h-10 text-primary/40" /></div>}
              <div className="p-4 space-y-2">
                <div>
                  <p className="font-extrabold text-ink">{l.name}</p>
                  <p className="text-xs text-ink-muted">{l.breed || l.animalType} • {ageLabel(l.ageMonths)} • {l.size || '—'} • {l.sex || '—'}</p>
                </div>
                {l.traits.length > 0 && <p className="text-xs text-primary font-semibold">{l.traits.join(', ')}</p>}
                {l.description && <p className="text-xs text-ink-secondary whitespace-pre-line line-clamp-4">{l.description}</p>}
                <p className="text-xs text-ink-muted">
                  {l.vaccinated ? 'Vaccinated' : 'Not vaccinated'} · {l.sterilised ? 'Sterilised' : 'Not sterilised'} · {l.adoptionFee ? `Fee K${l.adoptionFee}` : 'No fee'}
                </p>
                <p className="text-xs text-ink-muted flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {l.contactPhone} · listed by {who?.name || 'unknown'}{l.location ? ` · ${l.location}` : ''}
                </p>
                {l.rejectReason && <p className="text-xs text-danger">Reason: {l.rejectReason}</p>}

                <div className="flex gap-2 pt-2">
                  {busy === l.id ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : (
                    <>
                      {l.status !== 'approved' && l.status !== 'adopted' && (
                        <button onClick={() => decide(l, 'approved')} className="flex-1 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1" style={{ background: '#2B8A50' }}>
                          <Check className="w-4 h-4" /> Approve
                        </button>
                      )}
                      {l.status !== 'rejected' && l.status !== 'adopted' && (
                        <button onClick={() => decide(l, 'rejected')} className="flex-1 h-10 rounded-xl border-2 border-red-200 text-red-500 text-sm font-bold flex items-center justify-center gap-1">
                          <X className="w-4 h-4" /> {l.status === 'approved' ? 'Take down' : 'Reject'}
                        </button>
                      )}
                      <button onClick={() => remove(l)} aria-label="Delete" className="w-10 h-10 rounded-xl border border-surface-border flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-ink-muted" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
