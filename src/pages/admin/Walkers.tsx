import { useState } from 'react';
import { Phone, Activity, Flame, Plus, X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NewWalkerForm {
  name: string;
  phone: string;
  email: string;
  password: string;
}
const BLANK: NewWalkerForm = { name: '', phone: '', email: '', password: '' };

export default function AdminWalkers() {
  const { data, getWalkerStats, addUser } = useApp();
  const walkers = data.users.filter(u => u.role === 'walker');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewWalkerForm>(BLANK);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const getStats = (walkerId: string) => {
    const walks = data.walks.filter(w => w.walkerId === walkerId && w.status === 'completed');
    const payments = data.payments.filter(p => p.walkerId === walkerId);
    const totalEarned = payments.reduce((s, p) => s + p.amount, 0);
    const unpaid = payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);
    const paid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const activeWalk = data.walks.find(w => w.walkerId === walkerId && w.status === 'active');
    return { completedWalks: walks.length, totalEarned, unpaid, paid, activeWalk };
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.phone.trim()) { setError('Phone is required'); return; }
    if (!form.password.trim() || form.password.length < 4) { setError('Password must be at least 4 characters'); return; }
    setError('');
    setSaving(true);
    try {
      addUser({ name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), password: form.password, role: 'walker' });
      setForm(BLANK);
      setShowAdd(false);
    } catch {
      setError('Failed to add walker. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalCompleted = walkers.reduce((s, w) => s + getStats(w.id).completedWalks, 0);
  const totalEarned    = walkers.reduce((s, w) => s + getStats(w.id).totalEarned, 0);
  const totalUnpaid    = walkers.reduce((s, w) => s + getStats(w.id).unpaid, 0);
  const activeCount    = walkers.filter(w => getStats(w.id).activeWalk).length;

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-7 mb-5"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-white">
            <p className="text-white/70 text-xs font-medium mb-1">Admin · Team</p>
            <h1 className="text-2xl font-extrabold">Walkers</h1>
            <p className="text-white/75 text-sm mt-1">{walkers.length} registered · {activeCount} on walk now</p>
          </div>
          <button onClick={() => { setShowAdd(true); setForm(BLANK); setError(''); }}
            className="flex items-center gap-2 bg-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform shrink-0"
            style={{ color: '#1B4332' }}>
            <Plus className="w-4 h-4" /> Add Walker
          </button>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: 'Walks Done', value: totalCompleted },
            { label: 'Total Earned', value: `K${totalEarned.toLocaleString()}` },
            { label: 'Unpaid', value: `K${totalUnpaid.toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl px-3 py-3 text-center">
              <p className="text-lg font-extrabold text-white">{s.value}</p>
              <p className="text-white/70 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        {walkers.length === 0 ? (
          <div className="bg-white border border-surface-border rounded-2xl p-16 text-center">
            <UserPlus className="w-12 h-12 text-ink-muted mx-auto mb-3" />
            <p className="font-semibold text-ink mb-1">No walkers yet</p>
            <p className="text-sm text-ink-muted mb-4">Add your first walker to get started</p>
            <button onClick={() => setShowAdd(true)}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: '#1B4332' }}>
              Add Walker
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {walkers.map(walker => {
              const stats = getStats(walker.id);
              const gamStats = getWalkerStats(walker.id);
              const initials = (n: string) => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
              const pctPaid = stats.totalEarned > 0 ? (stats.paid / stats.totalEarned) * 100 : 0;

              return (
                <div key={walker.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
                  {/* Walker header */}
                  <div className="px-5 pt-5 pb-4 border-b border-surface-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#1B4332,#2B8A50)' }}>
                        {initials(walker.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-ink">{walker.name}</h3>
                          {stats.activeWalk && (
                            <span className="flex items-center gap-1 text-xs text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> On Walk
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                          <Phone className="w-3 h-3" /> {walker.phone}
                        </div>
                        {walker.email && <p className="text-xs text-ink-muted">{walker.email}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 divide-x divide-surface-border border-b border-surface-border">
                    {[
                      { label: 'Walks', value: stats.completedWalks, color: 'text-ink' },
                      { label: 'Paid', value: `K${stats.paid}`, color: 'text-success' },
                      { label: 'Owed', value: `K${stats.unpaid}`, color: 'text-amber-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center py-3">
                        <p className={`text-base font-extrabold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-ink-muted mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Payout progress */}
                  <div className="px-5 py-3 border-b border-surface-border">
                    <div className="flex justify-between text-xs text-ink-muted mb-1.5">
                      <span>Payout progress</span>
                      <span>{Math.round(pctPaid)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pctPaid}%`, background: '#2B8A50' }} />
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-ink-muted font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" style={{ color: '#2B8A50' }} /> Achievements
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: '#2B8A50' }}>{gamStats.points} pts</span>
                        {gamStats.streak > 0 && (
                          <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" /> {gamStats.streak}d
                          </span>
                        )}
                      </div>
                    </div>
                    {gamStats.badges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {gamStats.badges.map(badge => (
                          <span key={badge.id} className="text-[10px] px-2 py-1 rounded-lg bg-surface-secondary border border-surface-border">
                            {badge.icon} {badge.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted italic">No badges yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Walker Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-border">
              <h2 className="font-bold text-ink">Add New Walker</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover">
                <X className="w-4 h-4 text-ink-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && <p className="text-xs text-danger font-medium bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="e.g. Chanda Mwale" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Phone Number *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="e.g. 0977 123456" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="chanda@email.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-secondary block mb-1">Login Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-surface-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary pr-10"
                    placeholder="Min. 4 characters" />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-2xl border border-surface-border text-sm font-semibold text-ink-secondary">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#1B4332' }}>
                {saving ? 'Adding…' : 'Add Walker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
