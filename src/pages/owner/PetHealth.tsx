import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChevronRight, Sparkles, Weight, Calendar, Activity, Mic, MicOff, Footprints, Bath, Stethoscope, Check, Bell, NotebookPen, ClipboardList, Syringe, Share2, Pencil, Copy, Loader2, Dog as DogIcon, Bot, HeartPulse, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useShop, ShopProduct } from '../../context/ShopContext';
import { supabase } from '../../lib/supabase';
import type { Dog } from '../../types';

// ── Types ──────────────────────────────────────────────────────
type EntryType = 'note' | 'symptom' | 'vet_visit' | 'weight' | 'medication' | 'grooming' | 'vaccination';

interface HealthEntry {
  id: string;
  dogId: string;
  type: EntryType;
  content: string;
  weightKg?: number;
  aiResponse?: string;
  dueDate?: string;
  createdAt: string;
}

function toEntry(r: any): HealthEntry {
  return {
    id: r.id, dogId: r.dog_id, type: r.type, content: r.content,
    weightKg: r.weight_kg != null ? Number(r.weight_kg) : undefined,
    aiResponse: r.ai_response ?? undefined,
    dueDate: r.due_date ?? undefined,
    createdAt: r.created_at,
  };
}

// ── AI assistant ─────────────────────────────────────────────
// Runs server-side now (api/ai-health-insight.js) — the previous version called Gemini directly from
// the browser with a key embedded in the public bundle, which anyone could lift and spend against.
// Breed/age/recent entries are optional context so answers can actually be a little more specific.
async function getAIInsight(text: string, dogName?: string, context?: { breed?: string; age?: number; recentEntries?: { type: string; content: string; createdAt: string }[] }): Promise<string> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('Please log out, log back in, then try again.');
  const res = await fetch('/api/ai-health-insight', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, dogName, ...context }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Could not reach the AI assistant.');
  return json.reply as string;
}

// ── Entry type config ──────────────────────────────────────────
const ENTRY_TYPES: { value: EntryType; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'note',      label: 'General Note', emoji: '📝', color: '#374151', bg: '#F3F4F6' },
  { value: 'symptom',   label: 'Symptom',      emoji: '🤒', color: '#B45309', bg: '#FEF3C7' },
  { value: 'vet_visit', label: 'Vet Visit',    emoji: '🩺', color: '#1D4ED8', bg: '#EFF6FF' },
  { value: 'weight',    label: 'Weight',       emoji: '⚖️', color: '#6D28D9', bg: '#F5F3FF' },
  { value: 'medication',label: 'Medication',   emoji: '💊', color: '#065F46', bg: '#ECFDF5' },
  { value: 'grooming',  label: 'Wash/Groom',   emoji: '🛁', color: '#0F766E', bg: '#F0FDFA' },
  { value: 'vaccination', label: 'Vaccination', emoji: '💉', color: '#BE185D', bg: '#FDF2F8' },
];

