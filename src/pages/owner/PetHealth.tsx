import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChevronRight, Sparkles, Weight, Calendar, Activity, Mic, MicOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Dog } from '../../types';

// ── Types ──────────────────────────────────────────────────────
type EntryType = 'note' | 'symptom' | 'vet_visit' | 'weight' | 'medication';

interface HealthEntry {
  id: string;
  dogId: string;
  type: EntryType;
  content: string;
  weightKg?: number;
  aiResponse?: string;
  createdAt: string;
}

// ── Gemini AI ─────────────────────────────────────────────────
const GEMINI_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function getAIInsight(text: string, dogName?: string): Promise<string> {
  if (!GEMINI_KEY) {
    // Fallback keyword responses when no API key is configured
    const t = text.toLowerCase();
    if (t.match(/letharg|tired|energy|slow|weak/)) return "Lethargy can stem from heat, fatigue, or early illness. If it lasts more than 24 hours or your dog refuses food/water, see a vet promptly.";
    if (t.match(/vomit|sick|throw|puke|nausea/)) return "Occasional vomiting can be normal. Watch for more than 2–3 episodes, blood in vomit, bloating, or lethargy — those warrant a same-day vet call.";
    if (t.match(/scratch|itch|skin|rash|fur|coat/)) return "Persistent scratching often signals allergies, fleas, or a skin infection. Check for flea dirt. If skin looks red or raw, a vet can help.";
    if (t.match(/eat|appetite|food|hungry|refuse/)) return "A sudden drop in appetite can signal dental pain, stress, or illness. If your dog skips more than one full meal, contact your vet.";
    if (t.match(/limp|leg|paw|walk|hurt/)) return "Check paw pads for cuts or debris. Rest them for 24 hours. If limping persists or they won't bear weight, get a vet check.";
    if (t.match(/drink|water|thirst/)) return "Increased thirst can relate to diabetes or kidney issues. Track water intake and share this log with your vet.";
    return "Thanks for logging this! Your vet will love having this history during check-ups. Get a free AI key at aistudio.google.com/app/apikey.";
  }

  const prompt = `You are PawFleet's friendly AI vet assistant. A pet owner just described their ${dogName ?? 'dog'}'s health observation: "${text}". Give a warm, helpful response in 2–3 short sentences. Mention if it needs urgent vet attention. Keep it under 80 words. Do not use markdown.`;

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 120)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from AI — try again.';
}

// ── Local storage helpers ──────────────────────────────────────
const STORAGE_KEY = 'pawfleet_health_journal';

function loadEntries(): HealthEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveEntries(entries: HealthEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* quota */ }
}

// ── Entry type config ──────────────────────────────────────────
const ENTRY_TYPES: { value: EntryType; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'note',      label: 'General Note', emoji: '📝', color: '#374151', bg: '#F3F4F6' },
  { value: 'symptom',   label: 'Symptom',      emoji: '🤒', color: '#B45309', bg: '#FEF3C7' },
  { value: 'vet_visit', label: 'Vet Visit',    emoji: '🩺', color: '#1D4ED8', bg: '#EFF6FF' },
  { value: 'weight',    label: 'Weight',       emoji: '⚖️', color: '#6D28D9', bg: '#F5F3FF' },
  { value: 'medication',label: 'Medication',   emoji: '💊', color: '#065F46', bg: '#ECFDF5' },
];

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

