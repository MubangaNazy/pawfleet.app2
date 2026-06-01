import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, Plus, X, ArrowRight, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';

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
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
    createDog({
      name: name.trim(),
      breed: breed.trim() || undefined,
      age: age ? Number(age) : undefined,
      notes: notes.trim() || undefined,
      ownerId: currentUser.id,
      imageUrl: preview || undefined,
      healthLogs: [],
    });
    await new Promise(r => setTimeout(r, 400));
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
          <h2 className="text-lg font-bold text-ink">Add a Dog</h2>
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">
              Dog's Name <span className="text-danger">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Rex, Coco, Luna" required
              className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Breed</label>
            <input type="text" value={breed} onChange={e => setBreed(e.target.value)}
              placeholder="e.g. Labrador, Poodle, Mixed"
              className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Age (years)</label>
            <input type="number" min="0" max="30" step="0.5" value={age} onChange={e => setAge(e.target.value)}
              placeholder="e.g. 2"
              className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Allergies, favourite treats, special behaviour..."
              className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-all resize-none" />
          </div>

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
              <>Add Dog</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function OwnerDogs() {
  const { data, currentUser } = useApp();
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Dogs</h1>
          <p className="text-ink-secondary mt-0.5">{myDogs.length} registered dog{myDogs.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          <Plus className="w-4 h-4" />
          Add Dog
        </button>
      </div>

      {myDogs.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <p className="text-5xl mb-4">🐕</p>
          <p className="font-semibold text-ink text-lg">No dogs yet</p>
          <p className="text-ink-muted text-sm mt-1 mb-6">Add your first dog to get started with walks</p>
          <button type="button" onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
            <Plus className="w-4 h-4" /> Add Your First Dog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myDogs.map(dog => {
            const dogWalks = data.walks.filter(w => w.dogId === dog.id);
            const completedWalks = dogWalks.filter(w => w.status === 'completed');
            const lastWalk = completedWalks
              .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];

            return (
              <div key={dog.id} className="bg-white border border-surface-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0 border border-surface-border">
                    {dog.imageUrl
                      ? <img src={dog.imageUrl} alt={dog.name} className="w-16 h-16 object-cover" />
                      : <span className="text-3xl">🐕</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-lg">{dog.name}</h3>
                    {dog.breed && <p className="text-sm text-ink-secondary">{dog.breed}</p>}
                    {dog.age && <p className="text-xs text-ink-muted">{dog.age} year{dog.age !== 1 ? 's' : ''} old</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-center">
                  <div className="p-2.5 bg-surface-secondary rounded-xl border border-surface-border">
                    <p className="text-lg font-bold text-ink">{completedWalks.length}</p>
                    <p className="text-xs text-ink-muted">Walks</p>
                  </div>
                  <div className="p-2.5 bg-surface-secondary rounded-xl border border-surface-border">
                    <p className="text-sm font-medium text-ink">
                      {lastWalk ? format(new Date(lastWalk.scheduledDate), 'MMM d') : 'None'}
                    </p>
                    <p className="text-xs text-ink-muted">Last Walk</p>
                  </div>
                </div>
                <Link to={`/owner/dogs/${dog.id}`}>
                  <Button variant="secondary" fullWidth iconRight={<ArrowRight className="w-4 h-4" />}>
                    View Profile
                  </Button>
                </Link>
              </div>
            );
          })}

          {/* Add another dog card */}
          <button type="button" onClick={() => setShowAdd(true)}
            className="bg-white border-2 border-dashed border-surface-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-primary-50/30 transition-all group min-h-[200px]">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="w-7 h-7 text-primary/60 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-semibold text-ink-secondary group-hover:text-primary transition-colors">Add Another Dog</p>
          </button>
        </div>
      )}

      {showAdd && <AddDogModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