// Plain keyword overlap between what was asked/answered and the shop's own catalogue — not an AI
// recommendation, just the app surfacing products that are actually relevant, so it never invents one.
function matchShopProducts(text: string, products: ShopProduct[]): ShopProduct[] {
  const words = [...new Set((text.toLowerCase().match(/[a-z]{4,}/g) ?? []))];
  if (!words.length) return [];
  return products
    .map(p => ({ p, score: words.filter(w => `${p.name} ${p.brand ?? ''} ${p.description ?? ''}`.toLowerCase().includes(w)).length }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.p);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// A branded icon-chip heading, used for every section on this page instead of plain bold text.
function SectionHeading({ icon: Icon, title, subtitle, color = '#6D28D9', bg = '#F5F3FF', action }: {
  icon: React.ElementType; title: string; subtitle?: string; color?: string; bg?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-extrabold text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-ink-muted leading-tight mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function PetHealth() {
  const { data, currentUser, updateDog } = useApp();
  const { products: shopProducts } = useShop();
  const navigate = useNavigate();
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);
  const ownerFirstName = currentUser?.name?.split(' ')[0] || 'there';

  const [selectedDog, setSelectedDog] = useState<Dog | null>(myDogs[0] ?? null);
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDraft, setAIDraft] = useState('');
  const [aiThinking, setAIThinking] = useState(false);
  const [aiResult, setAIResult] = useState('');
  const [addType, setAddType] = useState<EntryType>('note');
  const [addContent, setAddContent] = useState('');
  const [addWeight, setAddWeight] = useState('');
  const [addDueDate, setAddDueDate] = useState('');
  const [listening, setListening] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | null>(null); // yyyy-mm-dd, or null = show all
  const [editingInterval, setEditingInterval] = useState<'wash' | 'vet' | null>(null);
  const [intervalDraft, setIntervalDraft] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Real, synced journal — previously this lived only in localStorage on one device.
  useEffect(() => {
    if (!currentUser) return;
    supabase.from('health_journal').select('*').eq('owner_id', currentUser.id).order('created_at', { ascending: false })
      .then(({ data: rows, error }) => {
        if (error) { console.error('health_journal load:', error); return; }
        setEntries((rows || []).map(toEntry));
      });
  }, [currentUser]);

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.continuous = false;
    r.onresult = (e: any) => setAIDraft(prev => (prev ? prev + ' ' : '') + e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    r.start(); setListening(true);
  };

  const dogEntries = entries.filter(e => e.dogId === selectedDog?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // This week's date strip (Sun–Sat), and which day's entries to show below it.
  const toKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayKey = toKey(new Date());
  const weekDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const entryCountByDay = useMemo(() => {
    const m = new Map<string, number>();
    dogEntries.forEach(e => { const k = toKey(new Date(e.createdAt)); m.set(k, (m.get(k) ?? 0) + 1); });
    return m;
  }, [dogEntries]); // eslint-disable-line react-hooks/exhaustive-deps
  const visibleEntries = dateFilter ? dogEntries.filter(e => toKey(new Date(e.createdAt)) === dateFilter) : dogEntries;

  const lastWeight = dogEntries.find(e => e.type === 'weight');
  const lastVet    = dogEntries.find(e => e.type === 'vet_visit');
  const dogWalks = data.walks.filter(w => w.dogId === selectedDog?.id && w.status === 'completed');
  // dogWalks is every completed booking for this dog — vet visits and groom-at-home sessions go
  // through the same `walks` table, so "Walks/week" needs its own notes-based filter or it over-counts.
  const actualWalks = dogWalks.filter(w => !/grooming/i.test(w.notes ?? '') && !/^VET BOOKING:/.test(w.notes ?? '') && !/^TRAINING:/.test(w.notes ?? ''));
  const thisWeekWalks = actualWalks.filter(w => Date.now() - new Date(w.scheduledDate).getTime() < 7 * 86400000).length;

  // "Notification-style" care reminders — last time done, next time due, colour-coded by urgency.
  // Falls back to real booking history (a completed walk/grooming/vet booking) where no journal entry
  // was logged by hand, so this reflects what actually happened, not only what was manually written down.
  const careReminders = useMemo(() => {
    const lastGroomBooking = dogWalks.filter(w => /grooming/i.test(w.notes ?? '')).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
    const lastVetBooking = dogWalks.filter(w => /^VET BOOKING:/.test(w.notes ?? '')).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
    const lastWalkBooking = actualWalks.slice().sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
    const lastGroomEntry = dogEntries.find(e => e.type === 'grooming');

    const defs = [
      { key: 'walk', label: 'Walk', icon: Footprints, color: '#1B4332', bg: '#EBF5EF', intervalDays: 2,
        lastAt: lastWalkBooking?.scheduledDate ?? null, markDone: false },
      { key: 'wash', label: 'Wash / Groom', icon: Bath, color: '#0F766E', bg: '#F0FDFA', intervalDays: selectedDog?.washIntervalDays ?? 30,
        lastAt: [lastGroomEntry?.createdAt, lastGroomBooking?.scheduledDate].filter(Boolean).sort().reverse()[0] ?? null, markDone: true, editable: true as const },
      { key: 'vet', label: 'Vet Checkup', icon: Stethoscope, color: '#7C3AED', bg: '#F5F3FF', intervalDays: selectedDog?.vetIntervalDays ?? 180,
        lastAt: [lastVet?.createdAt, lastVetBooking?.scheduledDate].filter(Boolean).sort().reverse()[0] ?? null, markDone: false, editable: true as const },
    ];

    const timeBased = defs.map(d => {
      const daysSince = d.lastAt ? Math.floor((Date.now() - new Date(d.lastAt).getTime()) / 86400000) : null;
      const daysUntilDue = daysSince == null ? null : d.intervalDays - daysSince;
      const status: 'never' | 'overdue' | 'due' | 'ok' =
        daysSince == null ? 'never' : daysUntilDue! < 0 ? 'overdue' : daysUntilDue! <= 2 ? 'due' : 'ok';
      return { ...d, daysSince, daysUntilDue, status };
    });

    // Vaccination is tracked by due date, not a fixed interval — whatever due date was logged
    // against the most recent vaccination entry (if any) drives the status.
    const lastVaccine = dogEntries.find(e => e.type === 'vaccination');
    const vaxDaysUntilDue = lastVaccine?.dueDate
      ? Math.ceil((new Date(lastVaccine.dueDate).getTime() - Date.now()) / 86400000)
      : null;
    const vaxDaysSince = lastVaccine ? Math.floor((Date.now() - new Date(lastVaccine.createdAt).getTime()) / 86400000) : null;
    const vaxStatus: 'never' | 'overdue' | 'due' | 'ok' =
      !lastVaccine ? 'never' : vaxDaysUntilDue == null ? 'ok' : vaxDaysUntilDue < 0 ? 'overdue' : vaxDaysUntilDue <= 14 ? 'due' : 'ok';
    const vaccination = {
      key: 'vaccination' as const, label: 'Vaccination', icon: Syringe, color: '#BE185D', bg: '#FDF2F8',
      intervalDays: null, lastAt: lastVaccine?.createdAt ?? null, markDone: false, editable: false as const,
      daysSince: vaxDaysSince, daysUntilDue: vaxDaysUntilDue, status: vaxStatus, dueDate: lastVaccine?.dueDate ?? null,
    };

    return [...timeBased, vaccination];
  }, [dogWalks, dogEntries, lastVet, selectedDog?.washIntervalDays, selectedDog?.vetIntervalDays]);

  const saveInterval = async () => {
    if (!selectedDog || !editingInterval) return;
    const days = parseInt(intervalDraft, 10);
    if (!days || days < 1) { setEditingInterval(null); return; }
    const patch = editingInterval === 'wash' ? { washIntervalDays: days } : { vetIntervalDays: days };
    setSelectedDog(prev => prev ? { ...prev, ...patch } : prev);
    await updateDog(selectedDog.id, patch);
    setEditingInterval(null);
  };

  const aiSuggestions = selectedDog ? [
    `Can you summarise ${selectedDog.name}'s recent health journal?`,
    `Any ${selectedDog.breed ? `${selectedDog.breed}-specific` : 'breed-specific'} health tips I should know?`,
    `What should I be watching for this week?`,
    `Is this normal for ${selectedDog.name}'s age?`,
  ] : [];

  const shopMatches = useMemo(() => matchShopProducts(`${aiDraft} ${aiResult}`, shopProducts), [aiDraft, aiResult, shopProducts]);

  const quickLogGrooming = async () => {
    if (!selectedDog || !currentUser) return;
    const entry: HealthEntry = { id: crypto.randomUUID(), dogId: selectedDog.id, type: 'grooming', content: 'Washed / groomed at home', createdAt: new Date().toISOString() };
    setEntries(prev => [entry, ...prev]);
    const { error } = await supabase.from('health_journal').insert({ id: entry.id, dog_id: entry.dogId, owner_id: currentUser.id, type: entry.type, content: entry.content });
    if (error) console.error('health_journal insert (grooming):', error);
  };

  const addEntry = async () => {
    if (!selectedDog || !currentUser || (!addContent.trim() && addType !== 'weight')) return;
    const entry: HealthEntry = {
      id: crypto.randomUUID(),
      dogId: selectedDog.id,
      type: addType,
      content: addType === 'weight' ? `Weight recorded: ${addWeight} kg` : addContent.trim(),
      weightKg: addType === 'weight' ? parseFloat(addWeight) : undefined,
      dueDate: addType !== 'weight' && addDueDate ? addDueDate : undefined,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev]);
    setAddContent('');
    setAddWeight('');
    setAddDueDate('');
    setAddType('note');
    setShowAddModal(false);
    const { error } = await supabase.from('health_journal').insert({
      id: entry.id, dog_id: entry.dogId, owner_id: currentUser.id, type: entry.type,
      content: entry.content, weight_kg: entry.weightKg ?? null, due_date: entry.dueDate ?? null,
    });
    if (error) console.error('health_journal insert:', error);
  };

  const deleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    const { error } = await supabase.from('health_journal').delete().eq('id', id);
    if (error) console.error('health_journal delete:', error);
  };

  const runAI = async () => {
    if (!aiDraft.trim()) return;
    setAIThinking(true);
    setAIResult('');
    try {
      const recentEntries = dogEntries.slice(0, 5).map(e => ({ type: e.type, content: e.content, createdAt: e.createdAt }));
      const result = await getAIInsight(aiDraft, selectedDog?.name, {
        breed: selectedDog?.breed, age: selectedDog?.age, recentEntries,
      });
      setAIResult(result);
    } catch (err: any) {
      setAIResult(`Could not reach AI — ${err?.message ?? 'check your connection and try again.'}`);
    } finally {
      setAIThinking(false);
    }
  };

  const saveAIEntry = async () => {
    if (!selectedDog || !currentUser || !aiResult) return;
    const entry: HealthEntry = {
      id: crypto.randomUUID(),
      dogId: selectedDog.id,
      type: 'symptom',
      content: aiDraft.trim(),
      aiResponse: aiResult,
      createdAt: new Date().toISOString(),
    };
    setEntries(prev => [entry, ...prev]);
    setAIDraft('');
    setAIResult('');
    setShowAIModal(false);
    const { error } = await supabase.from('health_journal').insert({
      id: entry.id, dog_id: entry.dogId, owner_id: currentUser.id, type: entry.type,
      content: entry.content, ai_response: entry.aiResponse ?? null,
    });
    if (error) console.error('health_journal insert (AI):', error);
  };

  const openShareModal = async () => {
    setShowShareModal(true);
    if (!selectedDog) return;
    setShareLoading(true);
    setShareError('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Please log out, log back in, then try again.');
      const res = await fetch('/api/pet-health-share', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', dogId: selectedDog.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not create a share link.');
      setShareUrl(json.url);
    } catch (err: any) {
      setShareError(err?.message ?? 'Something went wrong.');
    } finally {
      setShareLoading(false);
    }
  };

  const revokeShare = async () => {
    if (!selectedDog) return;
    setShareLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      await fetch('/api/pet-health-share', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', dogId: selectedDog.id }),
      });
      setShareUrl('');
    } finally {
      setShareLoading(false);
    }
  };

  if (myDogs.length === 0) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center pb-28">
      <span className="text-6xl mb-4">🐾</span>
      <h1 className="text-xl font-extrabold text-ink">No pets registered</h1>
      <p className="text-sm text-ink-muted mt-2 mb-6">Add your dog first to start tracking their health</p>
      <button onClick={() => navigate('/owner/dogs')}
        className="px-6 py-3 rounded-2xl text-white text-sm font-bold"
        style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
        Add a Dog
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pb-28" style={{ background: '#FAF8FD' }}>

      {/* Header */}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-[#E6DEF5]">
            <ArrowLeft className="w-4 h-4 text-ink" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold italic"
              style={{ background: 'linear-gradient(135deg, #4C1D95, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Pet Health
            </h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#8B6FC4' }}>Track vitals · journal · AI insights</p>
          </div>
          <button onClick={openShareModal}
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-[#E6DEF5]">
            <Share2 className="w-4 h-4" style={{ color: '#6D28D9' }} />
          </button>
          <button onClick={() => { setAddType('note'); setAddContent(''); setAddDueDate(''); setShowAddModal(true); }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Dog selector tabs */}
        {myDogs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {myDogs.map(dog => (
              <button key={dog.id} onClick={() => setSelectedDog(dog)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all border-2"
                style={selectedDog?.id === dog.id
                  ? { background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)', color: 'white', borderColor: 'transparent' }
                  : { background: 'white', color: '#6D28D9', borderColor: '#E6DEF5' }}>
                <DogIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
                {dog.name}
              </button>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6DEF5] p-4">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">At a glance</p>
          <p className="text-[11px] text-ink-muted mb-3">Tap Weight or Last Vet to log one — Walks/week is tracked automatically</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Weight,   label: 'Weight',      value: lastWeight ? `${lastWeight.weightKg} kg` : '—',        bg: '#F5F3FF', tc: '#6D28D9', onClick: () => { setAddType('weight'); setAddWeight(''); setShowAddModal(true); } },
              { icon: Calendar, label: 'Last Vet',    value: lastVet ? timeAgo(lastVet.createdAt) : '—',             bg: '#EFF6FF', tc: '#1D4ED8', onClick: () => { setAddType('vet_visit'); setAddContent(''); setAddDueDate(''); setShowAddModal(true); } },
              { icon: Activity, label: 'Walks/week',  value: `${thisWeekWalks}`,                                     bg: '#ECFDF5', tc: '#065F46', onClick: undefined },
            ].map(({ icon: Icon, label, value, bg, tc, onClick }) => (
              <button key={label} type="button" onClick={onClick} disabled={!onClick}
                className="rounded-2xl p-3 flex flex-col gap-1 text-left transition-transform active:scale-95 disabled:active:scale-100"
                style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color: tc }} />
                <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">{label}</p>
                <p className="text-sm font-extrabold" style={{ color: tc }}>{value}</p>
              </button>
            ))}
          </div>
        </div>

        {/* AI Health Assistant card */}
        <button onClick={() => setShowAIModal(true)}
          className="w-full relative rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <div className="absolute inset-0 opacity-10">
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: '#A78BFA' }} />
          </div>
          <div className="relative flex items-center gap-4 px-5 py-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)', boxShadow: '0 4px 12px rgba(109,40,217,0.5)' }}>
              <Bot className="w-6 h-6 text-white" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-sm">AI Health Assistant</p>
              <p className="text-white/50 text-[11px] mt-0.5">Describe symptoms · get instant guidance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
          </div>
        </button>

        {/* Week strip — tap a day to see that day's entries, tap again to show everything */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6DEF5] p-4">
          <SectionHeading icon={Calendar} title="This week" color="#6D28D9" bg="#F5F3FF"
            action={dateFilter && (
              <button onClick={() => setDateFilter(null)} className="text-xs font-bold text-primary shrink-0">Show all</button>
            )} />
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map(d => {
              const key = toKey(d);
              const isToday = key === todayKey;
              const isSelected = dateFilter === key;
              const count = entryCountByDay.get(key) ?? 0;
              return (
                <button key={key} onClick={() => setDateFilter(isSelected ? null : key)}
                  className="flex flex-col items-center gap-1 py-2 rounded-2xl transition-all"
                  style={isSelected
                    ? { background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' }
                    : { background: 'white', border: isToday ? '1.5px solid #8B5CF6' : '1px solid var(--surface-border, #E5E7EB)' }}>
                  <span className="text-[9px] font-bold uppercase" style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : '#9CA3AF' }}>
                    {d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}
                  </span>
                  <span className="text-sm font-extrabold" style={{ color: isSelected ? 'white' : isToday ? '#6D28D9' : '#111827' }}>
                    {d.getDate()}
                  </span>
                  <span className="w-1 h-1 rounded-full" style={{ background: count > 0 ? (isSelected ? 'white' : '#8B5CF6') : 'transparent' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Journal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6DEF5] p-4">
          <SectionHeading icon={NotebookPen} title="Health Journal"
            subtitle="Symptoms, vet visits, weight, medication — anything worth your vet knowing"
            color="#7C3AED" bg="#F5F3FF"
            action={(
              <button onClick={() => { setAddType('note'); setAddContent(''); setAddDueDate(''); setShowAddModal(true); }}
                className="flex items-center gap-1 text-xs font-bold text-primary shrink-0">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )} />

          {dateFilter && visibleEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-surface-border bg-white/60 p-6 text-center">
              <p className="text-sm text-ink-muted">Nothing logged on this day.</p>
            </div>
          ) : dogEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-surface-border bg-white/60 p-8 text-center">
              <span className="text-4xl">📓</span>
              <p className="font-bold text-ink mt-3 text-sm">Nothing logged yet</p>
              <p className="text-xs text-ink-muted mt-1 mb-4">Tap below to add your first note</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ENTRY_TYPES.filter(t => t.value !== 'weight').map(t => (
                  <button key={t.value} onClick={() => { setAddType(t.value); setAddContent(''); setAddDueDate(''); setShowAddModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border-2 transition-all"
                    style={{ borderColor: t.color, color: t.color, background: t.bg }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
                <button onClick={() => { setAddType('weight'); setShowAddModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border-2 transition-all"
                  style={{ borderColor: '#6D28D9', color: '#6D28D9', background: '#F5F3FF' }}>
                  ⚖️ Weight
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleEntries.map(entry => {
                const conf = ENTRY_TYPES.find(t => t.value === entry.type) ?? ENTRY_TYPES[0];
                return (
                  <div key={entry.id} className="rounded-2xl border border-surface-border p-4" style={{ background: '#FAFAFB' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                        style={{ background: conf.bg }}>
                        {conf.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: conf.color }}>{conf.label}</span>
                          <span className="text-[10px] text-ink-muted ml-auto">{timeAgo(entry.createdAt)}</span>
                        </div>
                        <p className="text-sm text-ink leading-relaxed">{entry.content}</p>
                        {entry.dueDate && (
                          <p className="text-[11px] font-semibold mt-1" style={{ color: '#BE185D' }}>
                            Next due: {new Date(entry.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {entry.aiResponse && (
                          <div className="mt-2 px-3 py-2 rounded-xl text-xs leading-relaxed" style={{ background: '#F5F3FF', color: '#5B21B6', borderLeft: '3px solid #7C3AED' }}>
                            <span className="font-bold">✨ AI: </span>{entry.aiResponse}
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteEntry(entry.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl text-ink-muted hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Care Reminders — "last done" + "next due", colour-coded like a notification */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6DEF5] p-4">
          <SectionHeading icon={Bell} title="Care Reminders" subtitle="Last done, and when it's due again" color="#D97706" bg="#FFFBEB" />
          <div className="space-y-2">
            {careReminders.map(r => {
              const STATUS_META = {
                never:   { label: 'Not logged yet', color: '#6B7280', bg: '#F3F4F6' },
                overdue: { label: 'Overdue',         color: '#DC2626', bg: '#FEF2F2' },
                due:     { label: 'Due soon',         color: '#D97706', bg: '#FFFBEB' },
                ok:      { label: 'Up to date',       color: '#059669', bg: '#ECFDF5' },
              }[r.status];
              const Icon = r.icon;
              return (
                <div key={r.key} className="rounded-2xl border border-surface-border p-4 flex items-center gap-3" style={{ background: '#FAFAFB' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: r.bg }}>
                    <Icon className="w-5 h-5" style={{ color: r.color }} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-ink text-sm">{r.label}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: STATUS_META.color, background: STATUS_META.bg }}>
                        {STATUS_META.label}
                      </span>
                    </div>
                    {r.key === 'vaccination' ? (
                      <p className="text-xs text-ink-muted mt-0.5">
                        {!r.lastAt ? 'Log a vaccination to start tracking' : (r as any).dueDate
                          ? `Due ${new Date((r as any).dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : `Last logged ${r.daysSince}d ago · no due date set`}
                      </p>
                    ) : editingInterval === r.key ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="number" min={1} autoFocus value={intervalDraft}
                          onChange={e => setIntervalDraft(e.target.value)}
                          className="w-16 border border-surface-border rounded-lg px-2 py-1 text-xs"
                          placeholder={String(r.intervalDays)} />
                        <span className="text-xs text-ink-muted">days</span>
                        <button onClick={saveInterval} className="text-xs font-bold" style={{ color: r.color }}>Save</button>
                        <button onClick={() => setEditingInterval(null)} className="text-xs text-ink-muted">Cancel</button>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-muted mt-0.5">
                        {r.daysSince == null ? `Log it to start tracking` : r.daysSince === 0 ? 'Today' : `${r.daysSince}d ago`}
                        {r.key !== 'walk' && r.daysSince != null && (
                          <>
                            {' · every ~'}{r.intervalDays}d
                            {(r as any).editable && (
                              <button onClick={() => { setEditingInterval(r.key as 'wash' | 'vet'); setIntervalDraft(String(r.intervalDays)); }}
                                className="inline-flex items-center ml-1 text-ink-muted/70 hover:text-ink-muted">
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  {r.markDone && (
                    <button onClick={quickLogGrooming}
                      className="flex items-center gap-1 text-[11px] font-bold px-3 py-2 rounded-xl shrink-0 text-white"
                      style={{ background: r.color }}>
                      <Check className="w-3 h-3" /> Mark done
                    </button>
                  )}
                  {r.key === 'vet' && (
                    <button onClick={() => { setAddType('vet_visit'); setAddContent(''); setAddDueDate(''); setShowAddModal(true); }}
                      className="text-[11px] font-bold px-3 py-2 rounded-xl shrink-0 text-white"
                      style={{ background: r.color }}>
                      Log visit
                    </button>
                  )}
                  {r.key === 'vaccination' && (
                    <button onClick={() => { setAddType('vaccination'); setAddContent(''); setAddDueDate(''); setShowAddModal(true); }}
                      className="text-[11px] font-bold px-3 py-2 rounded-xl shrink-0 text-white"
                      style={{ background: r.color }}>
                      Log it
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Other reminders — general guidance, not tracked against logged data */}
        <div className="rounded-2xl overflow-hidden border border-[#E6DEF5] bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-[#E6DEF5] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ECFDF5' }}>
              <ClipboardList className="w-3.5 h-3.5" style={{ color: '#059669' }} strokeWidth={2} />
            </div>
            <p className="text-sm font-extrabold text-ink">Other Reminders</p>
          </div>
          <div className="divide-y divide-surface-border">
            {[
              { icon: '🦷', text: 'Dental check every 6 months', content: 'Dental check-up' },
              { icon: '🪱', text: 'Deworming every 3 months', content: 'Deworming treatment' },
              { icon: '🧴', text: 'Flea & tick treatment monthly', content: 'Flea & tick treatment' },
            ].map(({ icon, text, content }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl shrink-0">{icon}</span>
                <p className="text-sm text-ink flex-1">{text}</p>
                <button onClick={() => { setAddType('medication'); setAddContent(content); setAddDueDate(''); setShowAddModal(true); }}
                  className="text-[11px] font-bold shrink-0" style={{ color: '#6D28D9' }}>
                  Log it
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Add Entry Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-border shrink-0">
              <div>
                <h2 className="font-extrabold text-ink text-base">Add to Journal</h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Log anything about {selectedDog?.name || 'your pet'}'s health — the more detail, the better.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-muted shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">What kind of entry?</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {ENTRY_TYPES.map(t => (
                    <button key={t.value} onClick={() => setAddType(t.value)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0"
                      style={addType === t.value
                        ? { background: t.bg, color: t.color, outline: `2px solid ${t.color}` }
                        : { background: '#F3F4F6', color: '#6B7280' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {addType === 'weight' ? (
                <div>
                  <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Current weight</p>
                  <input type="number" step="0.1" placeholder="e.g. 12.5 kg" value={addWeight}
                    onChange={e => setAddWeight(e.target.value)}
                    className="w-full border border-surface-border rounded-2xl px-4 py-3.5 text-sm text-ink focus:outline-none focus:border-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">Details</p>
                    <p className="text-xs text-ink-muted mb-2">
                      {addType === 'symptom' && 'What are you noticing? (e.g. limping, not eating, scratching)'}
                      {addType === 'vet_visit' && 'What happened at the vet? Diagnosis, vaccines, anything prescribed'}
                      {addType === 'medication' && 'What medication and dose? (e.g. Amoxicillin 250mg, twice daily)'}
                      {addType === 'grooming' && 'Anything about this wash/groom worth noting'}
                      {addType === 'vaccination' && 'Which vaccine? (e.g. Rabies booster)'}
                      {addType === 'note' && "Anything worth remembering about your pet's health"}
                    </p>
                    <textarea value={addContent} onChange={e => setAddContent(e.target.value)} rows={4}
                      placeholder="Write here…"
                      className="w-full border border-surface-border rounded-2xl px-4 py-3.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-2">
                      {addType === 'vaccination' ? 'Next due date' : 'Remind me again on (optional)'}
                    </p>
                    <input type="date" value={addDueDate} onChange={e => setAddDueDate(e.target.value)}
                      className="w-full border border-surface-border rounded-2xl px-4 py-3.5 text-sm text-ink focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 pt-0 shrink-0">
              <button onClick={addEntry}
                disabled={addType === 'weight' ? !addWeight : !addContent.trim()}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Health Assistant Modal ── */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowAIModal(false); setAIResult(''); setAIDraft(''); } }}>
          <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 40%, #ffffff 40%)' }}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex-1">AI Health Assistant</p>
              <button onClick={() => { setShowAIModal(false); setAIResult(''); setAIDraft(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white/70">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar + greeting — only while the conversation is still empty */}
            {!aiDraft && !aiResult && (
              <div className="px-6 pb-6 pt-1 text-center shrink-0">
                <div className="relative mx-auto mb-4" style={{ width: 76, height: 76 }}>
                  <div className="w-full h-full rounded-[28px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6, #22D3EE)', boxShadow: '0 8px 28px rgba(139,92,246,0.5)' }}>
                    <Bot className="w-9 h-9 text-white" strokeWidth={1.75} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-[#0F172A]"
                    style={{ background: '#22C55E' }}>
                    <HeartPulse className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h2 className="text-white font-extrabold text-xl leading-tight">
                  Hi {ownerFirstName}, meet {selectedDog?.name || 'your'}'s AI guide
                </h2>
                <p className="text-white/50 text-xs mt-1.5">What's going on today?</p>
              </div>
            )}

            <div className="px-5 pt-4 pb-5 space-y-4 overflow-y-auto bg-white rounded-t-[28px] -mt-2 flex-1">
              {!aiResult && (
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map(s => (
                    <button key={s} onClick={() => setAIDraft(s)}
                      className="px-3 py-2 rounded-2xl text-xs font-semibold text-left"
                      style={{ background: '#F5F3FF', color: '#6D28D9' }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Textarea with mic button */}
              <div className="relative">
                <textarea value={aiDraft} onChange={e => setAIDraft(e.target.value)} rows={4}
                  placeholder={`Describe ${selectedDog?.name || 'your dog'}'s symptoms or behaviour…\n\ne.g. "She's been scratching her ears a lot and shaking her head since yesterday"`}
                  className="w-full border border-surface-border rounded-2xl px-4 py-3 pr-12 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none leading-relaxed" />
                <button onClick={toggleMic}
                  className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl transition-all"
                  style={listening
                    ? { background: '#EF4444', color: 'white' }
                    : { background: '#F3F4F6', color: '#6B7280' }}>
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              {listening && (
                <p className="text-xs text-center font-medium" style={{ color: '#EF4444' }}>
                  🎙️ Listening… speak now
                </p>
              )}

              <button onClick={runAI} disabled={!aiDraft.trim() || aiThinking}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)' }}>
                {aiThinking
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analysing…</>
                  : <><Sparkles className="w-4 h-4" /> Get AI Insight</>}
              </button>

              {aiResult && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" style={{ color: '#7C3AED' }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6D28D9' }}>AI Insight</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{aiResult}</p>
                  <p className="text-[10px] text-ink-muted border-t border-purple-200 pt-2">
                    ⚠️ This is general guidance only — always consult your vet for medical decisions.
                  </p>
                  <button onClick={saveAIEntry}
                    className="w-full py-2.5 rounded-xl text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' }}>
                    Save to Journal
                  </button>
                </div>
              )}

              {aiResult && shopMatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="w-3.5 h-3.5" style={{ color: '#059669' }} />
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#059669' }}>
                      Might help — from the Shop
                    </p>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {shopMatches.map(p => (
                      <Link key={p.id} to="/owner/shop"
                        className="shrink-0 w-28 rounded-2xl border border-surface-border overflow-hidden bg-white">
                        <div className="w-full aspect-square bg-surface-secondary">
                          <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="px-2 py-2">
                          <p className="text-[11px] font-semibold text-ink truncate">{p.name}</p>
                          <p className="text-[11px] font-bold text-primary mt-0.5">K{p.price}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Share with Vet Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4"
          onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-surface-border">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F5F3FF' }}>
                <Share2 className="w-4 h-4" style={{ color: '#6D28D9' }} />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-ink text-sm">Share with vet</h2>
                <p className="text-[10px] text-ink-muted">A read-only link to {selectedDog?.name}'s journal</p>
              </div>
              <button onClick={() => setShowShareModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {shareLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-ink-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Preparing link…
                </div>
              ) : shareError ? (
                <p className="text-sm text-red-600">{shareError}</p>
              ) : shareUrl ? (
                <>
                  <p className="text-xs text-ink-muted">
                    Anyone with this link can view {selectedDog?.name}'s health journal — no login needed. Send it to your vet, or revoke it any time.
                  </p>
                  <div className="flex items-center gap-2 rounded-2xl border border-surface-border px-3 py-2.5 bg-surface-hover">
                    <p className="text-xs text-ink flex-1 truncate">{shareUrl}</p>
                    <button onClick={() => navigator.clipboard?.writeText(shareUrl)}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-surface-border">
                      <Copy className="w-3.5 h-3.5 text-ink-muted" />
                    </button>
                  </div>
                  <button onClick={revokeShare}
                    className="w-full py-2.5 rounded-2xl text-xs font-bold text-red-600 bg-red-50">
                    Turn off sharing
                  </button>
                </>
              ) : (
                <p className="text-sm text-ink-muted">Could not create a link right now.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
