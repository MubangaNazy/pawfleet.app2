import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, CheckCircle2, Phone, AlertTriangle, FileText, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const SERVICE_INCLUDES: Record<string, string[]> = {
  'General Checkup':  ['Full physical exam', 'Vital signs check', 'Health report'],
  'Vaccination':      ['Rabies', 'Parvovirus', 'Distemper', 'Bordetella'],
  'Dental Care':      ['Teeth cleaning', 'Oral exam', 'Professional scaling'],
  'Deworming':        ['Internal parasites', 'Prevention treatment', '3-month plan'],
  'Emergency Visit':  ['Urgent care', 'Injury treatment', 'Priority booking'],
};

const SERVICE_ICON: Record<string, string> = {
  'General Checkup': '🩺',
  'Vaccination':     '💉',
  'Dental Care':     '🦷',
  'Deworming':       '💊',
  'Emergency Visit': '🚨',
};

const SERVICE_BASE_PRICE: Record<string, number> = {
  'General Checkup': 450,
  'Vaccination':     650,
  'Dental Care':     750,
  'Deworming':       350,
  'Emergency Visit': 800,
};

function parseVetNote(notes: string) {
  const lines      = notes.split('\n');
  const service    = lines[0]?.replace('VET BOOKING: ', '') ?? '';
  const clinicLine = lines.find(l => l.startsWith('📍 Clinic:'));
  const clinic     = clinicLine ? clinicLine.replace('📍 Clinic: ', '') : null;
  const aggressive = lines.some(l => l.includes('Aggressive'));
  const transport  = lines.some(l => l.includes('Walker transport'));
  return { service, clinic, aggressive, transport };
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending Confirmation', color: '#D97706', bg: '#FEF3C7' },
  assigned:  { label: 'Confirmed',            color: '#0891B2', bg: '#F0FDFA' },
  active:    { label: 'In Progress',          color: '#2B8A50', bg: '#EBF5EF' },
  completed: { label: 'Completed',            color: '#6B7280', bg: '#F3F4F6' },
  cancelled: { label: 'Cancelled',            color: '#DC2626', bg: '#FEF2F2' },
};

const VET_NOTE_PREFIX = '\n---VET_NOTES---\n';

function extractVetNotes(rawNotes: string): { bookingPart: string; vetNotesPart: string } {
  const idx = rawNotes.indexOf(VET_NOTE_PREFIX);
  if (idx === -1) return { bookingPart: rawNotes, vetNotesPart: '' };
  return { bookingPart: rawNotes.slice(0, idx), vetNotesPart: rawNotes.slice(idx + VET_NOTE_PREFIX.length) };
}

