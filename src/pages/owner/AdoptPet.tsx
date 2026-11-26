import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, SlidersHorizontal, Heart, X, Phone, MessageCircle, MapPin, Plus, Camera,
  Loader2, CheckCircle2, PawPrint, Clock, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import BreedPicker from '../../components/ui/BreedPicker';
import { isBreeder } from '../../lib/providers';
import { uploadDataUrlToStorage } from '../../lib/image';
import { prepareImage } from '../../lib/image';
import {
  fetchListings, createListing, setListingStatus, deleteListing, loadFavs, saveFavs, ageLabel,
  whatsappLink, missingTable, TRAIT_OPTIONS, type AdoptionListing, type NewListing,
} from '../../lib/adoption';

type Chip = 'all' | 'dog' | 'other' | 'favs';
type AgeGroup = 'any' | 'puppy' | 'adult' | 'senior';
type SizeFilter = 'any' | 'small' | 'medium' | 'large';

const CHIPS: { id: Chip; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'dog', label: 'Dogs' },
  { id: 'other', label: 'Other pets' },
  { id: 'favs', label: 'Saved' },
];

function Photo({ src, className }: { src: string; className: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return <div className={`${className} bg-[#EBF5EF] flex items-center justify-center`}><PawPrint className="w-7 h-7 text-primary/50" /></div>;
  }
  return <img src={src} alt="" loading="lazy" onError={() => setBad(true)} className={`${className} object-cover`} />;
}

