import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, PlusCircle, PawPrint, Clock, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Select, TextArea } from '../../components/ui/Input';

export default function OwnerRequestWalk() {
  const { data, currentUser, createWalk } = useApp();
  const navigate = useNavigate();

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const [dogId, setDogId] = useState(myDogs.length === 1 ? myDogs[0].id : '');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const selectedDog = myDogs.find(d => d.id === dogId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dogId) { setErrors({ dogId: 'Please select a dog' }); return; }
    createWalk({
      dogId,
      ownerId: currentUser!.id,
      status: 'pending',
      scheduledDate: new Date().toISOString(),
      price: 150,
      walkerEarning: 100,
      notes: notes || undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto pb-24 lg:pb-6">
        <div className="bg-white border border-surface-border rounded-2xl p-10 text-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Request Sent!</h2>
          <p className="text-ink-secondary mb-1">
            Walk request for <span className="font-semibold text-ink">{selectedDog?.name}</span> submitted.
          </p>
          <p className="text-sm text-ink-muted mb-8">
            We'll assign a walker and confirm your schedule shortly. You'll be notified once a walker is on the way.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button variant="secondary" onClick={() => navigate('/owner')}>Back to Home</Button>
            <Button
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => {
                setDogId(myDogs.length === 1 ? myDogs[0].id : '');
                setNotes('');
                setErrors({});
                setSubmitted(false);
              }}
            >
              Request Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (myDogs.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto pb-24 lg:pb-6">
        <div className="bg-white border border-surface-border rounded-2xl p-12 text-center shadow-card">
          <p className="text-4xl mb-4">🐕</p>
          <h2 className="text-lg font-semibold text-ink mb-2">No Dogs Registered</h2>
          <p className="text-ink-secondary text-sm">You don't have any dogs registered yet. Contact your admin to add your dogs.</p>
          <Button className="mt-6" variant="secondary" onClick={() => navigate('/owner')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Book a Walk</h1>
        <p className="text-ink-secondary mt-1 text-sm">We'll assign a trusted walker and confirm your time</p>
      </div>

      {/* Trust bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { icon: Shield, text: 'Vetted walkers' },
          { icon: Clock,  text: '45–60 min session' },
          { icon: PawPrint, text: 'GPS tracked' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <Icon className="w-3.5 h-3.5 text-primary" />
            {text}
          </div>
        ))}
      </div>

      <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Which dog needs a walk? *"
            options={myDogs.map(d => ({ value: d.id, label: `${d.name}${d.breed ? ` (${d.breed})` : ''}` }))}
            placeholder="-- Select your dog --"
            value={dogId}
            onChange={e => { setDogId(e.target.value); setErrors({}); }}
            error={errors.dogId}
          />

          {selectedDog && (
            <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                {selectedDog.imageUrl
                  ? <img src={selectedDog.imageUrl} alt={selectedDog.name} className="w-11 h-11 object-cover" />
                  : <span className="text-xl">🐕</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{selectedDog.name}</p>
                <p className="text-xs text-ink-muted">
                  {[selectedDog.breed, selectedDog.age ? `${selectedDog.age} yrs` : ''].filter(Boolean).join(' · ')}
                </p>
                {selectedDog.notes && (
                  <p className="text-xs text-ink-muted mt-0.5 italic">"{selectedDog.notes}"</p>
                )}
              </div>
            </div>
          )}

          <TextArea
            label="Special Instructions (optional)"
            placeholder="e.g. pickup from front door, avoid the east park, leash sensitivity..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />

          {/* Pricing */}
          <div className="p-4 rounded-xl bg-primary-50 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Walk Fee</p>
                <p className="text-xs text-ink-secondary mt-0.5">~45–60 minute session · GPS tracked</p>
              </div>
              <p className="text-2xl font-bold text-primary">ZMW 150</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => navigate('/owner')}>Cancel</Button>
            <Button type="submit" icon={<PlusCircle className="w-4 h-4" />}>Book Now</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
