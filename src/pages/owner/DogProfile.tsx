import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, ArrowLeft, Droplets, Coffee, Moon, CheckCircle, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { HealthLog } from '../../types';

export default function DogProfile() {
  const { dogId } = useParams<{ dogId: string }>();
  const { data, currentUser, updateDog, logHealth } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const dog = data.dogs.find(d => d.id === dogId);
  const today = new Date().toISOString().split('T')[0];

  if (!dog || dog.ownerId !== currentUser?.id) {
    return (
      <div className="p-6 text-center">
        <p className="text-ink-muted mb-4">Dog not found.</p>
        <button onClick={() => navigate('/owner')}
          className="px-5 py-2.5 rounded-2xl text-sm font-bold text-white"
          style={{ background: '#1B4332' }}>Go Back</button>
      </div>
    );
  }

  const todayLog = dog.healthLogs?.find(l => l.date === today);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    return d.toISOString().split('T')[0];
  });

  const dogWalks = data.walks
    .filter(w => w.dogId === dog.id)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const completedWalks = dogWalks.filter(w => w.status === 'completed').length;
  const recentWalks    = dogWalks.slice(0, 5);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      updateDog(dog.id, { imageUrl: ev.target?.result as string });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleHealth = (field: keyof Pick<HealthLog, 'water' | 'foodMorning' | 'foodEvening'>, current?: boolean) => {
    logHealth(dog.id, today, field, !current);
  };

  /* ── Care tile config ─────────────────────────── */
  const careTiles = [
    {
      field: 'water' as const,
      icon: <Droplets className="w-6 h-6" />,
      label: 'Water',
      done: !!todayLog?.water,
      activeColor: '#0891B2',
      activeBg: '#EFF6FF',
      borderActive: '#BAE6FD',
    },
    {
      field: 'foodMorning' as const,
      icon: <Coffee className="w-6 h-6" />,
      label: 'Morning',
      done: !!todayLog?.foodMorning,
      activeColor: '#2B8A50',
      activeBg: '#EBF5EF',
      borderActive: '#86EFAC',
    },
    {
      field: 'foodEvening' as const,
      icon: <Moon className="w-6 h-6" />,
      label: 'Evening',
      done: !!todayLog?.foodEvening,
      activeColor: '#B45309',
      activeBg: '#FEF3C7',
      borderActive: '#FCD34D',
    },
  ];

  return (
    <div className="bg-surface-secondary min-h-screen pb-40">

      {/* ── Hero banner ─────────────────────────── */}
      <div className="relative h-60 w-full overflow-hidden">
        {dog.imageUrl ? (
          <img src={dog.imageUrl} alt={dog.name}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-9xl"
            style={{ background: 'linear-gradient(135deg, #1B4332 0%, #52B788 100%)' }}>
            🐕
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}>
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Camera */}
        <button onClick={() => fileRef.current?.click()}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
          <Camera className="w-4 h-4 text-ink" />
          {uploading && <span className="absolute inset-0 rounded-full border-2 border-primary animate-spin" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{dog.name}</h1>
          <p className="text-white/75 text-sm mt-0.5">
            {[dog.breed, dog.age ? `${dog.age} yrs old` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────── */}
      <div className="mx-4 -mt-0 bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        {[
          { value: dogWalks.length,  label: 'Total Walks' },
          { value: completedWalks,   label: 'Completed' },
          { value: dog.age ?? '—',   label: 'Age (yrs)' },
        ].map((s, i) => (
          <div key={i} className={`inline-flex flex-col items-center justify-center py-4 ${i < 2 ? 'border-r border-surface-border' : ''}`}
            style={{ width: '33.33%' }}>
            <p className="text-xl font-extrabold text-ink">{s.value}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Sticky Book CTA ─────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-3 pt-2"
        style={{ background: 'linear-gradient(to top, white 80%, transparent)' }}>
        <Link
          to="/owner/request"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
        >
          🦮 Book a Walk for {dog.name}
        </Link>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ── Notes card ─────────────────────────── */}
        {dog.notes && (
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">About {dog.name}</p>
            <p className="text-sm text-ink-secondary leading-relaxed italic">"{dog.notes}"</p>
          </div>
        )}

        {/* ── Today's Care ───────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3.5 border-b border-surface-border flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Today's Care</p>
              <p className="text-xs text-ink-muted mt-0.5">{format(new Date(), 'EEEE, MMM d')}</p>
            </div>
            <div className="flex gap-1">
              {careTiles.map(t => (
                <div key={t.field} className={`w-2 h-2 rounded-full ${t.done ? 'opacity-100' : 'opacity-20'}`}
                  style={{ background: t.activeColor }} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-surface-border">
            {careTiles.map(t => (
              <button key={t.field}
                type="button"
                onClick={() => toggleHealth(t.field, t.done)}
                className="flex flex-col items-center gap-2 py-5 transition-all active:scale-95"
                style={t.done ? { background: t.activeBg } : { background: 'white' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2"
                  style={t.done
                    ? { color: t.activeColor, background: 'white', borderColor: t.borderActive }
                    : { color: '#9CA3AF', background: '#F9FAFB', borderColor: '#F3F4F6' }}>
                  {t.icon}
                </div>
                <p className="text-xs font-bold" style={{ color: t.done ? t.activeColor : '#9CA3AF' }}>{t.label}</p>
                {t.done && (
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: t.activeColor }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 7-Day Health Log ───────────────────── */}
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden">
          <div className="px-4 py-3.5 border-b border-surface-border">
            <p className="text-sm font-bold text-ink">7-Day Health Log</p>
          </div>
          <div className="px-3 py-4">
            <div className="flex gap-1.5">
              {last7Days.map(dateStr => {
                const log    = dog.healthLogs?.find(l => l.date === dateStr);
                const isT    = dateStr === today;
                const water  = !!log?.water;
                const morn   = !!log?.foodMorning;
                const eve    = !!log?.foodEvening;
                const allDone = water && morn && eve;
                return (
                  <div key={dateStr} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-bold text-ink-muted">
                      {isT ? 'Today' : format(new Date(dateStr + 'T12:00:00'), 'EEE')}
                    </span>
                    <div className={`w-full rounded-xl py-2.5 flex flex-col items-center gap-1 ${
                      isT ? 'ring-2 ring-primary' : ''
                    }`}
                      style={{ background: allDone ? '#EBF5EF' : '#F9FAFB' }}>
                      <div className="flex flex-col gap-0.5 items-center">
                        <div className={`w-2 h-2 rounded-full ${water ? '' : 'opacity-15'}`} style={{ background: '#0891B2' }} />
                        <div className={`w-2 h-2 rounded-full ${morn  ? '' : 'opacity-15'}`} style={{ background: '#2B8A50' }} />
                        <div className={`w-2 h-2 rounded-full ${eve   ? '' : 'opacity-15'}`} style={{ background: '#B45309' }} />
                      </div>
                    </div>
                    {allDone && <span className="text-[8px] font-bold" style={{ color: '#2B8A50' }}>✓</span>}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 px-1">
              {[
                { color: '#0891B2', label: 'Water' },
                { color: '#2B8A50', label: 'Morning' },
                { color: '#B45309', label: 'Evening' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[9px] text-ink-muted">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Walk History ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden">
          <div className="px-4 py-3.5 border-b border-surface-border flex items-center gap-2">
            <Activity className="w-4 h-4 text-ink-muted" />
            <p className="text-sm font-bold text-ink">Walk History</p>
          </div>
          {recentWalks.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">🐾</p>
              <p className="text-sm text-ink-muted">No walks yet for {dog.name}</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {recentWalks.map(walk => {
                const walker  = data.users.find(u => u.id === walk.walkerId);
                const isVet   = walk.notes?.startsWith('VET BOOKING:');
                const initials = walker?.name
                  ? walker.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  : '?';
                return (
                  <div key={walk.id} className="flex items-center gap-3.5 px-4 py-3.5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: isVet ? '#7C3AED' : '#1B4332' }}>
                      {isVet ? '🏥' : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {isVet ? 'Vet Visit' : walker?.name || 'Unassigned'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {format(new Date(walk.scheduledDate), 'EEE, MMM d · h:mm a')}
                        {walk.duration ? ` · ${walk.duration} min` : ''}
                      </p>
                    </div>
                    <StatusBadge status={walk.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