export default function AdoptPet() {
  const navigate = useNavigate();
  const { currentUser, data, sendNotification } = useApp();
  const me = data.users.find(u => u.id === currentUser?.id) ?? currentUser;
  const breederStatus = me?.approvals?.breeder;
  const canList = isBreeder(me) || me?.role === 'admin';
  const [showApply, setShowApply] = useState(false);
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [age, setAge] = useState<AgeGroup>('any');
  const [size, setSize] = useState<SizeFilter>('any');
  const [showFilter, setShowFilter] = useState(false);
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [open, setOpen] = useState<AdoptionListing | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await fetchListings();
    setLoading(false);
    if (r.error) setLoadError(missingTable(r.error) ? 'Adopt a Pet is being set up. Check back soon.' : 'Could not load pets. Pull down or try again.');
    else { setLoadError(''); setListings(r.data); }
  };
  useEffect(() => { load(); }, []);

  const toggleFav = (id: string) => {
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveFavs(next);
      return next;
    });
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(l => {
      if (l.status !== 'approved') return false;
      if (chip === 'dog' && l.animalType !== 'dog') return false;
      if (chip === 'other' && l.animalType !== 'other') return false;
      if (chip === 'favs' && !favs.includes(l.id)) return false;
      if (size !== 'any' && l.size !== size) return false;
      if (age !== 'any') {
        const m = l.ageMonths;
        if (m == null) return false;
        if (age === 'puppy' && m >= 12) return false;
        if (age === 'adult' && (m < 12 || m >= 96)) return false;
        if (age === 'senior' && m < 96) return false;
      }
      if (!q) return true;
      return [l.name, l.breed, l.location, ...l.traits].join(' ').toLowerCase().includes(q);
    });
  }, [listings, chip, favs, size, age, query]);

  const mine = listings.filter(l => l.listerId === currentUser?.id && l.status !== 'approved');
  const activeFilters = (age !== 'any' ? 1 : 0) + (size !== 'any' ? 1 : 0);

  const onCreated = (l: AdoptionListing) => {
    setListings(prev => [l, ...prev]);
    setShowForm(false);
    setToast(`${l.name} was sent for review. We'll notify you once it's live.`);
    data.users.filter(u => u.role === 'admin').forEach(a =>
      sendNotification(a.id, 'adoption_listing', 'New pet for adoption',
        `${currentUser?.name || 'Someone'} listed ${l.name}${l.breed ? ` (${l.breed})` : ''}. Review it in Admin → Adoptions.`,
        { listingId: l.id }));
  };

  const markAdopted = async (l: AdoptionListing) => {
    const err = await setListingStatus(l.id, 'adopted');
    if (err) { setToast(err); return; }
    setListings(prev => prev.map(x => x.id === l.id ? { ...x, status: 'adopted' } : x));
    setOpen(null);
    setToast(`Congratulations! ${l.name} is marked as adopted.`);
  };

  const remove = async (l: AdoptionListing) => {
    if (!confirm(`Remove ${l.name}'s listing?`)) return;
    const err = await deleteListing(l.id);
    if (err) { setToast(err); return; }
    setListings(prev => prev.filter(x => x.id !== l.id));
    setOpen(null);
  };

  return (
    <div className="max-w-2xl mx-auto min-h-full pb-32" style={{ background: '#FBFAF7' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="Back"
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-black/5">
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <h1 className="text-lg font-extrabold text-ink">Adopt a Pet</h1>
        <button onClick={() => setShowFilter(true)} aria-label="Filter"
          className="relative w-10 h-10 -mr-2 flex items-center justify-center rounded-full hover:bg-black/5">
          <SlidersHorizontal className="w-5 h-5 text-ink" />
          {activeFilters > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{activeFilters}</span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-4">
        <div className="flex items-center gap-2.5 h-12 px-4 rounded-2xl bg-white border border-surface-border shadow-sm">
          <Search className="w-4 h-4 text-ink-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pets..."
            className="flex-1 bg-transparent text-sm text-ink focus:outline-none" />
          {query && <button onClick={() => setQuery('')} aria-label="Clear"><X className="w-4 h-4 text-ink-muted" /></button>}
        </div>
      </div>

      {/* Chips */}
      <div className="px-4 mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {CHIPS.map(c => (
          <button key={c.id} onClick={() => setChip(c.id)}
            className={`px-5 h-9 rounded-full text-sm font-semibold shrink-0 transition-colors ${chip === c.id ? 'text-white shadow-md' : 'bg-white text-ink border border-surface-border'}`}
            style={chip === c.id ? { background: '#2B8A50' } : undefined}>
            {c.label}
          </button>
        ))}
      </div>

      {/* My listings awaiting review */}
      {mine.length > 0 && (
        <div className="px-4 mt-5">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Your listings</p>
          <div className="space-y-2">
            {mine.map(l => (
              <div key={l.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-surface-border">
                <Photo src={l.photoUrl} className="w-12 h-12 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{l.name}</p>
                  <p className={`text-[11px] font-semibold ${l.status === 'rejected' ? 'text-danger' : l.status === 'adopted' ? 'text-primary' : 'text-amber-600'}`}>
                    {l.status === 'pending' && <><Clock className="w-3 h-3 inline -mt-0.5" /> Waiting for review</>}
                    {l.status === 'rejected' && `Not approved${l.rejectReason ? `: ${l.rejectReason}` : ''}`}
                    {l.status === 'adopted' && 'Adopted 🎉'}
                  </p>
                </div>
                <button onClick={() => remove(l)} aria-label="Remove" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-4 mt-5 space-y-3">
        {loading && [0, 1, 2].map(i => (
          <div key={i} className="h-[104px] rounded-3xl bg-white border border-surface-border animate-pulse" />
        ))}

        {!loading && loadError && (
          <div className="text-center py-12">
            <p className="text-sm text-ink-muted">{loadError}</p>
            <button onClick={load} className="mt-3 text-sm font-bold text-primary">Try again</button>
          </div>
        )}

        {!loading && !loadError && visible.length === 0 && (
          <div className="text-center py-14 px-6">
            <div className="w-16 h-16 rounded-full bg-[#EBF5EF] flex items-center justify-center mx-auto mb-3">
              <PawPrint className="w-8 h-8 text-primary" />
            </div>
            <p className="font-bold text-ink">{chip === 'favs' ? 'No saved pets yet' : 'No pets match right now'}</p>
            <p className="text-sm text-ink-muted mt-1">
              {chip === 'favs' ? 'Tap the heart on a pet to save it here.' : 'New pets are added often. Know a dog that needs a home? List it below.'}
            </p>
          </div>
        )}

        {!loading && visible.map(l => {
          const fav = favs.includes(l.id);
          return (
            <div key={l.id} onClick={() => setOpen(l)} role="button" tabIndex={0}
              className="flex items-center gap-4 bg-white rounded-3xl p-3 pr-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-black/[0.03] active:scale-[0.99] transition-transform cursor-pointer">
              <Photo src={l.photoUrl} className="w-20 h-20 rounded-2xl shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-extrabold text-ink truncate">{l.name}</p>
                <p className="text-xs text-ink-muted truncate">{l.breed || (l.animalType === 'dog' ? 'Dog' : 'Pet')} • {ageLabel(l.ageMonths)}</p>
                {l.traits.length > 0 && (
                  <p className="text-xs font-semibold mt-1 truncate" style={{ color: '#2B8A50' }}>{l.traits.slice(0, 2).join(' & ')}</p>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); toggleFav(l.id); }} aria-label={fav ? 'Unsave' : 'Save'}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 shrink-0">
                <Heart className={`w-5 h-5 ${fav ? 'fill-red-500 text-red-500' : 'text-ink-muted'}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* List a pet */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 z-20 pointer-events-none">
        <div className="max-w-2xl mx-auto flex justify-end">
          {/* Only verified breeders and shelters can list pets; everyone else applies first. */}
          {canList ? (
            <button onClick={() => setShowForm(true)}
              className="pointer-events-auto flex items-center gap-2 px-5 h-12 rounded-full text-white text-sm font-bold shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <Plus className="w-4 h-4" /> List a pet
            </button>
          ) : breederStatus === 'applied' ? (
            <span className="pointer-events-auto flex items-center gap-2 px-5 h-12 rounded-full text-amber-800 text-sm font-bold shadow-xl bg-amber-50 border border-amber-200">
              <Clock className="w-4 h-4" /> Breeder application under review
            </span>
          ) : currentUser?.role === 'owner' ? (
            <button onClick={() => setShowApply(true)}
              className="pointer-events-auto flex items-center gap-2 px-5 h-12 rounded-full text-white text-sm font-bold shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <Plus className="w-4 h-4" /> Apply to list pets
            </button>
          ) : null}
        </div>
      </div>

      {toast && (
        <div className="fixed top-20 left-4 right-4 z-[60] max-w-md mx-auto bg-ink text-white text-sm rounded-2xl px-4 py-3 shadow-xl flex items-start gap-2" onClick={() => setToast('')}>
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#52B788]" /> <span className="flex-1">{toast}</span>
        </div>
      )}

      {showFilter && (
        <Sheet onClose={() => setShowFilter(false)} title="Filter">
          <FilterGroup label="Age" value={age} onChange={v => setAge(v as AgeGroup)}
            options={[['any', 'Any'], ['puppy', 'Puppy (< 1 yr)'], ['adult', 'Adult'], ['senior', 'Senior (8+ yrs)']]} />
          <FilterGroup label="Size" value={size} onChange={v => setSize(v as SizeFilter)}
            options={[['any', 'Any'], ['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]} />
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setAge('any'); setSize('any'); }} className="flex-1 h-12 rounded-2xl border-2 border-surface-border text-sm font-bold text-ink">Reset</button>
            <button onClick={() => setShowFilter(false)} className="flex-1 h-12 rounded-2xl text-sm font-bold text-white" style={{ background: '#2B8A50' }}>Show {visible.length} pets</button>
          </div>
        </Sheet>
      )}

      {open && (
        <ListingSheet listing={open} fav={favs.includes(open.id)} onFav={() => toggleFav(open.id)}
          isMine={open.listerId === currentUser?.id} onAdopted={() => markAdopted(open)} onRemove={() => remove(open)}
          onClose={() => setOpen(null)} />
      )}

      {showApply && currentUser && (
        <BreederApplyForm onClose={() => setShowApply(false)}
          onDone={() => { setShowApply(false); setToast('Application sent. You can list pets once PawFleet approves you.'); }} />
      )}

      {showForm && currentUser && canList && (
        <ListPetForm defaultPhone={currentUser.phone || ''} listerId={currentUser.id} onDone={onCreated} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-10 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="w-10 h-1 rounded-full bg-surface-border mx-auto" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FilterGroup({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, text]) => (
          <button key={id} onClick={() => onChange(id)}
            className={`px-4 h-9 rounded-full text-sm font-semibold ${value === id ? 'text-white' : 'bg-surface-secondary text-ink'}`}
            style={value === id ? { background: '#2B8A50' } : undefined}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function ListingSheet({ listing: l, fav, onFav, isMine, onAdopted, onRemove, onClose }: {
  listing: AdoptionListing; fav: boolean; onFav: () => void; isMine: boolean;
  onAdopted: () => void; onRemove: () => void; onClose: () => void;
}) {
  const facts: [string, string][] = [
    ['Age', ageLabel(l.ageMonths)],
    ['Sex', l.sex === 'male' ? 'Male' : l.sex === 'female' ? 'Female' : 'Unknown'],
    ['Size', l.size ? l.size[0].toUpperCase() + l.size.slice(1) : '—'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="relative">
          <Photo src={l.photoUrl} className="w-full h-72" />
          <button onClick={onClose} aria-label="Close" className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow"><X className="w-5 h-5" /></button>
          <button onClick={onFav} aria-label="Save" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
            <Heart className={`w-5 h-5 ${fav ? 'fill-red-500 text-red-500' : 'text-ink'}`} />
          </button>
        </div>
        <div className="px-5 pt-4 pb-10 space-y-4">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">{l.name}</h2>
            <p className="text-sm text-ink-muted">{l.breed || (l.animalType === 'dog' ? 'Dog' : 'Pet')}</p>
            {l.location && <p className="text-xs text-ink-muted mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.location}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-[#EBF5EF] py-3 text-center">
                <p className="text-sm font-extrabold" style={{ color: '#1B4332' }}>{v}</p>
                <p className="text-[10px] text-ink-muted">{k}</p>
              </div>
            ))}
          </div>
          {l.traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {l.traits.map(t => <span key={t} className="px-3 py-1 rounded-full bg-surface-secondary text-xs font-semibold text-ink">{t}</span>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-3 py-1 rounded-full font-semibold ${l.vaccinated ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{l.vaccinated ? '✓ Vaccinated' : 'Not vaccinated yet'}</span>
            <span className={`px-3 py-1 rounded-full font-semibold ${l.sterilised ? 'bg-green-50 text-green-700' : 'bg-surface-secondary text-ink-muted'}`}>{l.sterilised ? '✓ Sterilised' : 'Not sterilised'}</span>
            <span className="px-3 py-1 rounded-full font-semibold bg-surface-secondary text-ink">{l.adoptionFee ? `Adoption fee K${l.adoptionFee}` : 'No adoption fee'}</span>
          </div>
          {l.description && (
            <div>
              <p className="text-sm font-bold text-ink mb-1">About {l.name}</p>
              <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line">{l.description}</p>
            </div>
          )}

          {isMine ? (
            <div className="flex gap-3 pt-1">
              <button onClick={onRemove} className="flex-1 h-12 rounded-2xl border-2 border-red-200 text-sm font-bold text-red-500">Remove</button>
              {l.status !== 'adopted' && (
                <button onClick={onAdopted} className="flex-1 h-12 rounded-2xl text-sm font-bold text-white" style={{ background: '#2B8A50' }}>Mark adopted</button>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-3 pt-1">
                <a href={whatsappLink(l.contactPhone, l.name)} target="_blank" rel="noopener noreferrer"
                  className="flex-1 h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: '#25D366' }}>
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <a href={`tel:${l.contactPhone}`}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: '#1B4332' }}>
                  <Phone className="w-4 h-4" /> Call
                </a>
              </div>
              <p className="text-[11px] text-ink-muted text-center leading-relaxed">
                Meet in a safe public place, and never send money before you have met the pet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ListPetForm({ defaultPhone, listerId, onDone, onClose }: {
  defaultPhone: string; listerId: string; onDone: (l: AdoptionListing) => void; onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<NewListing>({
    name: '', animalType: 'dog', breed: '', ageMonths: null, sex: 'unknown', size: 'medium',
    traits: [], description: '', photoDataUrl: '', location: '', contactPhone: defaultPhone,
    vaccinated: false, sterilised: false, adoptionFee: null,
  });
  const [ageNum, setAgeNum] = useState('');
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('years');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof NewListing>(k: K, v: NewListing[K]) => setF(prev => ({ ...prev, [k]: v }));

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try { set('photoDataUrl', await prepareImage(file, { maxDim: 900, quality: 0.82, maxBytes: 220_000 })); }
    catch { setError('That photo could not be read. Try another one.'); }
  };

  const submit = async () => {
    if (saving) return;
    if (!f.name.trim()) return setError("Add the pet's name.");
    if (!f.photoDataUrl) return setError('Add a photo — listings with photos get adopted much faster.');
    if (f.contactPhone.replace(/\D/g, '').length < 9) return setError('Add a phone number people can call or WhatsApp.');
    const n = Number(ageNum);
    const ageMonths = ageNum.trim() && Number.isFinite(n) && n >= 0 ? Math.round(ageUnit === 'years' ? n * 12 : n) : null;
    setError('');
    setSaving(true);
    const r = await createListing(listerId, { ...f, ageMonths });
    setSaving(false);
    if (r.error || !r.data) { setError(r.error || 'Could not save. Please try again.'); return; }
    onDone(r.data);
  };

  const input = 'w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink focus:outline-none focus:border-primary';

  return (
    <Sheet title="List a pet for adoption" onClose={onClose}>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full h-44 rounded-2xl border-2 border-dashed border-surface-border bg-surface-secondary overflow-hidden flex items-center justify-center">
        {f.photoDataUrl
          ? <img src={f.photoDataUrl} alt="" className="w-full h-full object-cover" />
          : <span className="flex flex-col items-center gap-1 text-ink-muted text-sm"><Camera className="w-6 h-6" /> Add a photo</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pickPhoto(e.target.files?.[0])} />

      <input className={input} placeholder="Name, e.g. Max" value={f.name} onChange={e => set('name', e.target.value.slice(0, 60))} />

      <div className="flex gap-2">
        {(['dog', 'other'] as const).map(t => (
          <button key={t} type="button" onClick={() => set('animalType', t)}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold ${f.animalType === t ? 'text-white' : 'bg-surface-secondary text-ink'}`}
            style={f.animalType === t ? { background: '#2B8A50' } : undefined}>{t === 'dog' ? 'Dog' : 'Other pet'}</button>
        ))}
      </div>

      {f.animalType === 'dog'
        ? <BreedPicker value={f.breed} onChange={v => set('breed', v)} />
        : <input className={input} placeholder="What kind of pet? e.g. Rabbit" value={f.breed} onChange={e => set('breed', e.target.value.slice(0, 60))} />}

      <div className="flex gap-2">
        <input className={`${input} flex-1`} inputMode="decimal" placeholder="Age" value={ageNum} onChange={e => setAgeNum(e.target.value.replace(/[^\d.]/g, ''))} />
        <select className={`${input} w-32`} value={ageUnit} onChange={e => setAgeUnit(e.target.value as 'months' | 'years')}>
          <option value="years">years</option><option value="months">months</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={f.sex} onChange={e => set('sex', e.target.value as NewListing['sex'])}>
          <option value="unknown">Sex: unknown</option><option value="male">Male</option><option value="female">Female</option>
        </select>
        <select className={input} value={f.size} onChange={e => set('size', e.target.value as NewListing['size'])}>
          <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
        </select>
      </div>

      <div>
        <p className="text-xs font-bold text-ink-muted mb-2">Personality (pick up to 4)</p>
        <div className="flex flex-wrap gap-1.5">
          {TRAIT_OPTIONS.map(t => {
            const on = f.traits.includes(t);
            return (
              <button key={t} type="button"
                onClick={() => set('traits', on ? f.traits.filter(x => x !== t) : f.traits.length < 4 ? [...f.traits, t] : f.traits)}
                className={`px-3 h-8 rounded-full text-xs font-semibold ${on ? 'text-white' : 'bg-surface-secondary text-ink'}`}
                style={on ? { background: '#2B8A50' } : undefined}>{t}</button>
            );
          })}
        </div>
      </div>

      <textarea className={`${input} h-24 py-3`} placeholder="Tell adopters about this pet: habits, health, why they need a new home…"
        value={f.description} onChange={e => set('description', e.target.value.slice(0, 1500))} />

      <div className="flex gap-4 text-sm text-ink">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.vaccinated} onChange={e => set('vaccinated', e.target.checked)} /> Vaccinated</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.sterilised} onChange={e => set('sterilised', e.target.checked)} /> Sterilised</label>
      </div>

      <input className={input} placeholder="Area, e.g. Kabulonga, Lusaka" value={f.location} onChange={e => set('location', e.target.value.slice(0, 120))} />
      <input className={input} type="tel" placeholder="Contact phone (WhatsApp)" value={f.contactPhone} onChange={e => set('contactPhone', e.target.value.slice(0, 20))} />
      <input className={input} inputMode="numeric" placeholder="Adoption fee in K (leave empty if free)"
        value={f.adoptionFee ?? ''} onChange={e => { const v = e.target.value.replace(/\D/g, ''); set('adoptionFee', v ? Number(v) : null); }} />

      {error && <p className="text-sm text-danger text-center">{error}</p>}

      <button onClick={submit} disabled={saving}
        className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send for review'}
      </button>
      <p className="text-[11px] text-ink-muted text-center">A PawFleet admin checks every listing before it goes live.</p>
    </Sheet>
  );
}

function BreederApplyForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { currentUser, applyForService } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<'breeder' | 'shelter'>('breeder');
  const [name, setName] = useState(currentUser?.businessName || '');
  const [area, setArea] = useState(currentUser?.businessAddress || '');
  const [idNo, setIdNo] = useState(currentUser?.nrc || '');
  const [idPhoto, setIdPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const input = 'w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink focus:outline-none focus:border-primary';

  const submit = async () => {
    if (!currentUser || saving) return;
    if (!name.trim()) return setError(type === 'shelter' ? 'Enter the shelter name.' : 'Enter your kennel name.');
    if (!area.trim()) return setError('Enter your area.');
    if (!idNo.trim()) return setError('Enter your NRC or registration number.');
    if (!idPhoto && !currentUser.nrcImageUrl) return setError('Add a photo of your NRC or registration certificate.');
    setSaving(true);
    setError('');
    let nrcImageUrl: string | undefined;
    if (idPhoto) {
      nrcImageUrl = (await uploadDataUrlToStorage('avatars', `nrc/${currentUser.id}.jpg`, idPhoto)) || undefined;
      if (!nrcImageUrl) { setSaving(false); return setError('Could not upload the photo. Check your connection.'); }
    }
    const err = await applyForService('breeder', {
      businessName: name.trim(), businessAddress: area.trim(), businessType: type, nrc: idNo.trim(),
      ...(nrcImageUrl ? { nrcImageUrl } : {}),
    });
    setSaving(false);
    if (err) return setError(err);
    onDone();
  };

  return (
    <Sheet title="Apply to list pets" onClose={onClose}>
      <p className="text-sm text-ink-muted">To keep Adopt a Pet safe, only verified breeders and shelters can list dogs. Tell us who you are and PawFleet will review it.</p>
      <div className="flex gap-2">
        {(['breeder', 'shelter'] as const).map(t => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold ${type === t ? 'text-white' : 'bg-surface-secondary text-ink'}`}
            style={type === t ? { background: '#2B8A50' } : undefined}>{t === 'breeder' ? 'Breeder' : 'Shelter / rescue'}</button>
        ))}
      </div>
      <input className={input} placeholder={type === 'shelter' ? 'Shelter / rescue name' : 'Kennel name'} value={name} onChange={e => setName(e.target.value.slice(0, 80))} />
      <input className={input} placeholder="Area, e.g. Kabulonga, Lusaka" value={area} onChange={e => setArea(e.target.value.slice(0, 120))} />
      <input className={input} placeholder="NRC or PACRA registration number" value={idNo} onChange={e => setIdNo(e.target.value.slice(0, 40))} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full h-28 rounded-2xl border-2 border-dashed border-surface-border bg-surface-secondary overflow-hidden flex items-center justify-center">
        {idPhoto ? <img src={idPhoto} alt="" className="w-full h-full object-cover" />
          : <span className="flex flex-col items-center gap-1 text-ink-muted text-sm"><Camera className="w-5 h-5" />{currentUser?.nrcImageUrl ? 'ID on file — tap to replace' : 'Photo of NRC or certificate'}</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { try { setIdPhoto(await prepareImage(f, { maxDim: 1400, quality: 0.75, maxBytes: 300_000 })); } catch { setError('That photo could not be read.'); } } }} />
      {error && <p className="text-sm text-danger text-center">{error}</p>}
      <button onClick={submit} disabled={saving}
        className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send application'}
      </button>
    </Sheet>
  );
}
