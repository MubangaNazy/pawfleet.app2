import { useState } from 'react';
import { ChevronDown, Search, Plus } from 'lucide-react';
import { DOG_BREEDS } from '../../lib/breeds';

/**
 * Searchable breed dropdown. Any typed breed can be used ("Use …"), and choosing "Other" opens a text
 * box, so a breed missing from the list never stops someone adding their pet.
 */
export default function BreedPicker({ value, onChange, placeholder = 'Select breed' }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState(() => !!value && !DOG_BREEDS.includes(value));
  const q = search.trim().toLowerCase();
  const filtered = DOG_BREEDS.filter(b => b.toLowerCase().includes(q));
  const exact = DOG_BREEDS.some(b => b.toLowerCase() === q);

  const pick = (b: string) => {
    if (b === 'Other') { setCustom(true); onChange(''); }
    else { setCustom(false); onChange(b); }
    setOpen(false);
    setSearch('');
  };

  const useTyped = () => {
    const typed = search.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!typed) return;
    setCustom(false);
    onChange(typed.replace(/\b\w/g, c => c.toUpperCase()));
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative space-y-2">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-11 px-4 rounded-xl border border-surface-border bg-white text-sm text-ink flex items-center justify-between focus:outline-none focus:border-primary transition-all">
        <span className={value || custom ? 'text-ink' : 'text-ink-muted'}>{custom ? 'Other (type below)' : (value || placeholder)}</span>
        <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {custom && (
        <input type="text" value={value} onChange={e => onChange(e.target.value.slice(0, 60))} autoFocus
          placeholder="Type the breed, e.g. Boerboel x Ridgeback"
          className="w-full h-11 px-4 rounded-xl border border-primary/40 bg-white text-sm text-ink focus:outline-none focus:border-primary" />
      )}

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 bg-white border border-surface-border rounded-2xl shadow-xl overflow-hidden"
          style={{ maxHeight: 300 }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-border">
            <Search className="w-4 h-4 text-ink-muted shrink-0" />
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (filtered.length === 1) pick(filtered[0]); else useTyped(); } }}
              placeholder="Search or type a breed…"
              className="flex-1 text-sm focus:outline-none bg-transparent" />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {q && !exact && (
              <button type="button" onClick={useTyped}
                className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 flex items-center gap-2 border-b border-surface-border">
                <Plus className="w-4 h-4" /> Use “{search.trim()}”
              </button>
            )}
            {filtered.map(b => (
              <button key={b} type="button" onClick={() => pick(b)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-secondary transition-colors ${value === b ? 'font-bold text-primary bg-primary/5' : 'text-ink'}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
