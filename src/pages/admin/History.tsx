import { useEffect, useState } from 'react';
import { AlertCircle, Bell, ChevronDown, ChevronUp, CircleCheck, Loader2, Mail, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

type Tab = 'notifications' | 'emails';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  recipient: { id: string; name: string; email?: string; role: string } | null;
}

interface EmailRow {
  id: string;
  to_email: string;
  template: string;
  subject: string;
  status: 'sent' | 'failed';
  error: string | null;
  resend_id: string | null;
  created_at: string;
}

const TAB_META: Record<Tab, { label: string; icon: typeof Bell }> = {
  notifications: { label: 'Notifications', icon: Bell },
  emails: { label: 'Emails', icon: Mail },
};

/** Admin-only read of what PawFleet has actually sent — push/in-app notifications and emails — for
 * support and debugging. Both come from server-only tables via api/admin-history.js. */
export default function AdminHistory() {
  const [tab, setTab] = useState<Tab>('notifications');
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (kind: Tab) => {
    setLoading(true);
    setError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { setError('Please log out, log back in, then try again.'); setLoading(false); return; }
      const res = await fetch(`/api/admin-history?kind=${kind}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Could not load this.'); setLoading(false); return; }
      if (kind === 'notifications') setNotifications(json.rows || []);
      else setEmails(json.rows || []);
    } catch {
      setError("We can't reach PawFleet right now. Check your connection and try again.");
    }
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const filteredNotifications = notifications.filter(n =>
    !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) ||
    n.recipient?.name.toLowerCase().includes(q) || n.recipient?.email?.toLowerCase().includes(q) || n.type.toLowerCase().includes(q));
  const filteredEmails = emails.filter(e =>
    !q || e.subject.toLowerCase().includes(q) || e.to_email.toLowerCase().includes(q) || e.template.toLowerCase().includes(q));

  const fmtTime = (iso: string) => { try { return format(new Date(iso), 'd MMM, HH:mm'); } catch { return iso; } };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="pf-heading">Notification & Email History</h1>
          <p className="pf-subtitle">What PawFleet has actually sent, most recent first.</p>
        </div>
        <button onClick={() => load(tab)} disabled={loading}
          className="w-9 h-9 rounded-full border border-surface-border flex items-center justify-center shrink-0 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-ink-muted" /> : <RefreshCw className="w-4 h-4 text-ink-muted" />}
        </button>
      </div>

      <div className="flex gap-2">
        {(Object.keys(TAB_META) as Tab[]).map(t => {
          const Icon = TAB_META[t].icon;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                tab === t ? 'border-primary bg-primary/5 text-primary' : 'border-surface-border text-ink-secondary'
              }`}>
              <Icon className="w-4 h-4" /> {TAB_META[t].label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-surface-secondary rounded-2xl px-4 py-3">
        <Search className="w-4 h-4 text-ink-muted shrink-0" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'notifications' ? 'Search by name, email, title…' : 'Search by email, subject, template…'}
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none" />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-muted" /></div>
      ) : tab === 'notifications' ? (
        filteredNotifications.length === 0 ? (
          <EmptyState label="No notifications yet." />
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map(n => {
              const open = expanded === n.id;
              return (
                <div key={n.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
                  <button onClick={() => setExpanded(open ? null : n.id)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
                      <Bell className="w-4 h-4" style={{ color: '#2B8A50' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{n.title}</p>
                      <p className="text-xs text-ink-muted truncate">
                        {n.recipient ? `${n.recipient.name} (${n.recipient.role})` : 'Unknown recipient'} · {fmtTime(n.created_at)}
                      </p>
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-ink-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" />}
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-1.5 border-t border-surface-border pt-3">
                      <p className="text-sm text-ink-secondary leading-relaxed">{n.body}</p>
                      <p className="text-xs text-ink-muted">Type: {n.type} · {n.read ? 'Read' : 'Unread'}</p>
                      {n.recipient?.email && <p className="text-xs text-ink-muted">Email: {n.recipient.email}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : filteredEmails.length === 0 ? (
        <EmptyState label="No emails logged yet." />
      ) : (
        <div className="space-y-2">
          {filteredEmails.map(e => {
            const open = expanded === e.id;
            return (
              <div key={e.id} className="bg-white border border-surface-border rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(open ? null : e.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: e.status === 'sent' ? '#EBF5EF' : '#FEF2F2' }}>
                    {e.status === 'sent'
                      ? <CircleCheck className="w-4 h-4" style={{ color: '#2B8A50' }} />
                      : <AlertCircle className="w-4 h-4" style={{ color: '#DC2626' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{e.subject}</p>
                    <p className="text-xs text-ink-muted truncate">{e.to_email} · {fmtTime(e.created_at)}</p>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-ink-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-1.5 border-t border-surface-border pt-3">
                    <p className="text-xs text-ink-muted">Template: {e.template} · Status: {e.status}</p>
                    {e.resend_id && <p className="text-xs text-ink-muted">Resend id: {e.resend_id}</p>}
                    {e.error && <p className="text-xs font-medium text-red-600">Error: {e.error}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white border border-surface-border rounded-2xl py-12 px-6 text-center">
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
