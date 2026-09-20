import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Phone, MessageCircle, MapPin, ChevronRight, Check } from 'lucide-react';

interface Listing {
  id: string;
  type: 'dog' | 'cat';
  breed: string;
  name: string;
  ageDisplay: string;    // e.g. "8 weeks", "4 months", "2 years"
  ageMonths: number;
  sex: 'male' | 'female';
  color: string;
  size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  weightKg: string;      // e.g. "3–5 kg"
  price: number;
  location: string;
  seller: string;
  phone: string;
  image: string;
  verified: boolean;
  condition: 'Excellent' | 'Good' | 'Fair';
  vaccinated: boolean;
  dewormed: boolean;
  microchipped: boolean;
  description: string;
}

const LISTINGS: Listing[] = [
  {
    id: '1', type: 'dog', breed: 'German Shepherd', name: 'Bruno', ageDisplay: '8 weeks',
    ageMonths: 2, sex: 'male', color: 'Black & Tan', size: 'Large', weightKg: '25–40 kg',
    price: 4500, location: 'Lusaka, Chelston', seller: 'Peter Banda', phone: '+260977000001',
    verified: true, condition: 'Excellent', vaccinated: true, dewormed: true, microchipped: false,
    image: 'https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=700&q=80',
    description: 'Purebred GSD puppy from champion bloodlines. Dewormed, vaccinated and vet-checked. Both parents on site for viewing. Excellent temperament — great for families and security.',
  },
  {
    id: '2', type: 'dog', breed: 'Labrador Retriever', name: 'Max', ageDisplay: '10 weeks',
    ageMonths: 2, sex: 'male', color: 'Golden Yellow', size: 'Large', weightKg: '25–36 kg',
    price: 3500, location: 'Lusaka, Ibex Hill', seller: 'Grace Phiri', phone: '+260966000002',
    verified: true, condition: 'Excellent', vaccinated: true, dewormed: true, microchipped: true,
    image: 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=700&q=80',
    description: 'Yellow lab pups from a healthy, friendly litter. Microchipped and vaccinated. Fantastic with children. One of four pups remaining.',
  },
  {
    id: '3', type: 'dog', breed: 'Boerboel', name: 'Zeus', ageDisplay: '7 weeks',
    ageMonths: 2, sex: 'male', color: 'Fawn with Black Mask', size: 'Extra Large', weightKg: '50–80 kg',
    price: 5500, location: 'Lusaka, Lilayi', seller: 'John Mwale', phone: '+260955000003',
    verified: false, condition: 'Good', vaccinated: true, dewormed: true, microchipped: false,
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=700&q=80',
    description: 'South African Boerboel pups from working guard dog parents. Confident and loyal. Requires experienced handler. Dewormed on schedule.',
  },
  {
    id: '4', type: 'cat', breed: 'Persian Cat', name: 'Luna', ageDisplay: '3 months',
    ageMonths: 3, sex: 'female', color: 'White', size: 'Small', weightKg: '3–5 kg',
    price: 1800, location: 'Lusaka, Rhodes Park', seller: 'Sarah Tembo', phone: '+260977000004',
    verified: true, condition: 'Excellent', vaccinated: true, dewormed: true, microchipped: false,
    image: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=700&q=80',
    description: 'Beautiful white Persian kitten with stunning blue eyes. Calm, loving and raised indoors. Litter trained and eating dry food independently.',
  },
  {
    id: '5', type: 'dog', breed: 'Rottweiler', name: 'Rex', ageDisplay: '9 weeks',
    ageMonths: 2, sex: 'male', color: 'Black & Mahogany', size: 'Large', weightKg: '36–54 kg',
    price: 4000, location: 'Lusaka, Woodlands', seller: 'Michael Lungu', phone: '+260966000005',
    verified: true, condition: 'Excellent', vaccinated: true, dewormed: true, microchipped: true,
    image: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=700&q=80',
    description: 'ANKC registered Rottweiler pups. Both parents on site with full paperwork. High drive, excellent conformation. Suitable for protection and family.',
  },
  {
    id: '6', type: 'cat', breed: 'Siamese', name: 'Nala', ageDisplay: '10 weeks',
    ageMonths: 2, sex: 'female', color: 'Blue Point', size: 'Small', weightKg: '3–4 kg',
    price: 1500, location: 'Lusaka, Kabulonga', seller: 'Charity Zulu', phone: '+260955000006',
    verified: false, condition: 'Good', vaccinated: true, dewormed: true, microchipped: false,
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=700&q=80',
    description: 'Blue point Siamese kittens with striking blue eyes. Well socialised, playful and litter trained. Feed on royal canin kitten.',
  },
  {
    id: '7', type: 'dog', breed: 'Belgian Malinois', name: 'Storm', ageDisplay: '8 weeks',
    ageMonths: 2, sex: 'female', color: 'Fawn & Black', size: 'Medium', weightKg: '18–30 kg',
    price: 6000, location: 'Lusaka, Avondale', seller: 'Bwalya Mutumba', phone: '+260977000007',
    verified: true, condition: 'Excellent', vaccinated: true, dewormed: true, microchipped: true,
    image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=700&q=80',
    description: 'Elite working line Belgian Malinois — perfect for sport, security, or active owners. High energy, highly intelligent. Microchipped and fully documented.',
  },
];

