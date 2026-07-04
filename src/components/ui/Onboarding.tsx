import { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface Step {
  emoji: string;
  title: string;
  desc: string;
}

const STEPS: Record<string, Step[]> = {
  owner: [
    {
      emoji: '🐾',
      title: 'Welcome to PawFleet!',
      desc: 'Your all-in-one pet care hub. Book walks, grooming, vet visits and more — all from one app.',
    },
    {
      emoji: '🦮',
      title: 'Book a Walk',
      desc: 'Tap the Walk button on your home screen to book a trusted local walker. GPS-tracked every single step.',
    },
    {
      emoji: '📍',
      title: 'Track in Real Time',
      desc: 'Once your walk starts, tap Track to watch your dog live on the map and chat with your walker.',
    },
    {
      emoji: '✂️',
      title: 'Grooming & Vet Care',
      desc: 'At-home grooming and vet clinic bookings are just a tap away. Find them under Services.',
    },
    {
      emoji: '👥',
      title: 'Join the Community',
      desc: 'Connect with pet owners across Lusaka. Share tips, ask questions, and make friends for your pup.',
    },
  ],
  walker: [
    {
      emoji: '🦮',
      title: 'Welcome, Walker!',
      desc: "You're about to start earning by walking dogs in Lusaka. Here's a quick tour of the app.",
    },
    {
      emoji: '📋',
      title: 'Find Walks',
      desc: 'Open My Walks and tap the Available tab. Accept walk requests to fill your schedule and start earning.',
    },
    {
      emoji: '📡',
      title: 'Keep GPS On',
      desc: 'When a walk starts, your GPS broadcasts live so the owner can track their dog. Keep the app open.',
    },
    {
      emoji: '💰',
      title: 'Track Your Earnings',
      desc: 'See everything you\'ve earned in the Earnings tab. Confirm payments once you\'ve received them.',
    },
    {
      emoji: '📖',
      title: 'Read the Dog Guide',
      desc: 'New to dog walking? The Guide tab has everything you need — safety tips, handling, emergencies and more.',
    },
  ],
  shopowner: [
    {
      emoji: '🛒',
      title: 'Welcome to Your Shop!',
      desc: 'Sell pet products directly to PawFleet owners across Lusaka. Here\'s how to get started.',
    },
    {
      emoji: '📦',
      title: 'Add Your Products',
      desc: 'Tap My Products to add items for sale. Include clear photos and prices for better conversions.',
    },
    {
      emoji: '🔔',
      title: 'Get Notified on Orders',
      desc: 'You\'ll get a real-time alert every time an order comes in. Fulfil orders promptly to build your rating.',
    },
    {
      emoji: '📊',
      title: 'Track Your Sales',
      desc: 'The Analytics tab shows your top products and total revenue. Use it to decide what to stock.',
    },
  ],
};

const STORAGE_KEY = 'pawfleet_onboarded';

function getOnboarded(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function markOnboarded(userId: string) {
  const s = getOnboarded();
  s.add(userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}

interface Props {
  userId: string;
  role: string;
}

export default function Onboarding({ userId, role }: Props) {
  const steps = STEPS[role] ?? STEPS.owner;
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (!getOnboarded().has(userId)) setVisible(true);
  }, [userId]);

  const dismiss = () => {
    markOnboarded(userId);
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: 'white', animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-5 pt-1">
          <button onClick={dismiss} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6, height: 6,
                background: i === step ? '#2B8A50' : '#D1FAE5',
              }} />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pb-6 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #EBF5EF, #C6E6D3)' }}
          >
            {current.emoji}
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-3 leading-tight">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">{current.desc}</p>

          <button
            onClick={next}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}
          >
            {isLast ? "Let's go! 🚀" : 'Next'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>

          {!isLast && (
            <button onClick={dismiss} className="mt-3 text-xs text-gray-400 font-medium hover:text-gray-600">
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
