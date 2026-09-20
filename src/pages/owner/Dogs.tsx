import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, Plus, X, ArrowRight, Upload, ChevronDown, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';

// ── Breed lists ──────────────────────────────────────────────
const DOG_BREEDS = [
  'Mixed / Unknown',
  'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'French Bulldog',
  'Bulldog', 'Poodle (Standard)', 'Poodle (Toy/Miniature)', 'Beagle', 'Rottweiler',
  'Yorkshire Terrier', 'Boxer', 'Siberian Husky', 'Dachshund', 'Great Dane',
  'Doberman Pinscher', 'Miniature Schnauzer', 'Shih Tzu', 'Boston Terrier',
  'Bernese Mountain Dog', 'Pomeranian', 'Havanese', 'Border Collie',
  'Cavalier King Charles Spaniel', 'Shetland Sheepdog', 'English Springer Spaniel',
  'English Cocker Spaniel', 'Maltese', 'Mastiff', 'Weimaraner',
  'Rhodesian Ridgeback', 'Basset Hound', 'Newfoundland', 'Belgian Malinois',
  'Bichon Frisé', 'West Highland Terrier', 'Akita', 'Chihuahua',
  'Staffordshire Bull Terrier', 'American Pit Bull Terrier', 'Irish Setter',
  'Cocker Spaniel', 'Vizsla', 'Alaskan Malamute', 'Chow Chow',
  'Australian Shepherd', 'Shiba Inu', 'Jack Russell Terrier', 'Pug',
  'Lhasa Apso', 'Airedale Terrier', 'Bloodhound', 'Whippet', 'Samoyed',
  'Basenji', 'Dalmatian', 'Greyhound', 'Bull Terrier', 'Shar-Pei',
  'Other',
];
const CAT_BREEDS = [
  'Mixed / Unknown', 'Domestic Shorthair', 'Domestic Longhair',
  'Siamese', 'Persian', 'Maine Coon', 'Ragdoll', 'Abyssinian',
  'British Shorthair', 'Russian Blue', 'Bengal', 'Birman',
  'Scottish Fold', 'Burmese', 'Devon Rex', 'Sphynx', 'Turkish Angora',
  'American Shorthair', 'Himalayan', 'Norwegian Forest Cat', 'Other',
];