// ── Main component ─────────────────────────────────────────────
export default function PetHealth() {
  const { data, currentUser } = useApp();
  const navigate = useNavigate();
  const myDogs = data.dogs.filter(d => d.ownerId === currentUser?.id);

  const [selectedDog, setSelectedDog] = useState<Dog | null>(myDogs[0] ?? null);
  const [entries, setEntries] = useState<HealthEntry[]>(loadEntries);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDraft, setAIDraft] = useState('');
  const [aiThinking, setAIThinking] = useState(false);
  const [aiResult, setAIResult] = useState('');
  const [addType, setAddType] = useState<EntryType>('note');
  const [addContent, setAddContent] = useState('');
  const [addWeight, setAddWeight] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const lastWeight = dogEntries.find(e => e.type === 'weight');
  const lastVet    = dogEntries.find(e => e.type === 'vet_visit');
  const thisWeekWalks = data.walks.filter(w =>
    w.dogId === selectedDog?.id &&
    w.status === 'completed' &&
    Date.now() - new Date(w.scheduledDate).getTime() < 7 * 86400000
  ).length;

  const addEntry = () => {
    if (!selectedDog || (!addContent.trim() && addType !== 'weight')) return;
    const entry: HealthEntry = {
      id: crypto.randomUUID(),
      dogId: selectedDog.id,
      type: addType,
      content: addType === 'weight' ? `Weight recorded: ${addWeight} kg` : addContent.trim(),
      weightKg: addType === 'weight' ? parseFloat(addWeight) : undefined,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(next);
    setAddContent('');
    setAddWeight('');
    setAddType('note');
    setShowAddModal(false);
  };

  const deleteEntry = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(next);
  };

  const runAI = async () => {
    if (!aiDraft.trim()) return;
    setAIThinking(true);
    setAIResult('');
    try {
      const result = await getAIInsight(aiDraft, selectedDog?.name);
      setAIResult(result);
    } catch (err: any) {
      setAIResult(`Could not reach AI — ${err?.message ?? 'check your connection and try again.'}`);
    } finally {
      setAIThinking(false);
    }
  };

  const saveAIEntry = () => {
    if (!selectedDog || !aiResult) return;
    const entry: HealthEntry = {
      id: crypto.randomUUID(),
      dogId: selectedDog.id,
      type: 'symptom',
      content: aiDraft.trim(),
      aiResponse: aiResult,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...entries];
    setEntries(next);
    saveEntries(next);
    setAIDraft('');
    setAIResult('');
    setShowAIModal(false);
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
    <div className="min-h-screen pb-28" style={{ background: '#F8FAF9' }}>

      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-5 pb-3"
        style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="text-white font-extrabold text-lg leading-tight">Pet Health</h1>
            <p className="text-white/55 text-[11px]">Track vitals · journal · AI insights</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="ml-auto w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.20)' }}>
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Dog selector tabs */}
        {myDogs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {myDogs.map(dog => (
              <button key={dog.id} onClick={() => setSelectedDog(dog)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all"
                style={selectedDog?.id === dog.id
                  ? { background: 'white', color: '#6D28D9' }
                  : { background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.80)' }}>
                <span>🐕</span>
                {dog.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Weight,   label: 'Weight',      value: lastWeight ? `${lastWeight.weightKg} kg` : '—',        bg: '#F5F3FF', tc: '#6D28D9' },
            { icon: Calendar, label: 'Last Vet',    value: lastVet ? timeAgo(lastVet.createdAt) : '—',             bg: '#EFF6FF', tc: '#1D4ED8' },
            { icon: Activity, label: 'Walks/week',  value: `${thisWeekWalks}`,                                     bg: '#ECFDF5', tc: '#065F46' },
          ].map(({ icon: Icon, label, value, bg, tc }) => (
            <div key={label} className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color: tc }} />
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">{label}</p>
              <p className="text-sm font-extrabold" style={{ color: tc }}>{value}</p>
            </div>
          ))}
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
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-sm">AI Health Assistant</p>
              <p className="text-white/50 text-[11px] mt-0.5">Describe symptoms · get instant guidance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
          </div>
        </button>

        {/* Journal */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-ink">Health Journal</h2>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-primary">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <p className="text-[11px] text-ink-muted mb-3">
            Write down anything unusual — symptoms, vet visits, weight, medication. It helps your vet understand your pet's history.
          </p>

          {dogEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-surface-border bg-white/60 p-8 text-center">
              <span className="text-4xl">📓</span>
              <p className="font-bold text-ink mt-3 text-sm">Nothing logged yet</p>
              <p className="text-xs text-ink-muted mt-1 mb-4">Tap below to add your first note</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ENTRY_TYPES.filter(t => t.value !== 'weight').map(t => (
                  <button key={t.value} onClick={() => { setAddType(t.value); setShowAddModal(true); }}
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
              {dogEntries.map(entry => {
                const conf = ENTRY_TYPES.find(t => t.value === entry.type) ?? ENTRY_TYPES[0];
                return (
                  <div key={entry.id} className="bg-white rounded-2xl border border-surface-border p-4">
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

        {/* Quick health tips */}
        <div className="rounded-3xl overflow-hidden border border-surface-border bg-white">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-sm font-bold text-ink">🏥 Quick Health Reminders</p>
          </div>
          <div className="divide-y divide-surface-border">
            {[
              { icon: '💉', text: 'Vaccinations due every 12 months', action: 'Check schedule' },
              { icon: '🦷', text: 'Dental check every 6 months', action: 'Log next visit' },
              { icon: '🪱', text: 'Deworming every 3 months', action: 'Set reminder' },
              { icon: '🧴', text: 'Flea & tick treatment monthly', action: 'Track doses' },
            ].map(({ icon, text, action }) => (
              <div key={text} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl shrink-0">{icon}</span>
                <p className="text-sm text-ink flex-1">{text}</p>
                <button onClick={() => setShowAddModal(true)}
                  className="text-[11px] font-bold shrink-0" style={{ color: '#6D28D9' }}>
                  {action}
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
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-surface-border">
              <h2 className="font-bold text-ink text-sm">Add to Journal</h2>
              <button onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Simple inline type row */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {ENTRY_TYPES.map(t => (
                  <button key={t.value} onClick={() => setAddType(t.value)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0"
                    style={addType === t.value
                      ? { background: t.bg, color: t.color, outline: `2px solid ${t.color}` }
                      : { background: '#F3F4F6', color: '#6B7280' }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              {addType === 'weight' ? (
                <div>
                  <p className="text-xs text-ink-muted mb-2">Enter your pet's current weight in kilograms</p>
                  <input type="number" step="0.1" placeholder="e.g. 12.5 kg" value={addWeight}
                    onChange={e => setAddWeight(e.target.value)}
                    className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-primary" />
                </div>
              ) : (
                <div>
                  <p className="text-xs text-ink-muted mb-2">
                    {addType === 'symptom' && 'What are you noticing? (e.g. limping, not eating, scratching)'}
                    {addType === 'vet_visit' && 'What happened at the vet? Diagnosis, vaccines, anything prescribed'}
                    {addType === 'medication' && 'What medication and dose? (e.g. Amoxicillin 250mg, twice daily)'}
                    {addType === 'note' && "Anything worth remembering about your pet's health"}
                  </p>
                  <textarea value={addContent} onChange={e => setAddContent(e.target.value)} rows={3}
                    placeholder="Write here…"
                    className="w-full border border-surface-border rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none" />
                </div>
              )}

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
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-surface-border shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)' }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-ink text-sm">AI Health Assistant</h2>
                <p className="text-[10px] text-ink-muted">Describe what you're seeing — get instant guidance</p>
              </div>
              <button onClick={() => { setShowAIModal(false); setAIResult(''); setAIDraft(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-hover text-ink-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
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
                    <Sparkles className="w-4 h-4" style={{ color: '#7C3AED' }} />
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
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
