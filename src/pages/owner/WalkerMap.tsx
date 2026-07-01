import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LUSAKA_CENTER: [number, number] = [-15.4167, 28.2833];

// Spread walkers around Lusaka at roughly real distances
const WALKER_OFFSETS = [
  [0.004, 0.003], [-0.005, 0.007], [0.008, -0.004],
  [-0.002, -0.006], [0.006, 0.009], [-0.009, 0.002],
];

export default function WalkerMap() {
  const navigate = useNavigate();
  const { data } = useApp();
  const walkers = data.users.filter(u => u.role === 'walker' && u.walkerStatus === 'active');

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-[1000] bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: '#F3F4F6' }}>
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="flex-1">
          <p className="font-extrabold text-ink text-sm">Walkers Nearby</p>
          <p className="text-xs text-ink-muted">{walkers.length} active walker{walkers.length !== 1 ? 's' : ''} in your area</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: '#EBF5EF', color: '#1B4332' }}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <style>{`.leaflet-control-attribution { display: none !important; }`}</style>
        <MapContainer
          center={LUSAKA_CENTER}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution=""
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {walkers.map((walker, i) => {
            const offset = WALKER_OFFSETS[i % WALKER_OFFSETS.length];
            const pos: [number, number] = [
              LUSAKA_CENTER[0] + offset[0],
              LUSAKA_CENTER[1] + offset[1],
            ];
            return (
              <Marker key={walker.id} position={pos}>
                <Popup>
                  <div className="min-w-[140px]">
                    <p className="font-bold text-sm">{walker.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Professional walker</p>
                    <button
                      type="button"
                      onClick={() => navigate('/owner/request')}
                      className="mt-2 w-full py-1.5 rounded-lg text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                      Book now
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[999] bg-white rounded-2xl px-4 py-3 shadow-lg border border-surface-border">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <MapPin className="w-3.5 h-3.5" style={{ color: '#1B4332' }} />
            Tap a pin to book
          </div>
        </div>
      </div>

      {/* Bottom card */}
      <div className="bg-white border-t border-surface-border px-4 py-4 pb-8">
        <button type="button" onClick={() => navigate('/owner/request')}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-sm active:scale-[0.98] transition-all"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)', boxShadow: '0 8px 24px rgba(27,67,50,0.3)' }}>
          Book a Walker Now
        </button>
      </div>
    </div>
  );
}