export default function VetAppointmentDetail() {
  const { walkId } = useParams<{ walkId: string }>();
  const navigate   = useNavigate();
  const { data, updateWalk } = useApp();

  const walk = data.walks.find(w => w.id === walkId);
  const { vetNotesPart } = walk ? extractVetNotes(walk.notes || '') : { vetNotesPart: '' };
  const [vetNotes, setVetNotes] = useState(vetNotesPart);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const saveVetNotes = async () => {
    if (!walk) return;
    setSaving(true);
    const { bookingPart } = extractVetNotes(walk.notes || '');
    const newNotes = vetNotes.trim()
      ? `${bookingPart}${VET_NOTE_PREFIX}${vetNotes.trim()}`
      : bookingPart;
    updateWalk(walk.id, { notes: newNotes });
    await new Promise(r => setTimeout(r, 300));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!walk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 p-8 text-center">
        <p className="text-4xl">🔍</p>
        <p className="font-bold text-ink">Appointment not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-ink-muted underline mt-1">Go back</button>
      </div>
    );
  }

  const pet    = data.dogs.find(d => d.id === walk.dogId);
  const owner  = data.users.find(u => u.id === walk.ownerId);
  const { service, clinic, aggressive, transport } = parseVetNote(walk.notes || '');
  const statusMeta  = STATUS_DISPLAY[walk.status] ?? STATUS_DISPLAY.pending;
  const basePrice   = SERVICE_BASE_PRICE[service] ?? walk.price;
  const svcIncludes = SERVICE_INCLUDES[service] ?? [];
  const svcIcon     = SERVICE_ICON[service] ?? '🏥';

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-secondary shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold text-ink flex-1 min-w-0 truncate">Appointment Details</h1>
      </div>

      {/* Hero */}
      <div className="mx-4 rounded-3xl overflow-hidden mb-4"
        style={{ background: 'linear-gradient(135deg,#0F766E 0%,#0891B2 100%)' }}>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              {pet?.animalType === 'cat' ? '🐈' : '🐕'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-extrabold text-white leading-tight">{pet?.name ?? 'Unknown Pet'}</p>
              {(pet?.breed || pet?.age) && (
                <p className="text-white/70 text-sm mt-0.5">
                  {[pet.breed, pet.age ? `${pet.age} yr` : null].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-lg leading-none">{svcIcon}</span>
                <span className="text-white font-semibold text-sm">{service}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <span className="text-white/80 text-sm">
              {format(parseISO(walk.scheduledDate), 'EEE, d MMM · h:mm a')}
            </span>
            <span className="text-white font-extrabold text-xl">K{walk.price}</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">

        {/* Status */}
        <div className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: statusMeta.bg }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: statusMeta.color }} />
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">Status</p>
            <p className="text-sm font-bold" style={{ color: statusMeta.color }}>{statusMeta.label}</p>
          </div>
        </div>

        {/* Service includes */}
        {svcIncludes.length > 0 && (
          <div className="bg-white border border-surface-border rounded-2xl p-4">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">Service Includes</p>
            <div className="space-y-2">
              {svcIncludes.map(item => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 text-teal-600" />
                  </div>
                  <span className="text-sm text-ink">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special flags */}
        {(aggressive || transport) && (
          <div className="bg-white border border-surface-border rounded-2xl p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Special Notes</p>
            {aggressive && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Aggressive Animal</p>
                  <p className="text-xs text-amber-700 mt-0.5">Sedation required. Use extra caution during all handling.</p>
                </div>
              </div>
            )}
            {transport && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-base mt-0.5 shrink-0">🚗</span>
                <div>
                  <p className="text-sm font-bold text-blue-800">Walker Transport Requested</p>
                  <p className="text-xs text-blue-700 mt-0.5">Owner needs a walker to transport the pet to the clinic.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clinic */}
        {clinic && (
          <div className="bg-white border border-surface-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: '#F0FDFA' }}>🏥</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-ink-muted">Assigned Clinic</p>
              <p className="text-sm font-bold text-ink">{clinic}</p>
            </div>
          </div>
        )}

        {/* Owner details */}
        <div className="bg-white border border-surface-border rounded-2xl p-4">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">Owner Details</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {owner?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'OW'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">{owner?.name ?? 'Unknown Owner'}</p>
              <p className="text-xs text-ink-muted">{owner?.phone ?? ''}</p>
            </div>
            {owner?.phone && (
              <a href={`tel:${owner.phone}`}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white shrink-0"
                style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="bg-white border border-surface-border rounded-2xl p-4">
          <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">Price Breakdown</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-secondary">{service}</span>
              <span className="text-ink">K{basePrice}</span>
            </div>
            {aggressive && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">Sedation surcharge</span>
                <span className="text-amber-700">+ K600</span>
              </div>
            )}
            {transport && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Walker transport</span>
                <span className="text-blue-700">+ K150</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-surface-border"
              style={{ color: '#0F766E' }}>
              <span>Total</span>
              <span>K{walk.price}</span>
            </div>
          </div>
        </div>

        {/* Vet clinical notes */}
        <div className="bg-white border border-surface-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F0FDFA' }}>
              <FileText className="w-4 h-4" style={{ color: '#0891B2' }} />
            </div>
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider flex-1">Vet Clinical Notes</p>
          </div>
          <textarea
            value={vetNotes}
            onChange={e => setVetNotes(e.target.value)}
            placeholder="Add examination findings, prescriptions, follow-up instructions…"
            rows={4}
            className="w-full px-3 py-2.5 text-sm text-ink bg-surface-secondary rounded-xl border border-surface-border focus:outline-none focus:border-teal-400 resize-none placeholder:text-ink-muted"
          />
          <button type="button" onClick={saveVetNotes} disabled={saving}
            className="mt-2 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: saved ? '#10B981' : 'linear-gradient(135deg,#0F766E,#0891B2)', color: 'white' }}>
            {saving
              ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving…</>
              : saved
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>
              : <><Save className="w-3.5 h-3.5" /> Save Notes</>}
          </button>
        </div>

        {/* Actions */}
        {walk.status === 'pending' && (
          <button type="button"
            onClick={() => { updateWalk(walk.id, { status: 'assigned' }); navigate(-1); }}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#0F766E,#0891B2)' }}>
            <CheckCircle2 className="w-4 h-4" /> Confirm Appointment
          </button>
        )}

        {walk.status === 'assigned' && (
          <button type="button"
            onClick={() => { updateWalk(walk.id, { status: 'completed' }); navigate(-1); }}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#2B8A50,#1B4332)' }}>
            <CheckCircle2 className="w-4 h-4" /> Mark as Completed
          </button>
        )}

      </div>
    </div>
  );
}
