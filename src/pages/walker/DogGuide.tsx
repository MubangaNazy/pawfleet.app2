import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import PawFleetLogo from '../../components/ui/PawFleetLogo';

interface Section {
  emoji: string;
  title: string;
  tag: string;
  summary: string;
  tips: string[];
}

const GUIDE: Section[] = [
  {
    emoji: '🤝',
    title: 'First Meeting',
    tag: 'Preparation',
    summary: 'How to safely greet and gain a dog\'s trust before the walk.',
    tips: [
      'Let the dog sniff your closed fist first — don\'t reach over their head.',
      'Crouch to their level rather than looming over them.',
      'Speak in a calm, low voice — high-pitched excitement can make anxious dogs worse.',
      'Give the dog time to approach you; never force contact.',
      'Ask the owner if the dog has any triggers (skateboards, bikes, loud sounds).',
      'Watch for a relaxed tail wag and soft eyes before clipping the leash.',
    ],
  },
  {
    emoji: '🦮',
    title: 'Leash Handling',
    tag: 'Preparation',
    summary: 'Proper technique so walks are safe and comfortable for both of you.',
    tips: [
      'Hold the leash with a loop around your wrist AND grip it midway — double security.',
      'Keep 1–1.5 m of slack. Tight leashes signal tension and make dogs pull more.',
      'If the dog pulls, stop walking. Start again only when there is slack.',
      'Never wrap the leash around your hand or fingers — can cause injury if the dog lunges.',
      'Keep the dog on your left side for the most control.',
      'Always use a harness for strong pullers — never just a neck collar.',
    ],
  },
  {
    emoji: '🗣️',
    title: 'Voice Commands',
    tag: 'During Walk',
    summary: 'Basic cues that most trained dogs understand.',
    tips: [
      '"Sit" — say once, firmly. Reward immediately when they comply.',
      '"Stay" — palm facing the dog, back away slowly.',
      '"Leave it" — use when they sniff something dangerous. Say firmly, redirect attention.',
      '"Heel" — brings them back to your side.',
      '"No" — short, deep tone. Never shout repeatedly — it becomes noise.',
      'Reward with treats or praise within 2 seconds of good behaviour.',
      'If the dog does not respond, ask the owner what cues they use.',
    ],
  },
  {
    emoji: '🐶',
    title: 'Reading Body Language',
    tag: 'During Walk',
    summary: 'Understand what the dog is telling you so you can respond correctly.',
    tips: [
      'Relaxed: loose body, soft eyes, tail in neutral position, mouth slightly open.',
      'Playful: "play bow" (front legs down, bottom up), bouncy movement.',
      'Anxious: tucked tail, ears flat, lip licking, yawning, whale eye (showing whites).',
      'Fearful: cowering, trembling, hackles raised, trying to hide behind you.',
      'Aggressive warning: stiff body, hard stare, raised hackles, low growl — create distance immediately.',
      'Never punish growling — it is a warning signal. Give the dog space.',
    ],
  },
  {
    emoji: '⚠️',
    title: 'Safety on the Walk',
    tag: 'During Walk',
    summary: 'Staying safe when you encounter other people, animals, or hazards.',
    tips: [
      'Cross the road early to avoid other dogs — don\'t wait until they\'re nose-to-nose.',
      'If another dog charges, step between it and your dog, use a firm "No!".',
      'Keep dogs away from rubbish, puddles, and unknown food on the ground.',
      'In traffic, position yourself between the dog and the road.',
      'Always carry a poop bag and water on walks over 20 minutes.',
      'If a dog gets loose, don\'t chase — crouch down, act calm, and call their name.',
    ],
  },
  {
    emoji: '☀️',
    title: 'Weather & Environment',
    tag: 'During Walk',
    summary: 'Keeping dogs safe in Zambia\'s heat and varied terrain.',
    tips: [
      'Touch the pavement with your hand for 5 seconds — if it burns you, it burns paws.',
      'Walk during cooler hours: before 9 am or after 5 pm in hot weather.',
      'Short-snouted breeds (bulldogs, pugs) overheat quickly — keep walks under 20 min.',
      'Watch for signs of heat stroke: heavy panting, drooling, wobbling, red gums.',
      'Offer water every 15 minutes on warm days.',
      'In the rainy season, check for deep puddles and slippery mud paths.',
    ],
  },
  {
    emoji: '🚨',
    title: 'Emergency Response',
    tag: 'Emergency',
    summary: 'What to do if something goes wrong during the walk.',
    tips: [
      'Dog injured: stay calm, do not move a seriously hurt dog. Call the owner immediately.',
      'Dog escaped: contact the owner right away, stay near last known location.',
      'Dog in a fight: NEVER reach in with your hand. Use a barrier (bag, jacket) to separate.',
      'Dog ate something unknown: note what it was, call the owner, head to a vet.',
      'You feel unsafe: end the walk early, go to a public place, contact admin.',
      'Always carry the owner\'s phone number and the PawFleet admin contact.',
    ],
  },
];

const COLORS = [
  { accent: '#2B8A50', light: '#EBF5EF', border: '#C6E6D3' },
  { accent: '#1B4332', light: '#E8F0EC', border: '#B5CFC2' },
  { accent: '#40916C', light: '#EBF5EF', border: '#C6E6D3' },
  { accent: '#52B788', light: '#EFF8F2', border: '#C6E6D3' },
  { accent: '#D97706', light: '#FFFBEB', border: '#FDE68A' },
  { accent: '#2B8A50', light: '#EBF5EF', border: '#C6E6D3' },
  { accent: '#DC2626', light: '#FEF2F2', border: '#FECACA' },
];

