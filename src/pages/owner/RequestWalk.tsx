import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, PlusCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Select, TextArea, Input } from '../../components/ui/Input';

export default function OwnerRequestWalk() {
  const { data, currentUser, createWalk } = useApp();
  const navigate = useNavigate();

  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const [dogId, setDogId] = useState(myDogs.length === 1 ? myDogs[0].id : '');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const selectedDog = myDogs.find(d => d.id === dogId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!dogId) e.dogId = 'Please select a dog';
    if (!scheduledDate) e.scheduledDate = 'Please select a date';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    createWalk({
      dogId, ownerId: currentUser!.id, status: 'pending',
      scheduledDate: scheduledDateTime, price: 150, walkerEarning: 100,
      notes: notes || undefined,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto">
        <div className="bg-white border border-surface-border rounded-2xl p-12 text-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Walk Requested!</h2>
          <p className="text-ink-secondary mb-2">
            Your walk request for <span className="font-medium text-ink">{selectedDog?.name}</span> has been submitted.
          </p>
          <p className="text-sm text-ink-muted mb-6">
            Scheduled for {format(new Date(`${scheduledDate}T${scheduledTime}`), 'MMMM d, yyyy at h:mm a')}<br />
            We'll assign a walker and confirm shortly.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/owner')}>Back to Dashboard</Button>
            <Button icon={<PlusCircle className="w-4 h-4" />} onClick={() => { setDogId(myDogs.length === 1 ? myDogs[0].id : ''); setScheduledDate(format(new Date(), 'yyyy-MM-dd')); setScheduledTime('08:00'); setNotes(''); setErrors({}); setSubmitted(false); }}>
              Request Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (myDogs.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto">
        <div className="bg-white border border-surface-border rounded-2xl p-12 text-center shadow-card">
          <p className="text-4xl mb-4">🐕</p>
          <h2 className="text-lg font-semibold text-ink mb-2">No Dogs Registered</h2>
          <p className="text-ink-secondary text-sm">You don't have any dogs registered yet. Please contact your admin to add your dogs.</p>
          <Button className="mt-6" variant="secondary" onClick={() => navigate('/owner')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Book a Walk</h1>
        <p className="text-ink-secondary mt-1">Schedule a walk for your dog — we'll assign a walker for you</p>
      </div>

      <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Select Dog *"
            options={myDogs.map(d => ({ value: d.id, label: `${d.name}${d.breed ? ` (${d.breed})` : ''}` }))}
            placeholder="-- Choose your dog --"
            value={dogId}
            onChange={e => { setDogId(e.target.value); setErrors(prev => ({ ...prev, dogId: '' })); }}
            error={errors.dogId}
          />

          {selectedDog && (
            <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center overflow-hidden shrink-0">
                {selectedDog.imageUrl ? <img src={selectedDog.imageUrl} alt={selectedDog.name} className="w-10 h-10 object-cover" /> : <span className="text-xl">🐕</span>}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{selectedDog.name}</p>
                <p className="text-xs text-ink-muted">{selectedDog.breed}{selectedDog.age ? ` · ${selectedDog.age} yrs` : ''}</p>
                {selectedDog.notes && <p className="text-xs text-ink-muted mt-0.5 italic">{selectedDog.notes}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Preferred Date *"
              type="date"
              value={scheduledDate}
              onChange={e => { setScheduledDate(e.target.value); setErrors(prev => ({ ...prev, scheduledDate: '' })); }}
              min={format(new Date(), 'yyyy-MM-dd')}
              error={errors.scheduledDate}
              leftIcon={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="Preferred Time"
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>

          <TextArea
            label="Special Instructions (optional)"
            placeholder="e.g. pickup from front door, avoid the east park, leash sensitivity..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />

          <div className="p-4 rounded-xl bg-primary-50 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Walk Fee</p>
                <p className="text-xs text-ink-secondary mt-0.5">~45–60 minute session</p>
              </div>
              <p className="text-2xl font-bold text-primary">ZMW 150</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/owner')}>Cancel</Button>
            <Button type="submit" icon={<PlusCircle className="w-4 h-4" />}>Submit Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
