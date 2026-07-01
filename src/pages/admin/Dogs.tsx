import { useState } from 'react';
import { Search, Dog } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type CategoryFilter = 'all' | 'dog' | 'cat' | 'other';

function getCategoryEmoji(type: string | undefined): string {
  if (!type || type === 'dog') return '🐕';
  if (type === 'cat') return '🐈';
  const map: Record<string, string> = {
    bird: '🦜', rabbit: '🐇', hamster: '🐹', fish: '🐠',
    turtle: '🐢', snake: '🐍', parrot: '🦜', cow: '🐄',
    horse: '🐴', pig: '🐷', chicken: '🐔',
  };
  return map[type.toLowerCase()] ?? '🐾';
}

function getCategory(animalType: string | undefined): 'dog' | 'cat' | 'other' {
  if (!animalType || animalType === 'dog') return 'dog';
  if (animalType === 'cat') return 'cat';
  return 'other';
}

export default function AdminDogs() {
  const { data } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const allDogs = data.dogs.map(dog => ({
    ...dog,
    owner: data.users.find(u => u.id === dog.ownerId),
    category: getCategory(dog.animalType),
  }));

  const counts = {
    all:   allDogs.length,
    dog:   allDogs.filter(d => d.category === 'dog').length,
    cat:   allDogs.filter(d => d.category === 'cat').length,
    other: allDogs.filter(d => d.category === 'other').length,
  };

  // Unique "other" animal types for sub-labels
  const otherTypes = [...new Set(
    allDogs.filter(d => d.category === 'other').map(d => d.animalType || 'other')
  )];

  const filtered = allDogs
    .filter(d => category === 'all' || d.category === category)
    .filter(d => {
      const q = search.toLowerCase();
      return !q
        || d.name.toLowerCase().includes(q)
        || (d.breed || '').toLowerCase().includes(q)
        || (d.owner?.name || '').toLowerCase().includes(q)
        || (d.animalType || '').toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const tabs: { id: CategoryFilter; label: string; emoji: string; color: string; bg: string }[] = [
    { id: 'all',   label: 'All',   emoji: '🐾', color: '#1B4332', bg: '#EBF5EF' },
    { id: 'dog',   label: 'Dogs',  emoji: '🐕', color: '#92400E', bg: '#FEF3C7' },
    { id: 'cat',   label: 'Cats',  emoji: '🐈', color: '#5B21B6', bg: '#EDE9FE' },
    { id: 'other', label: 'Other', emoji: '🦜', color: '#0E7490', bg: '#ECFEFF' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="pf-heading">All Pets</h1>
        <p className="pf-subtitle">
          {data.dogs.length} registered · {counts.dog} dogs · {counts.cat} cats{counts.other > 0 ? ` · ${counts.other} other` : ''}
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => {
          const active = category === tab.id;
          if (tab.id === 'other' && counts.other === 0) return null;
          return (
            <button key={tab.id} onClick={() => setCategory(tab.id)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border-2"
              style={{
                borderColor: active ? tab.color : '#DDE9E2',
                background: active ? tab.bg : 'white',
                color: active ? tab.color : '#6B7280',
              }}>
              <span>{tab.emoji}</span>
              {tab.label}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: active ? tab.color : '#F3F4F6', color: active ? 'white' : '#6B7280' }}>
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* "Other" sub-type breakdown */}
      {category === 'other' && otherTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {otherTypes.map(type => {
            const typeCount = allDogs.filter(d => (d.animalType || 'other') === type).length;
            return (
              <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: '#ECFEFF', color: '#0E7490', border: '1px solid #A5F3FC' }}>
                <span>{getCategoryEmoji(type)}</span>
                <span className="capitalize">{type}</span>
                <span className="font-bold">({typeCount})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, breed or owner…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors bg-white"
        />
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-4 gap-2">
        {tabs.filter(t => t.id !== 'all' && (t.id !== 'other' || counts.other > 0)).map(tab => (
          <button key={tab.id} onClick={() => setCategory(tab.id)}
            className="rounded-2xl p-3 text-center transition-all active:scale-95"
            style={{ background: category === tab.id ? tab.bg : '#F9FAFB', border: `1px solid ${category === tab.id ? tab.color + '40' : '#E5E7EB'}` }}>
            <div className="text-xl mb-0.5">{tab.emoji}</div>
            <div className="text-base font-extrabold" style={{ color: tab.color }}>{counts[tab.id]}</div>
            <div className="text-[10px] font-medium" style={{ color: tab.color }}>{tab.label}</div>
          </button>
        ))}
        <div className="rounded-2xl p-3 text-center" style={{ background: '#EBF5EF', border: '1px solid #52B78840' }}>
          <div className="text-xl mb-0.5">🐾</div>
          <div className="text-base font-extrabold" style={{ color: '#1B4332' }}>{counts.all}</div>
          <div className="text-[10px] font-medium" style={{ color: '#1B4332' }}>Total</div>
        </div>
      </div>

      {/* Pets list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl p-16 text-center shadow-card">
          <Dog className="w-10 h-10 text-ink-muted mx-auto mb-3" />
          <p className="font-medium text-ink">No pets found</p>
          <p className="text-sm text-ink-muted mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(dog => {
            const walkCount      = data.walks.filter(w => w.dogId === dog.id).length;
            const completedCount = data.walks.filter(w => w.dogId === dog.id && w.status === 'completed').length;
            const emoji          = getCategoryEmoji(dog.animalType);
            const catTab         = tabs.find(t => t.id === dog.category) ?? tabs[0];

            return (
              <div key={dog.id} className="bg-white border border-surface-border rounded-2xl p-4 shadow-card flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border border-primary/10"
                  style={{ background: catTab.bg }}>
                  {dog.imageUrl
                    ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl">{emoji}</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-ink text-base leading-tight">{dog.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {dog.breed && <span className="text-xs text-ink-muted">{dog.breed}</span>}
                        {dog.age != null && <span className="text-xs text-ink-muted">{dog.age}yr</span>}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: catTab.bg, color: catTab.color }}>
                          {dog.animalType || 'dog'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-ink-muted">Walks</p>
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

                  {dog.notes && (
                    <p className="mt-1.5 text-xs text-ink-muted italic line-clamp-2">"{dog.notes}"</p>
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
