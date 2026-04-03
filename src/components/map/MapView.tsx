import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Walk, User, Dog } from '../../types';

// Fix default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapWalk {
  walk: Walk;
  walker?: User;
  dog?: Dog;
  owner?: User;
}

interface MapViewProps {
  walks: MapWalk[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export function MapView({ walks, center = [-15.4167, 28.2833], zoom = 13, height = '400px' }: MapViewProps) {
  const activeWalks = walks.filter(({ walk }) => walk.startLocation);

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-surface-border shadow-card">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {activeWalks.map(({ walk, walker, dog, owner }) => {
          const loc = walk.startLocation!;
          return (
            <Marker key={walk.id} position={[loc.lat, loc.lng]}>
              <Popup>
                <div className="text-sm min-w-[140px]">
                  <p className="font-semibold text-ink">{dog?.name || 'Dog'}</p>
                  <p className="text-ink-secondary text-xs">{dog?.breed}</p>
                  <hr className="my-1.5" />
                  <p className="text-xs"><span className="font-medium">Walker:</span> {walker?.name || 'Unassigned'}</p>
                  <p className="text-xs"><span className="font-medium">Owner:</span> {owner?.name || 'Unknown'}</p>
                  <p className="text-xs mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-white text-[10px] ${walk.status === 'active' ? 'bg-green-500' : 'bg-blue-500'}`}>
                      {walk.status}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
