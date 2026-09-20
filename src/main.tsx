import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import 'leaflet/dist/leaflet.css';
import App from './App';
import './index.css';
import { initMonitoring } from './lib/monitoring';
import { installChunkRecovery, isChunkLoadError, reloadForNewVersion } from './lib/chunkRecovery';

initMonitoring();
installChunkRecovery();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={({ error }) => <AppCrashFallback error={error} />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

function AppCrashFallback({ error }: { error?: unknown }) {
  // A new version was deployed while this screen was open: fetch it instead of showing a crash.
  const stale = isChunkLoadError(error);
  React.useEffect(() => { if (stale) reloadForNewVersion(); }, [stale]);
  if (stale) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center bg-white">
        <div className="text-5xl">🐾</div>
        <h1 className="text-xl font-extrabold" style={{ color: '#1B4332' }}>Updating PawFleet…</h1>
        <p className="text-sm text-gray-500 max-w-xs">A new version is ready. If this screen stays, check your connection and tap below.</p>
        <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-2xl font-bold text-white text-sm mt-2" style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>Reload</button>
      </div>
    );
  }

  const goHome = () => {
    try {
      window.history.pushState(null, '', '/');
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-white">
      <div className="text-5xl">🐾</div>
      <h1 className="text-xl font-extrabold" style={{ color: '#1B4332' }}>Oops, something went wrong</h1>
      <p className="text-sm text-gray-500 max-w-xs">
        Your data is safe — tap below to go back to the home screen.
      </p>
      {msg && (
        <p className="text-xs text-red-400 font-mono bg-red-50 rounded-xl px-3 py-2 max-w-xs break-all">
          {msg.slice(0, 120)}
        </p>
      )}
      <button
        onClick={goHome}
        className="px-6 py-3 rounded-2xl font-bold text-white text-sm mt-2"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
      >
        Back to Home
      </button>
    </div>
  );
}
