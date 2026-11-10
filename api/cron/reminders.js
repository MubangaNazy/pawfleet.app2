// Scheduled reminders. Triggered two ways:
//  - Vercel Cron (see vercel.json), once a day — that's the most Vercel's Hobby plan allows.
//  - .github/workflows/reminders-cron.yml, every 15 minutes for free — this is what actually makes
//    the "starting in ~30 minutes" reminder work through the day; the daily Vercel one is just a
//    harmless backup in case that ever stops running.
// One pass, four jobs each call. Dedup is done by checking the `notifications` table for a row
// already sent for that walk/user (by type + a reference id in `data`) rather than adding tracking
// columns everywhere — this app's notifications table already is the record of "did we tell them".
//
// Both triggers send `Authorization: Bearer <CRON_SECRET>` (Vercel does this automatically once the
// env var is set; the GitHub workflow does it explicitly from a repo secret of the same name/value),
// which we check below so this endpoint can't be triggered by anyone else hitting the URL.

import { randomUUID } from 'crypto';

const clean = v => String(v || '').split('').filter(c => c.charCodeAt(0) !== 0xFEFF).join('').trim();
const GROOMING_RE = /^(HOME_|VET_)?GROOMING:/;

function bookingKind(notes) {
  if (/^VET BOOKING:/.test(notes || '')) return { label: 'vet appointment', emoji: '🏥' };
  if (/^TRAINING:/.test(notes || '')) return { label: 'training session', emoji: '🎓' };
  if (GROOMING_RE.test(notes || '') || notes?.includes('Add-on: Grooming')) return { label: 'grooming', emoji: '✂️' };
  return { label: 'walk', emoji: '🦮' };
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !service) return res.status(503).json({ error: 'Not configured.' });

  // Writes with Prefer: return=minimal come back 201/204 with an empty body — r.json() would throw
  // on that, so only parse when there's actually something to parse.
  const admin = (path, opts = {}) => fetch(`${url}${path}`, {
    ...opts,
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }).then(async r => {
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  });

  const summary = { walkReminders: 0, goOnlineNudges: 0, pendingFollowups: 0, paymentReminders: 0, errors: [] };

  try {
    const users = await admin('/rest/v1/users?select=id,name,fcm_token,role,walker_status,is_online,went_online_at');
    const usersById = new Map(users.map(u => [u.id, u]));

    const notify = async (userId, type, title, body, data) => {
      const user = usersById.get(userId);
      if (!user) return;
      await admin('/rest/v1/notifications', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ id: randomUUID(), user_id: userId, type, title, body, data: data || null, read: false }),
      }).catch(err => summary.errors.push(`notify insert ${type}: ${err.message}`));
      if (user.fcm_token) {
        fetch(`https://${req.headers.host}/api/send-notification`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: user.fcm_token, title, body, data: data || {} }),
        }).catch(() => {});
      }
    };

    // Which walk/user ids has a given reminder type already gone out for, since `sinceIso`?
    const alreadySent = async (type, sinceIso, key) => {
      const rows = await admin(`/rest/v1/notifications?type=eq.${type}&created_at=gte.${sinceIso}&select=data`);
      const set = new Set();
      (Array.isArray(rows) ? rows : []).forEach(r => { const v = r?.data?.[key]; if (v) set.add(v); });
      return set;
    };

    const now = Date.now();

    // ── 1. Upcoming appointment, ~30 minutes out ──────────────────────────────
    {
      const windowStart = new Date(now + 20 * 60000).toISOString();
      const windowEnd = new Date(now + 40 * 60000).toISOString();
      const dedupSince = new Date(now - 3 * 3600000).toISOString();
      const [upcoming, sentFor] = await Promise.all([
        admin(`/rest/v1/walks?status=eq.assigned&scheduled_date=gte.${windowStart}&scheduled_date=lte.${windowEnd}&select=id,owner_id,walker_id,dog_id,notes`),
        alreadySent('walk_reminder', dedupSince, 'walkId'),
      ]);
      for (const w of (Array.isArray(upcoming) ? upcoming : [])) {
        if (sentFor.has(w.id)) continue;
        const { label, emoji } = bookingKind(w.notes);
        if (w.owner_id) await notify(w.owner_id, 'walk_reminder', `${emoji} Starting soon`, `Your ${label} starts in about 30 minutes.`, { walkId: w.id });
        if (w.walker_id) await notify(w.walker_id, 'walk_reminder', `${emoji} Starting soon`, `Your ${label} starts in about 30 minutes.`, { walkId: w.id });
        summary.walkReminders++;
      }
    }

    // ── 2. Walker hasn't gone online today — once, around 08:00 Lusaka (UTC+2) ──
    {
      const lusakaHour = (new Date().getUTCHours() + 2) % 24;
      if (lusakaHour === 8) {
        const todayIso = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
        const nudgedToday = await alreadySent('go_online_nudge', todayIso, 'userId');
        for (const w of users) {
          if (w.role !== 'walker') continue;
          if (w.walker_status && w.walker_status !== 'active') continue;
          if (w.is_online) continue;
          if (nudgedToday.has(w.id)) continue;
          const wentOnlineToday = w.went_online_at && w.went_online_at.slice(0, 10) === todayIso.slice(0, 10);
          if (wentOnlineToday) continue;
          await notify(w.id, 'go_online_nudge', '👋 Go online today?', "Owners nearby are booking walks — go online to start picking up jobs.", { userId: w.id });
          summary.goOnlineNudges++;
        }
      }
    }

    // ── 3. Pending booking sitting unanswered for 45+ minutes ─────────────────
    {
      const cutoff = new Date(now - 45 * 60000).toISOString();
      const dedupSince = new Date(now - 24 * 3600000).toISOString();
      const [pending, sentFor] = await Promise.all([
        admin(`/rest/v1/walks?status=eq.pending&created_at=lte.${cutoff}&select=id,owner_id,notes,created_at`),
        alreadySent('booking_pending_followup', dedupSince, 'walkId'),
      ]);
      for (const w of (Array.isArray(pending) ? pending : [])) {
        if (sentFor.has(w.id)) continue;
        const { label } = bookingKind(w.notes);
        if (w.owner_id) await notify(w.owner_id, 'booking_pending_followup', '⏳ Still looking for someone', `We're still finding you a match for your ${label} request — hang tight, or open the app to adjust it.`, { walkId: w.id });
        summary.pendingFollowups++;
      }
    }

    // ── 4. Completed booking, unpaid for 2+ hours ─────────────────────────────
    {
      const cutoff = now - 2 * 3600000;
      const dedupSince = new Date(now - 7 * 24 * 3600000).toISOString();
      const [unpaid, sentFor] = await Promise.all([
        admin(`/rest/v1/payments?status=eq.unpaid&select=id,walk_id,amount,walks(id,owner_id,status,end_time,notes)`),
        alreadySent('payment_reminder', dedupSince, 'walkId'),
      ]);
      for (const p of (Array.isArray(unpaid) ? unpaid : [])) {
        const w = p.walks;
        if (!w || w.status !== 'completed' || !w.end_time) continue;
        if (new Date(w.end_time).getTime() > cutoff) continue;
        if (sentFor.has(w.id)) continue;
        const { label } = bookingKind(w.notes);
        if (w.owner_id) await notify(w.owner_id, 'payment_reminder', '💳 Payment reminder', `Your ${label} is done — please complete payment of K${p.amount}.`, { walkId: w.id });
        summary.paymentReminders++;
      }
    }

    // ── 5. Pet care reminders (wash/groom, vet checkup) newly overdue ─────────
    {
      summary.careReminders = 0;
      const dedupSince = new Date(now - 14 * 24 * 3600000).toISOString();
      const [dogs, completedWalks, journalEntries, sentFor] = await Promise.all([
        admin('/rest/v1/dogs?select=id,name,owner_id,wash_interval_days,vet_interval_days'),
        admin(`/rest/v1/walks?status=eq.completed&select=dog_id,scheduled_date,notes`),
        admin('/rest/v1/health_journal?select=dog_id,type,created_at&type=in.(grooming,vet_visit)'),
        alreadySent('pet_care_reminder', dedupSince, 'dogCategory'),
      ]);
      const walksByDog = new Map();
      (Array.isArray(completedWalks) ? completedWalks : []).forEach(w => {
        if (!walksByDog.has(w.dog_id)) walksByDog.set(w.dog_id, []);
        walksByDog.get(w.dog_id).push(w);
      });
      const entriesByDog = new Map();
      (Array.isArray(journalEntries) ? journalEntries : []).forEach(e => {
        if (!entriesByDog.has(e.dog_id)) entriesByDog.set(e.dog_id, []);
        entriesByDog.get(e.dog_id).push(e);
      });

      for (const dog of (Array.isArray(dogs) ? dogs : [])) {
        if (!dog.owner_id) continue;
        const dogWalks = walksByDog.get(dog.id) || [];
        const dogJournal = entriesByDog.get(dog.id) || [];
        const latest = (dates) => dates.filter(Boolean).sort().reverse()[0] ?? null;

        const checks = [
          {
            category: 'wash', label: 'wash/groom', intervalDays: dog.wash_interval_days ?? 30,
            lastAt: latest([
              ...dogWalks.filter(w => /grooming/i.test(w.notes ?? '')).map(w => w.scheduled_date),
              ...dogJournal.filter(e => e.type === 'grooming').map(e => e.created_at),
            ]),
          },
          {
            category: 'vet', label: 'vet checkup', intervalDays: dog.vet_interval_days ?? 180,
            lastAt: latest([
              ...dogWalks.filter(w => /^VET BOOKING:/.test(w.notes ?? '')).map(w => w.scheduled_date),
              ...dogJournal.filter(e => e.type === 'vet_visit').map(e => e.created_at),
            ]),
          },
        ];

        for (const c of checks) {
          if (!c.lastAt) continue; // never logged — nothing to be "overdue" relative to yet
          const daysSince = Math.floor((now - new Date(c.lastAt).getTime()) / 86400000);
          if (daysSince <= c.intervalDays) continue; // not overdue
          const dedupKey = `${dog.id}:${c.category}`;
          if (sentFor.has(dedupKey)) continue;
          await notify(dog.owner_id, 'pet_care_reminder', `🔔 ${dog.name} is overdue`,
            `It's been ${daysSince} days since ${dog.name}'s last ${c.label} — open Pet Health to log it or see details.`,
            { dogCategory: dedupKey, dogId: dog.id });
          summary.careReminders++;
        }
      }
    }

    return res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('cron/reminders failed:', err);
    return res.status(500).json({ error: err.message, ...summary });
  }
}
