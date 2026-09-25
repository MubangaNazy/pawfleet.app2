import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, Locate, Search, X } from 'lucide-react';
import { LUSAKA, type LatLng } from '../../lib/geo';
import { geocodeAddress, reverseGeocode } from '../../lib/geocode';

interface Props {
  /** Where to centre the map when it first opens. Defaults to Lusaka. */
  initial?: LatLng | null;
  onConfirm: (result: { lat: number; lng: number; address: string }) => void;
  onClose: () => void;
}

/**
 * Full-screen "drop a pin" location picker, the same idea Uber/Bolt/InDrive use: the pin stays fixed
 * in the middle of the screen and the map moves underneath it, so whatever is under the pin when you
 * stop dragging is the exact spot chosen — far more accurate than typing an address.
 *
 * The map is deliberately full-bleed (`absolute inset-0` directly under a `fixed inset-0` root) with
 * every other bit of UI floated on top of it. Sandwiching the map inside a flex layout (map area between
 * a header and a footer) left its container at 0 height in some browsers, since that height depends on
 * a flex distribution calculation rather than being simply "the whole screen" — this way there's nothing
 * for the map's size to depend on but the viewport itself.
 */
export default function PinDropPicker({ initial, onConfirm, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geocodeSeq = useRef(0);
  const centerRef = useRef<LatLng>(initial ?? LUSAKA);

  const [dragging, setDragging] = useState(false);
  const [address, setAddress] = useState('Move the map to place the pin');
  const [resolving, setResolving] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hintError, setHintError] = useState('');
  const [mapError, setMapError] = useState('');
  const [sheetHeight, setSheetHeight] = useState(150);

  // Reserve exactly as much room as the bottom sheet actually needs, so the pin sits centred over the
  // visible map above it (the address line can wrap to two lines, changing the sheet's height).
  useLayoutEffect(() => {
    if (!sheetRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h) setSheetHeight(h);
    });
    ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const start = initial ?? LUSAKA;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [start[1], start[0]],
        zoom: 16,
        attributionControl: false,
      });
    } catch (err) {
      // e.g. WebGL unavailable/blocked on this device or browser — this never gets as far as 'error' below.
      console.error('PinDropPicker: could not create the map:', err);
      setMapError('code A — could not start the map on this device.');
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // A dropped/refused WebGL context (e.g. too many maps already open elsewhere on the page, or a
    // low-power device reclaiming GPU memory) leaves the map "working" (style loads, panning still
    // fires events) but paints nothing — this is the one signal that actually catches that case.
    map.getCanvas().addEventListener('webglcontextlost', ev => {
      ev.preventDefault();
      console.error('PinDropPicker: WebGL context lost');
      setMapError('code B — the device stopped the map mid-way.');
    });

    const resolveAddress = async (lat: number, lng: number) => {
      const seq = ++geocodeSeq.current;
      setResolving(true);
      const addr = await reverseGeocode(lat, lng);
      if (seq === geocodeSeq.current) { setAddress(addr); setResolving(false); }
    };

    let loaded = false;
    map.on('movestart', () => setDragging(true));
    map.on('moveend', () => {
      setDragging(false);
      const c = map.getCenter();
      centerRef.current = [c.lat, c.lng];
      resolveAddress(c.lat, c.lng);
    });
    map.on('load', () => { loaded = true; setMapError(''); resolveAddress(start[0], start[1]); });
    map.on('error', e => {
      console.error('PinDropPicker map error:', e?.error || e);
      setMapError(`code C — ${e?.error?.message || 'the map service returned an error'}.`);
    });

    // The container's final size can land a frame after the map is constructed. A couple of follow-up
    // resizes make sure the canvas always matches it instead of staying the wrong size (or blank).
    const checkSize = () => {
      map.resize();
      const el = containerRef.current;
      if (el && (el.offsetWidth === 0 || el.offsetHeight === 0)) {
        console.error('PinDropPicker: map container has no size', el.offsetWidth, el.offsetHeight);
        setMapError(`code D — the map area came out ${el.offsetWidth}×${el.offsetHeight}px.`);
      }
    };
    requestAnimationFrame(checkSize);
    const resizeTimer = setTimeout(checkSize, 300);
    // A stalled tile/style fetch doesn't always fire 'error' — surface it after a reasonable wait either way.
    const loadTimeout = setTimeout(() => { if (!loaded) setMapError('code E — the map is taking too long to load.'); }, 8000);

    mapRef.current = map;
    return () => { clearTimeout(resizeTimer); clearTimeout(loadTimeout); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flyTo = (lat: number, lng: number) => mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, duration: 700 });

  const handleSearch = async () => {
    if (search.trim().length < 3) return;
    setSearching(true);
    setHintError('');
    const hit = await geocodeAddress(search.trim());
    setSearching(false);
    if (!hit) { setHintError('Could not find that. Try a nearby landmark or area name.'); return; }
    flyTo(hit[0], hit[1]);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) { setHintError('Location is not available on this device.'); return; }
    setLocating(true);
    setHintError('');
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); flyTo(pos.coords.latitude, pos.coords.longitude); },
      () => { setLocating(false); setHintError('Could not get your location. Check location permission and try again.'); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return createPortal(
    // Rendered straight onto <body>: an animated ancestor (page-transition wrapper) further up the tree
    // sets a CSS transform, which turns "fixed" into "relative to that ancestor" per the CSS spec.
    // A portal sidesteps that entirely so this reliably sizes itself against the real viewport.
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden" style={{ width: '100vw', height: '100dvh' }}>
      {/* Map, full-bleed behind everything else. Explicit width/height (not just inset:0) so this can't
          end up ambiguous or 0-sized no matter what CSS is active further up the document. */}
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {mapError && (
        <div className="absolute top-16 inset-x-3 z-10 px-3 py-2.5 rounded-xl text-xs font-medium text-center shadow"
          style={{ background: '#FEF2F2', color: '#B91C1C' }}>
          The map could not load ({mapError}) You can still search or use your current location.
        </div>
      )}

      {/* Search bar */}
      <div className="absolute top-0 inset-x-0 z-10 p-3">
        <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-2 py-2 border border-surface-border">
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-ink-muted shrink-0">
            <X className="w-4 h-4" />
          </button>
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search an area or landmark…"
            className="flex-1 min-w-0 text-sm text-ink placeholder:text-ink-muted outline-none bg-transparent"
          />
          {searching
            ? <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mr-1" />
            : search.trim().length > 2 && (
              <button type="button" onClick={handleSearch} className="text-xs font-bold text-primary shrink-0 pr-1">Go</button>
            )}
        </div>
        {hintError && (
          <p className="text-xs font-medium mt-1.5 mx-1 px-2.5 py-1.5 rounded-lg bg-white shadow" style={{ color: '#B45309' }}>{hintError}</p>
        )}
      </div>

      {/* Fixed centre pin — this is what "drops" onto whatever is under it. Centred over the map area
          that's actually visible above the bottom sheet, not the whole screen. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center" style={{ height: `calc(100% - ${sheetHeight}px)` }}>
        <div className="flex flex-col items-center">
          <div className="rounded-full flex items-center justify-center shadow-lg transition-transform duration-150"
            style={{
              width: 34, height: 34, background: 'linear-gradient(135deg,#1B4332,#2B8A50)', border: '3px solid white',
              transform: dragging ? 'translateY(-10px) scale(1.08)' : 'translateY(0) scale(1)',
            }}>
            <span style={{ fontSize: 15 }}>🐾</span>
          </div>
          <div className="transition-all duration-150" style={{ width: 3, background: '#1B4332', height: dragging ? 16 : 10, marginTop: -2, borderRadius: 2 }} />
          <div className="rounded-full bg-black/25 transition-all duration-150"
            style={{ width: dragging ? 5 : 9, height: dragging ? 2.5 : 4.5, marginTop: dragging ? 3 : 1, filter: 'blur(0.5px)' }} />
        </div>
      </div>

      {/* Use current location */}
      <button type="button" onClick={handleUseGps} disabled={locating}
        className="absolute right-3 z-10 w-11 h-11 rounded-full bg-white shadow-lg border border-surface-border flex items-center justify-center disabled:opacity-60"
        style={{ bottom: sheetHeight + 12 }}>
        {locating ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Locate className="w-5 h-5 text-primary" />}
      </button>

      {/* Confirm sheet, floated over the bottom of the map */}
      <div ref={sheetRef} className="absolute bottom-0 inset-x-0 z-10 p-4 bg-white border-t border-surface-border space-y-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#2B8A50' }} />
          <p className="text-sm text-ink font-medium leading-snug min-h-[2.5em]">
            {resolving ? 'Finding this address…' : address}
          </p>
        </div>
        <button type="button" onClick={() => onConfirm({ lat: centerRef.current[0], lng: centerRef.current[1], address })}
          disabled={resolving}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
          Confirm this location
        </button>
      </div>
    </div>,
    document.body,
  );
}
