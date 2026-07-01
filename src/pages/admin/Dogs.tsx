import { useState } from 'react';
import { Search, Dog } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function AdminDogs() {
  const { data } = useApp();
  const [search, setSearch] = useState('');

  const dogs = data.dogs
    .map(dog => ({ ...dog, owner: data.users.find(u => u.id === dog.ownerId) }))
    .filter(dog => {
      const q = search.toLowerCase();
      return !q
        || dog.name.toLowerCase().includes(q)
        || (dog.breed || '').toLowerCase().includes(q)
        || (dog.owner?.name || '').toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalByType = {
    dog: data.dogs.filter(d => !d.animalType || d.animalType === 'dog').length,
    cat: data.dogs.filter(d => d.animalType === 'cat').length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="pf-heading">All Pets</h1>
          <p className="pf-subtitle">
            {data.dogs.length} registered · {totalByType.dog} dogs · {totalByType.cat} cats
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Pets', value: data.dogs.length, emoji: '🐾', bg: '#EBF5EF', color: '#1B4332' },
          { label: 'Dogs', value: totalByType.dog, emoji: '🐕', bg: '#FEF3C7', color: '#92400E' },
          { label: 'Cats', value: totalByType.cat, emoji: '🐈', bg: '#EDE9FE', color: '#5B21B6' },
        ].map(({ label, value, emoji, bg, color }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ background: bg }}>
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
            <div className="text-xs font-medium" style={{ color }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, breed or owner…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Dogs list */}
      {dogs.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <Dog className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No pets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dogs.map(dog => {
            const walkCount = data.walks.filter(w => w.dogId === dog.id).length;
            const completedCount = data.walks.filter(w => w.dogId === dog.id && w.status === 'completed').length;

            return (
              <div key={dog.id} className="bg-white border border-surface-border rounded-2xl p-4 shadow-card flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#EBF5EF] flex items-center justify-center shrink-0 border border-primary/10">
                  {dog.imageUrl
                    ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl">{dog.animalType === 'cat' ? '🐈' : '🐕'}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-ink text-base leading-tight">{dog.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {dog.breed && (
                          <span className="text-xs text-ink-muted">{dog.breed}</span>
                        )}
                        {dog.age != null && (
                          <span className="text-xs text-ink-muted">{dog.age} yr{dog.age !== 1 ? 's' : ''}</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          dog.animalType === 'cat'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-[#EBF5EF] text-[#1B4332]'
                        }`}>
                          {dog.animalType === 'cat' ? 'Cat' : 'Dog'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-ink-muted">Walks</p>
                      <p className="text-sm font-bold text-ink">{completedCount}/{walkCount}</p>
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-secondary border border-surface-border">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                      {(dog.owner?.name || '?')[0]}
                    </div>
                    <span className="text-xs font-medium text-ink truncate">{dog.owner?.name || 'Unknown owner'}</span>
                    {dog.owner?.phone && (
                      <a href={`tel:${dog.owner.phone}`} className="text-xs text-primary font-semibold ml-auto shrink-0 hover:underline">
                        {dog.owner.phone}
                      </a>
                    )}
                  </div>

                  {/* Notes */}
                  {dog.notes && (
                    <p className="mt-2 text-xs text-ink-muted italic line-clamp-2">"{dog.notes}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