const CONDITION_COLORS: Record<string, { background: string; color: string }> = {
  Excellent: { background: '#EBF5EF', color: '#1B4332' },
  Good:      { background: '#FEF3C7', color: '#92400E' },
  Fair:      { background: '#FEE2E2', color: '#991B1B' },
};

export default function Marketplace() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'dog' | 'cat'>('all');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Listing | null>(null);
  const [showList, setShowList] = useState(false);

  const filtered = LISTINGS.filter(l => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.breed.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.color.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-lg mx-auto pb-28 bg-white min-h-screen">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink flex-1">Pet Marketplace</h1>
        <button onClick={() => setShowList(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          + List Pet
        </button>
      </div>

      {/* Hero banner */}
      <div className="px-4 py-5" style={{ background: 'linear-gradient(135deg, #071a0e 0%, #1B4332 70%)' }}>
        <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-1">Buy & Adopt</p>
        <h2 className="text-white text-xl font-extrabold leading-tight">Find your perfect companion 🐾</h2>
        <p className="text-white/70 text-sm mt-1">Tap any listing to see full details</p>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search breed, name, colour, area…"
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-surface-border text-sm focus:outline-none focus:border-primary" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-ink-muted" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([['all', '🐾 All'], ['dog', '🐕 Dogs'], ['cat', '🐱 Cats']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${filter === val ? 'border-primary bg-primary/10 text-primary' : 'border-surface-border text-ink-muted'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {filtered.map(listing => (
            <button key={listing.id} onClick={() => setDetail(listing)}
              className="w-full text-left rounded-3xl border border-surface-border overflow-hidden active:scale-[0.99] transition-transform block">
              {/* Image */}
              <div className="relative h-52">
                <img src={listing.image} alt={listing.breed} className="w-full h-full object-cover" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.05) 50%)' }} />

                {/* Badges top */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {listing.verified && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                      style={{ background: '#1B4332' }}>✓ Verified</span>
                  )}
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: listing.sex === 'male' ? 'rgba(59,130,246,0.85)' : 'rgba(236,72,153,0.85)', color: 'white' }}>
                    {listing.sex === 'male' ? '♂ Male' : '♀ Female'}
                  </span>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <p className="text-white font-extrabold text-lg leading-tight">{listing.breed}</p>
                    <p className="text-white/75 text-xs">{listing.name} · {listing.ageDisplay} · {listing.color}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-extrabold text-xl leading-none">K{listing.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {listing.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={CONDITION_COLORS[listing.condition]}>
                    {listing.condition}
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </div>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold text-ink mb-1">No listings found</p>
              <p className="text-sm text-ink-muted">Try a different search or filter</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail sheet ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setDetail(null)}>
          <div
            className="w-full max-w-lg mx-auto bg-white rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Handle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/60 rounded-full z-10" />

            {/* Hero image */}
            <div className="relative h-52 shrink-0">
              <img src={detail.image} alt={detail.breed} className="w-full h-full object-cover" />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.08) 55%)' }} />
              <button onClick={() => setDetail(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="text-white font-extrabold text-xl leading-tight">{detail.breed}</p>
                  <p className="text-white/80 text-sm">{detail.name}</p>
                </div>
                <p className="text-white font-extrabold text-2xl">K{detail.price.toLocaleString()}</p>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 208px)' }}>
              <div className="p-5 space-y-5 pb-8">

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {detail.verified && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#1B4332' }}>
                      ✓ Verified Breeder
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-bold"
                    style={CONDITION_COLORS[detail.condition]}>
                    {detail.condition} Condition
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: detail.sex === 'male' ? '#DBEAFE' : '#FCE7F3', color: detail.sex === 'male' ? '#1E40AF' : '#BE185D' }}>
                    {detail.sex === 'male' ? '♂ Male' : '♀ Female'}
                  </span>
                </div>

                {/* Key stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Age', value: detail.ageDisplay },
                    { label: 'Colour', value: detail.color },
                    { label: 'Size', value: detail.size },
                    { label: 'Est. Weight', value: detail.weightKg },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl px-4 py-3" style={{ background: '#F9FAFB' }}>
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide">{s.label}</p>
                      <p className="text-sm font-bold text-ink mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Health status */}
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Health Status</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Vaccinated',   done: detail.vaccinated },
                      { label: 'Dewormed',     done: detail.dewormed },
                      { label: 'Microchipped', done: detail.microchipped },
                    ].map(h => (
                      <div key={h.label}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={h.done
                          ? { background: '#EBF5EF', color: '#1B4332' }
                          : { background: '#F3F4F6', color: '#9CA3AF' }}>
                        {h.done
                          ? <Check className="w-3 h-3" />
                          : <X className="w-3 h-3" />}
                        {h.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-1.5">About</p>
                  <p className="text-sm text-ink-secondary leading-relaxed">{detail.description}</p>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-ink-secondary">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  {detail.location}
                </div>

                {/* Seller */}
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#F9FAFB' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {detail.seller.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink-muted">Listed by</p>
                    <p className="font-semibold text-ink text-sm">{detail.seller}</p>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="space-y-2.5">
                  <a
                    href={`https://wa.me/${detail.phone.replace(/[\s+]/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl font-semibold text-white text-sm"
                    style={{ background: '#25D366' }}>
                    <span className="text-lg">💬</span>
                    WhatsApp Seller
                  </a>
                  <a href={`tel:${detail.phone}`}
                    className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl font-semibold text-sm border-2 border-surface-border text-ink">
                    <Phone className="w-4 h-4 text-ink-secondary" />
                    Call Seller
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── List your pet modal ── */}
      {showList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setShowList(false)}>
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-10"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-surface-border rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <p className="text-4xl mb-3">🐾</p>
              <p className="font-extrabold text-ink text-lg">List Your Pet</p>
              <p className="text-sm text-ink-secondary mt-1.5 leading-relaxed">
                Want to list a pet on PawFleet Marketplace? Contact us and we'll set up your breeder profile for free.
              </p>
            </div>
            <div className="space-y-3">
              <a href="https://wa.me/260977000000" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl font-semibold text-white text-sm"
                style={{ background: '#25D366' }}>
                <span className="text-lg">💬</span>
                Contact us on WhatsApp
              </a>
              <a href="mailto:info@pawfleet.app"
                className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl font-semibold text-sm border-2 border-surface-border text-ink">
                <MessageCircle className="w-4 h-4 text-ink-secondary" />
                info@pawfleet.app
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
