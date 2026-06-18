import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Search, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Filter = 'all' | 'pending' | 'completed' | 'cancelled';

function parseVetNote(notes: string) {
  const lines    = notes.split('\n');
  const service  = lines[0]?.replace('VET BOOKING: ', '') ?? '';
  const aggressive = lines.some(l => l.includes('Aggressive'));
  const transport  = lines.some(l => l.includes('Walker transport'));
  return { service, aggressive, transport };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: '#D97706', bg: '#FEF3C7', icon: <Clock className="w-3 h-3" /> },
  assigned:  { label: 'Confirmed', color: '#0891B2', bg: '#F0FDFA', icon: <CheckCircle2 className="w-3 h-3" /> },
  active:    { label: 'Active',    color: '#2B8A50', bg: '#EBF5EF', icon: <CheckCircle2 className="w-3 h-3" /> },
  completed: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6', icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2', icon: <XCircle className="w-3 h-3" /> },
};

export default function VetAppointments() {
  const { data, updateWalk } = useApp();
  const navigate = useNavigate();
  const [filter,  setFilter]  = useState<Filter>('all');
  const [query,   setQuery]   = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const allVetWalks = data.walks
    .filter(w => w.notes?.startsWith('VET BOOKING:'))
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const filtered = allVetWalks.filter(w => {
    const pet   = data.dogs.find(d => d.id === w.dogId);
    const owner = data.users.find(u => u.id === w.ownerId);
    const matchFilter = filter === 'all' || w.status === filter;
    const matchQuery  = !query || [pet?.name, owner?.name, w.notes].some(s => s?.toLowerCase().includes(query.toLowerCase()));
    return matchFilter && matchQuery;
  });

  const confirm = (walkId: string) => {
    setConfirming(walkId);
    updateWalk(walkId, { status: 'assigned' });
    setConfirming(null);
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',       label: `All (${allVetWalks.length})` },
    { key: 'pending',   label: `Pending (${allVetWalks.filter(w => w.status === 'pending').length})` },
    { key: 'completed', label: `Done (${allVetWalks.filter(w => w.status === 'completed').length})` },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-4">

      {/* Header */}
      <div className="px-4 pt-5">
        <h1 className="text-xl font-extrabold text-ink">Appointments</h1>
        <p className="text-ink-muted text-sm mt-0.5">{allVetWalks.length} vet bookings total</p>
      </div>

      {/* Search */}
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by pet or owner name…"
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {FILTERS.map(f => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f.key ? 'text-white shadow-sm' : 'bg-white border border-surface-border text-ink-muted'
            }`}
            style={filter === f.key ? { background: 'linear-gradient(135deg,#0F766E,#0891B2)' } : {}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-2xl p-10 text-center">
            <p className="text-3xl mb-3">🏥</p>
            <p className="font-semibold text-ink">No appointments found</p>
          </div>
        ) : (
          filtered.map(walk => {
            const pet   = data.dogs.find(d => d.id === walk.dogId);
            const owner = data.users.find(u => u.id === walk.ownerId);
            const { service, aggressive, transport } = parseVetNote(walk.notes || '');
            const meta = STATUS_META[walk.status] ?? STATUS_META.pending;
            return (
              <div key={walk.id}
                className="bg-white border border-surface-border rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/vet/appointments/${walk.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#F0FDFA' }}>
                    {pet?.animalType === 'cat' ? '🐈' : '🐕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ink">{pet?.name ?? 'Unknown'}</p>
                      <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: meta.color, background: meta.bg }}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#0891B2' }}>{service}</p>
                    <p className="text-xs text-ink-muted mt-0.5">Owner: {owner?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-ink-muted">{format(parseISO(walk.scheduledDate), 'EEE d MMM · h:mm a')}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {aggressive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⚠️ Aggressive</span>}
                      {transport  && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🚗 Transport</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: '#0F766E' }}>K{walk.price}</p>
                  </div>
                </div>

                {/* Confirm button for pending */}
                {walk.status === 'pending' && (
                  <button type="button" onClick={e => { e.stopPropagation(); confirm(walk.id); }}
                    disabled={confirming === walk.id}
                    className="mt-3 w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>
                    {confirming === walk.id
                      ? <><div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Confirming…</>
                      : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Appointment</>}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
