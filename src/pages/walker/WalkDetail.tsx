import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, Clock, DollarSign, User, Phone,
  CheckCircle2, XCircle, Play, Navigation, Scissors, Star, AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

async function getGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve({ lat: -15.4167, lng: 28.2833 }); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: -15.4167, lng: 28.2833 }),
      { timeout: 8000 }
    );
  });
}

export default function WalkerWalkDetail() {
  const { walkId } = useParams<{ walkId: string }>();
  const navigate = useNavigate();
  const { data, currentUser, assignWalker, declineWalk, startWalk } = useApp();

  const [accepting, setAccepting] = useState(false);
  const [starting, setStarting] = useState(false);

  const walk = data.walks.find(w => w.id === walkId);
  const dog = data.dogs.find(d => d.id === walk?.dogId);
  const owner = data.users.find(u => u.id === walk?.ownerId);

  const isAvailable = walk?.status === 'pending' && !walk?.walkerId;
  const isAssigned  = walk?.status === 'assigned' && walk?.walkerId === currentUser?.id;
  const isActive    = walk?.status === 'active'   && walk?.walkerId === currentUser?.id;
  const isCompleted = walk?.status === 'completed';

  const isGrooming = walk?.notes?.startsWith('GROOMING:');

  if (!walk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <p className="text-ink-muted text-lg">Walk not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary font-semibold underline">Go back</button>
      </div>
    );
  }

  const handleAccept = async () => {
    if (!currentUser) return;
    setAccepting(true);
    try {
      await assignWalker(walkId!, currentUser.id);
      await new Promise(r => setTimeout(r, 500));
      navigate('/walker/walks');
    } finally {
      setAccepting(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const loc = await getGPS();
      startWalk(walkId!, loc);
      await new Promise(r => setTimeout(r, 400));
      navigate(`/walker/live/${walkId}`);
    } finally {
      setStarting(false);
    }
  };

  const handleDeclineAssigned = () => {
    declineWalk(walkId!);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-ink">Walk Details</h1>
          <p className="text-xs text-ink-muted">
            {isAvailable ? 'Available to accept' : isAssigned ? 'Assigned to you' : isActive ? 'Active walk' : 'Completed'}
          </p>
        </div>
        {isGrooming && (
          <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <Scissors className="w-3 h-3" /> Grooming
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-40 p-4 space-y-4">

        {/* Dog card */}
        <div className="bg-white rounded-2xl border border-surface-border p-5 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[#EBF5EF] flex items-center justify-center shrink-0 border-2 border-primary/20">
            {dog?.imageUrl
              ? <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
              : <span className="text-4xl">🐕</span>
            }
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-ink">{dog?.name || 'Unknown Dog'}</h2>
            {dog?.breed && <p className="text-sm text-ink-muted">{dog.breed}</p>}
            {dog?.age && <p className="text-xs text-ink-muted mt-0.5">{dog.age} year{dog.age !== 1 ? 's' : ''} old</p>}
          </div>
        </div>

        {/* Owner info */}
        <div className="bg-white rounded-2xl border border-surface-border p-4">
          <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Owner</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF5EF] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" style={{ color: '#2B8A50' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">{owner?.name || 'Unknown'}</p>
              {owner?.phone && (
                <a href={`tel:${owner.phone}`} className="flex items-center gap-1 text-xs text-primary mt-0.5">
                  <Phone className="w-3 h-3" /> {owner.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Date & time */}
        <div className="bg-white rounded-2xl border border-surface-border p-4">
          <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">Schedule</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF5EF] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" style={{ color: '#2B8A50' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {format(new Date(walk.scheduledDate), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xs text-ink-muted">
                {format(new Date(walk.scheduledDate), 'h:mm a')}
              </p>
            </div>
          </div>
        </div>

        {/* Duration & Earnings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-surface-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF5EF] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" style={{ color: '#2B8A50' }} />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Duration</p>
              <p className="text-base font-extrabold text-ink">
                {walk.duration ? `${walk.duration} min` : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-surface-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF5EF] flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" style={{ color: '#2B8A50' }} />
            </div>
            <div>
              <p className="text-xs text-ink-muted">You Earn</p>
              <p className="text-base font-extrabold" style={{ color: '#1B4332' }}>
                K{walk.walkerEarning}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {walk.notes && (
          <div className="bg-white rounded-2xl border border-surface-border p-4">
            <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-sm text-ink italic leading-relaxed">"{walk.notes}"</p>
          </div>
        )}

        {/* GPS info for assigned */}
        {isAssigned && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            GPS location will be captured when you start the walk.
          </div>
        )}

        {/* Completion summary */}
        {isCompleted && (
          <div className="bg-white rounded-2xl border border-surface-border p-5" style={{ background: '#EBF5EF' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: '#1B4332' }}>Walk Completed</h3>
            <div className="space-y-2">
              {walk.duration && (
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Duration</span>
                  <span className="font-semibold text-ink">{walk.duration} min</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Earnings</span>
                <span className="font-bold" style={{ color: '#1B4332' }}>K{walk.walkerEarning}</span>
              </div>
              {walk.rating && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-ink-muted">Rating</span>
                  <span className="flex items-center gap-1 font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {walk.rating}/5
                  </span>
                </div>
              )}
              {walk.ratingComment && (
                <p className="text-xs text-ink-muted italic mt-2">"{walk.ratingComment}"</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      {(isAvailable || isAssigned || isActive) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-surface-border px-4 py-4 space-y-3 shadow-2xl max-w-lg mx-auto">
          {isAvailable && (
            <>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
              >
                {accepting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Accepting…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Accept Walk
                  </>
                )}
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3.5 rounded-2xl font-bold text-base border-2 border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-all"
              >
                Decline
              </button>
            </>
          )}

          {isAssigned && (
            <>
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
              >
                {starting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Getting GPS…
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Walk
                  </>
                )}
              </button>
              <button
                onClick={handleDeclineAssigned}
                className="w-full py-3.5 rounded-2xl font-bold text-base border-2 border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Decline Walk
                </span>
              </button>
            </>
          )}

          {isActive && (
            <Link
              to={`/walker/live/${walkId}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold text-base transition-all"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
            >
              <Navigation className="w-5 h-5" />
              Go Live
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