function BreedPicker({ animalType, value, onChange }: {
  animalType: 'dog' | 'cat'; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const breeds = animalType === 'dog' ? DOG_BREEDS : CAT_BREEDS;
  const filtered = breeds.filter(b => b.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink flex items-center justify-between focus:outline-none focus:border-primary transition-all">
        <span className={value ? 'text-ink' : 'text-ink-muted'}>{value || 'Select breed'}</span>
        <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 bg-white border border-surface-border rounded-2xl shadow-xl overflow-hidden"
          style={{ maxHeight: 280 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
            <Search className="w-4 h-4 text-ink-muted shrink-0" />
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search breed…"
              className="flex-1 text-sm focus:outline-none bg-transparent" />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {filtered.length === 0
              ? <p className="text-center text-sm text-ink-muted py-6">No breeds found</p>
              : filtered.map(b => (
                <button key={b} type="button"
                  onClick={() => { onChange(b); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-secondary transition-colors ${value === b ? 'font-bold text-primary bg-primary/5' : 'text-ink'}`}>
                  {b}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

async function resizePhoto(file: File, maxDim = 512, quality = 0.78): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h / w) * maxDim); w = maxDim; }
          else { w = Math.round((w / h) * maxDim); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function AddDogModal({ onClose }: { onClose: () => void }) {
  const { currentUser, createDog } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [animalType, setAnimalType] = useState<'dog' | 'cat'>('dog');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [ageValue, setAgeValue] = useState('');
  const [ageUnit, setAgeUnit] = useState<'years' | 'months'>('years');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizePhoto(file);
    setPreview(resized);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !name.trim()) return;
    setSaving(true);
    setSaveError('');
    const ageInYears = ageValue
      ? (ageUnit === 'months' ? Number(ageValue) / 12 : Number(ageValue))
      : undefined;
    const result = await createDog({
      name: name.trim(),
      breed: breed || undefined,
      age: ageInYears,
      notes: notes.trim() || undefined,
      ownerId: currentUser.id,
      imageUrl: preview || undefined,
      healthLogs: [],
      animalType,
    });
    if (result.error) {
      setSaving(false);
      setSaveError(result.error);
      return;
    }
    if (result.warning) {
      setSaveError(result.warning);
      setTimeout(onClose, 2200);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto bg-white rounded-t-3xl w-full max-w-lg mx-auto overflow-y-auto"
        style={{ maxHeight: '92vh' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
          <h2 className="text-lg font-bold text-ink">Add a Pet</h2>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-hover text-ink-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5 pb-10">
          {/* Photo picker */}
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative w-28 h-28 rounded-3xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary transition-colors flex items-center justify-center bg-primary-50 group"
              style={preview ? { border: 'none' } : {}}>
              {preview ? (
                <>
                  <img src={preview} alt="Dog" className="w-28 h-28 object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-primary/60">
                  <Camera className="w-7 h-7" />
                  <span className="text-[11px] font-medium">Add Photo</span>
                </div>
              )}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => {
                if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); }
              }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium text-ink-secondary hover:bg-surface-hover transition-colors">
                <Upload className="w-3 h-3" /> Gallery
              </button>
              <button type="button" onClick={() => {
                if (fileRef.current) { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click(); }
              }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-medium text-ink-secondary hover:bg-surface-hover transition-colors">
                <Camera className="w-3 h-3" /> Camera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Animal Type */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Animal Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['dog', 'cat'] as const).map(type => (
                <button key={type} type="button" onClick={() => setAnimalType(type)}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                    animalType === type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-surface-border text-ink-secondary hover:bg-surface-hover'
                  }`}>
                  <span className="text-xl">{type === 'dog' ? '🐕' : '🐈'}</span>
                  {type === 'dog' ? 'Dog' : 'Cat'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">
              {animalType === 'dog' ? "Dog's" : "Cat's"} Name <span className="text-danger">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={animalType === 'dog' ? 'e.g. Rex, Coco, Luna' : 'e.g. Whiskers, Mochi, Luna'} required
              className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Breed</label>
            <BreedPicker animalType={animalType} value={breed} onChange={setBreed} />
          </div>

          {/* Age */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-ink-secondary">Age</label>
              <div className="flex p-0.5 rounded-lg border border-surface-border bg-surface-secondary">
                {(['years', 'months'] as const).map(u => (
                  <button key={u} type="button" onClick={() => setAgeUnit(u)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      ageUnit === u ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'
                    }`}>{u}</button>
                ))}
              </div>
            </div>
            <input
              type="number" min="0"
              max={ageUnit === 'months' ? '240' : '30'}
              step="any"
              value={ageValue} onChange={e => setAgeValue(e.target.value)}
              placeholder={ageUnit === 'months' ? 'e.g. 3' : 'e.g. 2'}
              className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
            {ageUnit === 'months' && <p className="text-xs text-ink-muted mt-1">Perfect for puppies — enter their age in months</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Allergies, favourite treats, special behaviour..."
              className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all resize-none" />
          </div>

          {saveError && (
            <div className="rounded-xl border px-4 py-3 text-xs font-medium leading-relaxed"
              style={saving ? { background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' } : { background: '#FEF2F2', borderColor: '#FECACA', color: '#B91C1C' }}>
              {saveError}
            </div>
          )}

          <button type="submit" disabled={saving || !name.trim()}
            className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </>
            ) : (
              <>Add {animalType === 'dog' ? 'Dog' : 'Cat'}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OwnerDogs() {
  const { data, currentUser, loading } = useApp();
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#F4F7F5' }}>

      {/* Hero header */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #071a0e 0%, #1B4332 55%, #2B8A50 100%)', paddingBottom: 32 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '55vw', height: '55vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(82,183,136,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="px-5 pt-14 pb-2">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">PawFleet</p>
          <h1 className="text-white font-extrabold text-3xl leading-tight">My Pets</h1>
          <p className="text-white/60 text-sm mt-1">
            {loading ? 'Loading…' : myDogs.length === 0 ? 'No pets registered yet' : `${myDogs.length} registered pet${myDogs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Cards area — overlaps hero with rounded top */}
      <div className="px-4 -mt-4 pb-24 space-y-4">

        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse shadow-lg">
              <div className="bg-gray-200" style={{ height: 200 }} />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 rounded-lg w-2/3" />
                <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[1,2,3].map(j => <div key={j} className="h-12 bg-gray-100 rounded-2xl" />)}
                </div>
              </div>
            </div>
          ))
        ) : myDogs.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-14 text-center mt-2">
            <p className="text-6xl mb-4">🐾</p>
            <p className="font-extrabold text-xl text-gray-800">No pets yet</p>
            <p className="text-gray-500 text-sm mt-2 mb-7">Add your first dog or cat to get started on tracking their health and walks.</p>
            <button type="button" onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.28)' }}>
              <Plus className="w-5 h-5" /> Add Your First Pet
            </button>
          </div>
        ) : (
          <>
            {myDogs.map(dog => {
              const dogWalks = data.walks.filter(w => w.dogId === dog.id);
              const completedWalks = dogWalks.filter(w => w.status === 'completed');
              const lastWalk = completedWalks
                .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
              const ageLabel = dog.age == null || dog.age <= 0 ? null
                : dog.age < 1
                  ? `${Math.round(dog.age * 12)} mo`
                  : `${dog.age % 1 === 0 ? dog.age : dog.age.toFixed(1)} yr`;

              return (
                <div key={dog.id} className="bg-white rounded-3xl overflow-hidden shadow-lg active:scale-[0.99] transition-transform">

                  {/* Photo area with gradient name overlay */}
                  <div className="relative" style={{ height: 210 }}>
                    {dog.imageUrl ? (
                      <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #EBF5EF, #D1FAE5)' }}>
                        <span style={{ fontSize: 100 }}>{dog.animalType === 'cat' ? '🐈' : '🐕'}</span>
                      </div>
                    )}
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(7,26,14,0.85) 100%)' }} />
                    {/* Name badge at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-white font-extrabold text-2xl leading-tight">{dog.name}</h3>
                          {dog.breed && <p className="text-white/70 text-sm">{dog.breed}</p>}
                        </div>
                        {ageLabel && (
                          <div className="px-3 py-1 rounded-xl text-xs font-bold text-white"
                            style={{ background: 'rgba(255,255,255,0.18)' }}>
                            {ageLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                    {[
                      { icon: '🦮', label: 'Walks', value: completedWalks.length.toString() },
                      { icon: '📅', label: 'Last Walk', value: lastWalk ? format(new Date(lastWalk.scheduledDate), 'MMM d') : '—' },
                      { icon: '❤️', label: 'Health', value: dog.healthLogs?.length ? `${dog.healthLogs.length} log${dog.healthLogs.length > 1 ? 's' : ''}` : 'None' },
                    ].map(s => (
                      <div key={s.label} className="py-4 text-center">
                        <p className="text-lg mb-0.5">{s.icon}</p>
                        <p className="text-base font-extrabold text-gray-800 leading-none tabular-nums">{s.value}</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action row */}
                  <div className="px-4 py-3 flex gap-2">
                    <Link to={`/owner/dogs/${dog.id}`} className="flex-1">
                      <button className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white"
                        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                        View Profile <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                    <Link to="/owner/pet-health" className="flex-1">
                      <button className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border-2"
                        style={{ borderColor: '#D1FAE5', color: '#1B4332', background: '#F0FDF4' }}>
                        Health Log
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Add another pet tile */}
            <button type="button" onClick={() => setShowAdd(true)}
              className="w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 transition-all active:scale-[0.98]"
              style={{ borderColor: 'rgba(27,67,50,0.2)', background: 'rgba(27,67,50,0.04)' }}>
              <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(27,67,50,0.12)' }}>
                <Plus className="w-7 h-7" style={{ color: '#2B8A50' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: '#1B4332' }}>Add Another Pet</p>
            </button>
          </>
        )}
      </div>

      {/* Floating add button when pets exist */}
      {!loading && myDogs.length > 0 && (
        <button type="button" onClick={() => setShowAdd(true)}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-3xl text-white flex items-center justify-center shadow-xl active:scale-95 transition-all z-40"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.36)' }}>
          <Plus className="w-6 h-6" />
        </button>
      )}

      {showAdd && <AddDogModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
