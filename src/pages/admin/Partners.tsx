import { useState } from 'react';
import { Building2, Check, ChevronDown, ChevronUp, Eye, EyeOff, Mail, Phone, Plus, Stethoscope, Store, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Role } from '../../types';

type Tab = 'vet' | 'shopowner';

const TAB_META: Record<Tab, { label: string; singular: string; icon: typeof Stethoscope; emptyLine: string }> = {
  vet:       { label: 'Vet Clinics', singular: 'Vet Clinic', icon: Stethoscope, emptyLine: 'No vet clinics yet. Add one to let owners book real appointments with them.' },
  shopowner: { label: 'Shop Owners', singular: 'Shop Owner', icon: Store,       emptyLine: 'No shop owners yet. Add one so they can list products in the Shop.' },
};

const BLANK = { name: '', email: '', phone: '', password: '', businessName: '', businessAddress: '' };

/**
 * Admin creates real vet and shop-owner logins. Self sign-up for these roles was removed on purpose —
 * these are businesses PawFleet vouches for, so an admin sets them up directly, the same trusted way
 * walkers are added in Admin > Walkers.
 */
export default function AdminPartners() {
  const { data, addUser } = useApp();
  const [tab, setTab] = useState<Tab>('vet');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const meta = TAB_META[tab];
  const list = data.users.filter(u => u.role === tab).sort((a, b) => a.name.localeCompare(b.name));

  const openAdd = () => { setForm(BLANK); setError(''); setCreated(null); setShowAdd(true); };

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required — it becomes their login.'); return; }
    if (!form.phone.trim()) { setError('Phone is required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setSaving(true);
    const result = await addUser({
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password,
      role: tab as Role,
      businessName: form.businessName.trim() || undefined,
      businessAddress: form.businessAddress.trim() || undefined,
    });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setCreated({ email: form.email.trim(), password: form.password });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="pf-heading">Vets & Shop Owners</h1>
        <p className="pf-subtitle">Add real business accounts. Self sign-up for these is switched off on purpose.</p>
      </div>

      <div className="flex gap-2">
        {(Object.keys(TAB_META) as Tab[]).map(t => {
          const Icon = TAB_META[t].icon;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                tab === t ? 'border-primary bg-primary/5 text-primary' : 'border-surface-border text-ink-secondary'
              }`}>
              <Icon className="w-4 h-4" /> {TAB_META[t].label} <span className="text-xs opacity-70">({data.users.filter(u => u.role === t).length})</span>
            </button>
          );
        })}
      </div>

      <button onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white active:scale-[0.98] transition-all"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        <Plus className="w-4 h-4" /> Add {meta.singular}
      </button>

      {list.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-2xl py-12 px-6 text-center">
          <meta.icon className="w-8 h-8 mx-auto mb-3 text-ink-muted" />
          <p className="text-sm text-ink-muted max-w-xs mx-auto leading-relaxed">{meta.emptyLine}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(u => {
            const open = expanded === u.id;
            return (
              <div key={u.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(open ? null : u.id)}
                  className="w-full flex items-center gap-3 p-4 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    {u.imageUrl ? <img src={u.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" /> : u.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{u.businessName || u.name}</p>
                    <p className="text-xs text-ink-muted truncate">{u.email}</p>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-ink-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-2 border-t border-surface-border pt-3">
                    <p className="text-xs text-ink-secondary flex items-center gap-2"><Building2 className="w-3.5 h-3.5 shrink-0" /> Contact: {u.name}</p>
                    <p className="text-xs text-ink-secondary flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> {u.email}</p>
                    <p className="text-xs text-ink-secondary flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> {u.phone}</p>
                    {u.businessAddress && <p className="text-xs text-ink-secondary">📍 {u.businessAddress}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => !saving && setShowAdd(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="font-extrabold text-ink">
                {created ? `${meta.singular} added` : `Add a ${meta.singular}`}
              </h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:bg-surface-hover">
                <X className="w-4 h-4" />
              </button>
            </div>

            {created ? (
              <div className="p-5 space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" style={{ color: '#2B8A50' }} />
                </div>
                <p className="text-sm text-ink-secondary text-center leading-relaxed">
                  Their login is ready and a welcome email with these details was sent to <strong>{created.email}</strong>.
                </p>
                <div className="rounded-2xl bg-surface-secondary p-4 text-sm space-y-1">
                  <p><span className="text-ink-muted">Email:</span> <strong>{created.email}</strong></p>
                  <p><span className="text-ink-muted">Password:</span> <strong>{created.password}</strong></p>
                </div>
                <p className="text-xs text-ink-muted text-center">They can change this password from their own Profile once they log in.</p>
                <button onClick={() => setShowAdd(false)}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white" style={{ background: '#1B4332' }}>
                  Done
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">{tab === 'vet' ? 'Clinic name' : 'Shop name'} (optional)</label>
                  <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder={tab === 'vet' ? 'e.g. Lusaka Veterinary Clinic' : 'e.g. Chanda Pet Supplies'} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Contact person's name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="e.g. Dr. Mwansa Phiri" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Email * (becomes their login)</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="clinic@email.com" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Phone *</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="e.g. 0977 123456" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Address (optional)</label>
                  <input value={form.businessAddress} onChange={e => setForm(f => ({ ...f, businessAddress: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="e.g. Cairo Road, Lusaka" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-secondary block mb-1">Login password *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary pr-10"
                      placeholder="Min. 6 characters" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1">They'll get this by email and can change it themselves afterwards.</p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary">
                    Cancel
                  </button>
                  <button onClick={handleAdd} disabled={saving}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#1B4332' }}>
                    {saving ? 'Adding…' : `Add ${meta.singular}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
