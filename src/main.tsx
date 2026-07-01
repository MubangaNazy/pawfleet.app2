import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import 'leaflet/dist/leaflet.css';
import App from './App';
import './index.css';
import { initMonitoring } from './lib/monitoring';

initMonitoring();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<AppCrashFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

function AppCrashFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-white">
      <div className="text-5xl">🐾</div>
      <h1 className="text-xl font-extrabold" style={{ color: '#1B4332' }}>Something went wrong</h1>
      <p className="text-sm text-gray-500 max-w-xs">PawFleet hit an unexpected error. Our team has been notified.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-2xl font-bold text-white text-sm mt-2"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
      >
        Reload App
      </button>
    </div>
  );
}