const TAG_COLORS: Record<string, string> = {
  Preparation: '#2B8A50',
  'During Walk': '#40916C',
  Emergency: '#DC2626',
};

function GuideCard({
  section,
  index,
  isRead,
  onMarkRead,
}: {
  section: Section;
  index: number;
  isRead: boolean;
  onMarkRead: () => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const c = COLORS[index] ?? COLORS[0];

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: `1.5px solid ${isRead ? c.accent + '50' : '#E5E7EB'}`,
        boxShadow: open
          ? '0 4px 16px rgba(0,0,0,0.07)'
          : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:opacity-80"
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: c.accent }}
        />

        {/* Emoji icon with number badge */}
        <div className="relative shrink-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: c.light }}
          >
            {section.emoji}
          </div>
          <div
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
            style={{ background: c.accent }}
          >
            {index + 1}
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm" style={{ color: '#111827' }}>{section.title}</p>
            {isRead && (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: c.accent }} />
            )}
          </div>
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide mt-0.5 px-1.5 py-0.5 rounded-md"
            style={{
              color: TAG_COLORS[section.tag] ?? '#6B7280',
              background: (TAG_COLORS[section.tag] ?? '#6B7280') + '15',
            }}
          >
            {section.tag}
          </span>
        </div>

        {/* Chevron */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: open ? c.accent : c.light }}
        >
          {open
            ? <ChevronUp className="w-4 h-4 text-white" />
            : <ChevronDown className="w-4 h-4" style={{ color: c.accent }} />
          }
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-4 pb-5">
          {/* Summary blockquote */}
          <p
            className="text-xs leading-relaxed mb-4 py-2 px-3 rounded-xl italic"
            style={{ color: '#6B7280', background: c.light, borderLeft: `3px solid ${c.accent}` }}
          >
            {section.summary}
          </p>

          {/* Tips list */}
          <ul className="space-y-3">
            {section.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                  style={{ background: c.accent }}
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed flex-1" style={{ color: '#374151' }}>{tip}</p>
              </li>
            ))}
          </ul>

          {/* Mark as read */}
          <div className="mt-5">
            {isRead ? (
              <div
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{ background: c.light }}
              >
                <CheckCircle2 className="w-4 h-4" style={{ color: c.accent }} />
                <span className="text-xs font-semibold" style={{ color: c.accent }}>
                  Section completed
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onMarkRead(); }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity active:opacity-80"
                style={{ background: c.accent }}
              >
                Got it ✓
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DogGuide() {
  const [readSet, setReadSet] = useState<Set<number>>(new Set());
  const readCount = readSet.size;
  const progress = Math.round((readCount / GUIDE.length) * 100);

  return (
    <div className="max-w-xl mx-auto pb-32">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden px-5 pt-7 pb-8"
        style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2B8A50 60%, #52B788 100%)' }}
      >
        {/* Background decorations */}
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute right-2 -bottom-6 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <PawFleetLogo size={28} showText textWhite className="mb-5 opacity-90" />

          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Walker Resource
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight">
            Dog Handling<br />Handbook
          </h1>
          <p className="text-sm mt-2 leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>
            First time? No problem. These tips will help you walk any dog safely and confidently.
          </p>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { label: `${GUIDE.length} Sections`, emoji: '📚' },
              { label: 'Beginner Friendly', emoji: '✅' },
              { label: 'Safety First', emoji: '🛡️' },
            ].map(b => (
              <div
                key={b.label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span className="text-sm">{b.emoji}</span>
                <span className="text-[11px] font-semibold text-white">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Progress (only shown after first "Got it") */}
          {readCount > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.60)' }}>
                  {readCount} of {GUIDE.length} sections read
                </span>
                <span className="text-xs font-bold text-white">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.88)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Category legend ── */}
      <div className="px-4 pt-5 pb-1 flex items-center gap-2 flex-wrap">
        {Object.entries(TAG_COLORS).map(([tag, color]) => (
          <div key={tag} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[11px] font-medium" style={{ color: '#6B7280' }}>{tag}</span>
          </div>
        ))}
        {readCount > 0 && (
          <span className="ml-auto text-xs font-semibold" style={{ color: '#2B8A50' }}>
            {readCount}/{GUIDE.length} done ✓
          </span>
        )}
      </div>

      {/* ── Guide cards ── */}
      <div className="px-4 pt-3 space-y-3 relative">
        {GUIDE.map((section, i) => (
          <GuideCard
            key={section.title}
            section={section}
            index={i}
            isRead={readSet.has(i)}
            onMarkRead={() => setReadSet(prev => new Set([...prev, i]))}
          />
        ))}

        {/* Footer reminder */}
        <div
          className="rounded-2xl p-4 mt-1 border"
          style={{ background: '#EBF5EF', borderColor: '#C6E6D3' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
              style={{ background: '#2B8A50' }}
            >
              💡
            </div>
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: '#111827' }}>Remember</p>
              <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                Every dog is different. When in doubt, contact the owner. Your safety and the dog's
                safety always come first. PawFleet admin is available to help at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
