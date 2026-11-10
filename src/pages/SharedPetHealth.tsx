import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import PawFleetLogo from '../components/ui/PawFleetLogo';

interface SharedEntry {
  type: string;
  content: string;
  weight_kg: number | null;
  ai_response: string | null;
  due_date: string | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  note: 'General Note', symptom: 'Symptom', vet_visit: 'Vet Visit',
  weight: 'Weight', medication: 'Medication', grooming: 'Wash / Groom', vaccination: 'Vaccination',
};

/** Public, read-only: what a vet sees when an owner shares a pet's health journal. No login needed. */
export default function SharedPetHealth() {
  const { token } = useParams<{ token: string }>();
  const [dog, setDog] = useState<{ name: string; breed?: string; age?: number } | null>(null);
  const [entries, setEntries] = useState<SharedEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/pet-health-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view', token }),
    })
      .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setError(json.error || 'Could not load this journal.'); return; }
        setDog(json.dog);
        setEntries(json.entries || []);
      })
      .catch(() => setError("We can't reach PawFleet right now. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <div className="px-5 py-4 border-b border-surface-border bg-white flex items-center gap-2">
        <PawFleetLogo size={28} />
        <span className="text-sm font-bold" style={{ color: '#1B4332' }}>PawFleet</span>
        <span className="text-xs text-ink-muted ml-auto">Shared health journal</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink-muted" /></div>
        ) : error ? (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-danger" />
            <p className="font-bold text-ink">{error}</p>
            <p className="text-sm text-ink-muted">Ask the owner to send you a fresh link.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl border border-surface-border p-5 mb-5">
              <h1 className="text-xl font-extrabold text-ink">{dog?.name}</h1>
              <p className="text-sm text-ink-muted mt-0.5">
                {[dog?.breed, dog?.age != null ? `${dog.age} yr${dog.age === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ') || 'No further details'}
              </p>
            </div>

            {entries.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-10">Nothing has been logged yet.</p>
            ) : (
              <div className="space-y-2">
                {entries.map((e, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-surface-border p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6D28D9' }}>{TYPE_LABEL[e.type] || e.type}</span>
                      <span className="text-[10px] text-ink-muted">{new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">{e.content}</p>
                    {e.weight_kg != null && <p className="text-xs text-ink-muted mt-1">Weight: {e.weight_kg} kg</p>}
                    {e.due_date && <p className="text-xs mt-1" style={{ color: '#D97706' }}>Next due: {new Date(e.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                    {e.ai_response && (
                      <div className="mt-2 px-3 py-2 rounded-xl text-xs leading-relaxed" style={{ background: '#F5F3FF', color: '#5B21B6', borderLeft: '3px solid #7C3AED' }}>
                        <span className="font-bold">AI note: </span>{e.ai_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
