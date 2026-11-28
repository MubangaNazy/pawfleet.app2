import { useRef, useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { prepareImage } from '../../lib/image';
import {
  APPLICATION_FORMS, fieldLabel, fieldVisible,
  type AppCtx, type AppField, type ApplicationValues, type ApplyService,
} from '../../lib/applications';

const inputCls = 'w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-ink focus:outline-none focus:border-primary';

/** The questions for one application type, plus the pledge. Controlled: the parent keeps the answers. */
export default function ApplicationForm({ service, value, onChange, ctx }: {
  service: ApplyService;
  value: ApplicationValues;
  onChange: (v: ApplicationValues) => void;
  ctx: AppCtx;
}) {
  const form = APPLICATION_FORMS[service];
  const set = (k: string, val: ApplicationValues[string]) => onChange({ ...value, [k]: val });

  return (
    <div className="rounded-2xl border border-gray-100 bg-[#F9FAFB] p-4 space-y-4">
      <div>
        <p className="text-sm font-extrabold text-ink">{form.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{form.intro}</p>
      </div>

      {form.fields.filter(f => fieldVisible(f, value, ctx)).map(f => (
        <Field key={f.key} f={f} ctx={ctx} value={value[f.key]} onChange={v => set(f.key, v)} />
      ))}

      <div className="rounded-xl bg-white border border-gray-200 p-3.5 space-y-2">
        <p className="text-xs font-bold text-ink">The PawFleet promise</p>
        <ul className="space-y-1.5">
          {form.pledge.map(p => <li key={p} className="text-xs text-gray-600 leading-relaxed flex gap-2"><span className="text-primary">•</span>{p}</li>)}
        </ul>
        <button type="button" onClick={() => set('pledgeAccepted', !value.pledgeAccepted)}
          className="flex items-center gap-2.5 pt-1 text-left">
          <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${value.pledgeAccepted ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}>
            {value.pledgeAccepted && <Check className="w-3.5 h-3.5 text-white" />}
          </span>
          <span className="text-xs font-semibold text-ink">I agree to follow these rules</span>
        </button>
      </div>
    </div>
  );
}

function Field({ f, ctx, value, onChange }: { f: AppField; ctx: AppCtx; value: ApplicationValues[string]; onChange: (v: ApplicationValues[string]) => void }) {
  const label = fieldLabel(f, ctx);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoErr, setPhotoErr] = useState('');

  const heading = (
    <p className="text-xs font-semibold text-gray-700 mb-1.5">
      {label}
      {f.help && <span className="block font-normal text-[11px] text-gray-400 mt-0.5">{f.help}</span>}
    </p>
  );

  if (f.type === 'yesno') {
    return (
      <div>
        {heading}
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map(b => (
            <button key={String(b)} type="button" onClick={() => onChange(b)}
              className={`h-10 rounded-xl text-sm font-semibold border ${value === b ? 'text-white border-transparent' : 'bg-white border-gray-200 text-ink'}`}
              style={value === b ? { background: '#2B8A50' } : undefined}>{b ? 'Yes' : 'No'}</button>
          ))}
        </div>
      </div>
    );
  }

  if (f.type === 'select' || f.type === 'multi') {
    const list = Array.isArray(value) ? value : [];
    return (
      <div>
        {heading}
        <div className="flex flex-wrap gap-2">
          {f.options!.map(o => {
            const on = f.type === 'multi' ? list.includes(o) : value === o;
            return (
              <button key={o} type="button"
                onClick={() => onChange(f.type === 'multi' ? (on ? list.filter(x => x !== o) : [...list, o]) : o)}
                className={`px-3 h-9 rounded-full text-xs font-semibold border ${on ? 'text-white border-transparent' : 'bg-white border-gray-200 text-ink'}`}
                style={on ? { background: '#2B8A50' } : undefined}>{o}</button>
            );
          })}
        </div>
      </div>
    );
  }

  if (f.type === 'photo') {
    return (
      <div>
        {heading}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full h-28 rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden flex items-center justify-center">
          {typeof value === 'string' && value
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <span className="flex flex-col items-center gap-1 text-gray-400 text-xs"><Camera className="w-5 h-5" />Tap to add a photo</span>}
        </button>
        {photoErr && <p className="text-[11px] text-red-500 mt-1">{photoErr}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = '';
            if (!file) return;
            try { onChange(await prepareImage(file, { maxDim: 1200, quality: 0.75, maxBytes: 250_000 })); setPhotoErr(''); }
            catch { setPhotoErr('That photo could not be read. Try another.'); }
          }} />
      </div>
    );
  }

  if (f.type === 'textarea') {
    return (
      <div>
        {heading}
        <textarea value={String(value ?? '')} onChange={e => onChange(e.target.value.slice(0, 600))} rows={3} placeholder={f.placeholder}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-ink focus:outline-none focus:border-primary" />
      </div>
    );
  }

  return (
    <div>
      {heading}
      <input className={inputCls} type={f.type === 'number' ? 'number' : 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined}
        min={f.type === 'number' ? 0 : undefined}
        value={value === undefined ? '' : String(value)} placeholder={f.placeholder}
        onChange={e => onChange(f.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value.slice(0, 160))} />
    </div>
  );
}

/** Read-only view of a submitted application, for the admin review screens. */
export function ApplicationSummary({ service, value }: { service: ApplyService; value?: ApplicationValues }) {
  if (!value || Object.keys(value).length === 0) {
    return <p className="text-[11px] text-ink-muted italic">No application details on file (applied before the new form, or from the quick button).</p>;
  }
  const ctx: AppCtx = { isBusiness: value.kind === 'shelter' || value.kind === 'business' };
  const fields = APPLICATION_FORMS[service].fields.filter(f => value[f.key] !== undefined && value[f.key] !== '');
  const show = (v: ApplicationValues[string]) => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : String(v));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-1">
        {fields.filter(f => f.type !== 'photo').map(f => (
          <div key={f.key} className="flex justify-between gap-3 text-[11px]">
            <span className="text-ink-muted">{fieldLabel(f, ctx)}</span>
            <span className={`font-semibold text-right ${value[f.key] === false ? 'text-amber-700' : 'text-ink'}`}>{show(value[f.key])}</span>
          </div>
        ))}
      </div>
      {fields.some(f => f.type === 'photo') && (
        <div className="grid grid-cols-2 gap-2">
          {fields.filter(f => f.type === 'photo').map(f => (
            <a key={f.key} href={String(value[f.key])} target="_blank" rel="noopener noreferrer" className="block">
              <img src={String(value[f.key])} alt="" className="w-full h-24 object-cover rounded-lg border border-surface-border" />
              <span className="text-[10px] text-ink-muted">{fieldLabel(f, ctx)}</span>
            </a>
          ))}
        </div>
      )}
      <p className="text-[10px] text-ink-muted">
        {value.pledgeAccepted ? '✓ Agreed to the PawFleet promise' : '✗ Did not agree to the promise'}
        {value.submittedAt ? ` · sent ${String(value.submittedAt).slice(0, 10)}` : ''}
      </p>
    </div>
  );
}
