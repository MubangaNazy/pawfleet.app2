import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Select, TextArea, Input } from '../../components/ui/Input';

export default function CreateWalk() {
  const { data, createWalk } = useApp();
  const navigate = useNavigate();

  const [ownerId, setOwnerId] = useState('');
  const [dogId, setDogId] = useState('');
  const [walkerId, setWalkerId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const owners = data.users.filter(u => u.role === 'owner');
  const walkers = data.users.filter(u => u.role === 'walker');
  const ownerDogs = data.dogs.filter(d => d.ownerId === ownerId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!ownerId) e.ownerId = 'Please select a dog owner';
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
      dogId, ownerId,
      walkerId: walkerId || undefined,
      status: walkerId ? 'assigned' : 'pending',
      scheduledDate: scheduledDateTime,
      price: 150, walkerEarning: 100,
      notes: notes || undefined,
    });
    setSubmitted(true);
  };

  const handleReset = () => {
    setOwnerId(''); setDogId(''); setWalkerId('');
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setScheduledTime('08:00'); setNotes(''); setErrors({}); setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="bg-white border border-surface-border rounded-2xl p-12 text-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Walk Created!</h2>
          <p className="text-ink-secondary mb-6">
            The walk has been successfully scheduled{walkerId ? ' and assigned to a walker.' : '. Assign a walker from the Walks page.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/admin/walks')}>View Walks</Button>
            <Button icon={<PlusCircle className="w-4 h-4" />} onClick={handleReset}>Create Another</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Create Walk</h1>
        <p className="text-ink-secondary mt-1">Schedule a new dog walking session</p>
      </div>

      <div className="bg-white border border-surface-border rounded-2xl p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Dog Owner *"
            options={owners.map(o => ({ value: o.id, label: o.name }))}
            placeholder="-- Select Owner --"
            value={ownerId}
            onChange={e => { setOwnerId(e.target.value); setDogId(''); setErrors(prev => ({ ...prev, ownerId: '' })); }}
            error={errors.ownerId}
          />

          <Select
            label="Select Dog *"
            options={ownerDogs.map(d => ({ value: d.id, label: `${d.name}${d.breed ? ` (${d.breed})` : ''}` }))}
            placeholder={ownerId ? '-- Select Dog --' : '-- Select Owner First --'}
            value={dogId}
            onChange={e => { setDogId(e.target.value); setErrors(prev => ({ ...prev, dogId: '' })); }}
            disabled={!ownerId || ownerDogs.length === 0}
            error={errors.dogId}
          />

          {ownerId && ownerDogs.length === 0 && (
            <p className="text-xs text-warning-dark -mt-3">This owner has no registered dogs.</p>
          )}

          <Select
            label="Assign Walker (optional)"
            options={walkers.map(w => ({ value: w.id, label: w.name }))}
            placeholder="-- Assign Later --"
            value={walkerId}
            onChange={e => setWalkerId(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Scheduled Date *"
              type="date"
              value={scheduledDate}
              onChange={e => { setScheduledDate(e.target.value); setErrors(prev => ({ ...prev, scheduledDate: '' })); }}
              min={format(new Date(), 'yyyy-MM-dd')}
              error={errors.scheduledDate}
            />
            <Input
              label="Start Time"
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>

          <TextArea
            label="Notes (optional)"
            placeholder="Special instructions, pickup location, etc."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />

          <div className="p-4 rounded-xl bg-primary-50 border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-primary">Walk Price</p>
                <p className="text-xs text-ink-secondary mt-0.5">Walker earns ZMW 100 per walk</p>
              </div>
              <p className="text-xl font-bold text-primary">ZMW 150</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/admin/walks')}>Cancel</Button>
            <Button type="submit" icon={<PlusCircle className="w-4 h-4" />}>Create Walk</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
