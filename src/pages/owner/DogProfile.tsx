import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, ArrowLeft, Droplets, Coffee, Moon, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
      <div className="p-4 sm:p-6 max-w-2xl mx-auto text-center">
        <p className="text-ink-muted">Dog not found or access denied.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/owner')}>Go Back</Button>
      </div>
    );
  }

  const todayLog = dog.healthLogs?.find(l => l.date === today);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000);
    return d.toISOString().split('T')[0];
  });

  const dogWalks = data.walks
    .filter(w => w.dogId === dog.id)
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .slice(0, 5);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      updateDog(dog.id, { imageUrl: dataUrl });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleHealth = (field: keyof Pick<HealthLog, 'water' | 'foodMorning' | 'foodEvening'>, current?: boolean) => {
    logHealth(dog.id, today, field, !current);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/owner')} className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Dog Card */}
      <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-card">
        <div className="flex items-start gap-5">
          {/* Image */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center overflow-hidden border-2 border-surface-border">
              {dog.imageUrl ? (
                <img src={dog.imageUrl} alt={dog.name} className="w-20 h-20 object-cover" />
              ) : (
                <span className="text-4xl">🐕</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-primary border-2 border-white flex items-center justify-center shadow-sm hover:bg-primary-600 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          {/* Info */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-ink">{dog.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-ink-secondary">
              {dog.breed && <span>{dog.breed}</span>}
              {dog.age && <span>· {dog.age} yrs old</span>}
            </div>
            {dog.notes && (
              <p className="mt-2 text-sm text-ink-secondary italic bg-surface-secondary rounded-xl px-3 py-2">{dog.notes}</p>
            )}
          </div>
        </div>
        {uploading && <p className="text-xs text-ink-muted mt-3">Uploading image...</p>}
      </div>

      {/* Today's Health Log */}
      <div className="bg-white border border-surface-border rounded-2xl p-5 shadow-card">
        <h2 className="font-semibold text-ink mb-4">Today's Health Log</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleHealth('water', todayLog?.water)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${todayLog?.water ? 'bg-info border-info text-white' : 'border-surface-border text-ink-muted hover:border-info'}`}
          >
            <Droplets className="w-4 h-4" /> Water {todayLog?.water ? '✓' : ''}
          </button>
          <button
            onClick={() => toggleHealth('foodMorning', todayLog?.foodMorning)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${todayLog?.foodMorning ? 'bg-success border-success text-white' : 'border-surface-border text-ink-muted hover:border-success'}`}
          >
            <Coffee className="w-4 h-4" /> Morning {todayLog?.foodMorning ? '✓' : ''}
          </button>
          <button
            onClick={() => toggleHealth('foodEvening', todayLog?.foodEvening)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${todayLog?.foodEvening ? 'bg-warning border-warning text-white' : 'border-surface-border text-ink-muted hover:border-warning'}`}
          >
            <Moon className="w-4 h-4" /> Evening {todayLog?.foodEvening ? '✓' : ''}
          </button>
        </div>
      </div>

      {/* 7-Day Health Log */}
      <div className="bg-white border border-surface-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-ink">Last 7 Days</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-5 py-3 text-left text-xs font-medium text-ink-muted whitespace-nowrap">Date</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-ink-muted">
                  <Droplets className="w-3.5 h-3.5 mx-auto text-info" />
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-ink-muted">
                  <Coffee className="w-3.5 h-3.5 mx-auto text-success" />
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-ink-muted">
                  <Moon className="w-3.5 h-3.5 mx-auto text-warning" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {last7Days.map(dateStr => {
                const log = dog.healthLogs?.find(l => l.date === dateStr);
                const isToday = dateStr === today;
                return (
                  <tr key={dateStr} className={`${isToday ? 'bg-primary-50' : 'hover:bg-surface-secondary'} transition-colors`}>
                    <td className="px-5 py-3 text-xs">
                      <span className={isToday ? 'font-semibold text-primary' : 'text-ink-secondary'}>
                        {isToday ? 'Today' : format(new Date(dateStr), 'EEE, MMM d')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {log?.water ? <CheckCircle className="w-4 h-4 text-info mx-auto" /> : <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {log?.foodMorning ? <CheckCircle className="w-4 h-4 text-success mx-auto" /> : <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {log?.foodEvening ? <CheckCircle className="w-4 h-4 text-warning mx-auto" /> : <span className="text-ink-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Walk History */}
      <div className="bg-white border border-surface-border rounded-2xl shadow-card">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-ink">Recent Walks</h2>
        </div>
        <div className="divide-y divide-surface-border">
          {dogWalks.length === 0 ? (
            <div className="p-8 text-center text-ink-muted text-sm">No walks yet for {dog.name}</div>
          ) : dogWalks.map(walk => {
            const walker = data.users.find(u => u.id === walk.walkerId);
            return (
              <div key={walk.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-secondary transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink">{format(new Date(walk.scheduledDate), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-ink-muted">{walker?.name || 'Unassigned'} {walk.duration ? `· ${walk.duration} min` : ''}</p>
                </div>
                <StatusBadge status={walk.status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
