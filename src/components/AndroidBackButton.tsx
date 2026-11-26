import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

// The phone's back button in the Android app: go back a screen, and only leave the app from a home
// screen. Without this, back could close the app mid-booking or mid-walk.
const HOME_ROUTES = new Set(['/', '/owner', '/walker', '/admin', '/vet', '/shopowner', '/login', '/landing']);

export default function AndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    let native = false;
    try { native = Capacitor.isNativePlatform(); } catch { /* web */ }
    if (!native) return;

    let remove: (() => void) | undefined;
    let cancelled = false;
    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return;
      App.addListener('backButton', ({ canGoBack }) => {
        // Close an open sheet or dialog first, if the screen listens for it.
        const ev = new CustomEvent('pawfleet:back', { cancelable: true });
        if (!window.dispatchEvent(ev)) return;
        if (HOME_ROUTES.has(pathRef.current) || !canGoBack) App.exitApp();
        else navigate(-1);
      }).then(h => { remove = () => h.remove(); });
    }).catch(() => { /* plugin missing: Capacitor's default back behaviour applies */ });

    return () => { cancelled = true; remove?.(); };
  }, [navigate]);

  return null;
}
