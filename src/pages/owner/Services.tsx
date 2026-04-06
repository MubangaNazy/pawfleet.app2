import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors, PawPrint, Star, ChevronDown, ChevronUp,
  CheckCircle, Clock, Shield, Heart, Sparkles, Smile,
  MapPin, Phone,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

/* ── Grooming Plans ── */
const groomingPlans = [
  {
    tag: 'Best Value',
    tagColor: 'bg-amber-100 text-amber-700',
    icon: '✂️',
    title: 'Build a Grooming Plan',
    subtitle: 'Monthly or twice-a-month recurring sessions',
    price: 'from ZMW 199',
    cta: 'View Plans',
  },
  {
    tag: null,
    icon: '🛁',
    title: 'Single Bath & Brush',
    subtitle: 'One-time, no commitment',
    price: 'ZMW 249',
    cta: 'Book Now',
  },
  {
    tag: 'Popular',
    tagColor: 'bg-violet-100 text-violet-700',
    icon: '💅',
    title: 'Full Groom Package',
    subtitle: 'Bath, trim, nail clip, ear clean',
    price: 'ZMW 399',
    cta: 'Book Now',
  },
];

/* ── Walking Plans ── */
const walkingPlans = [
  {
    tag: 'Great for first-timers!',
    tagColor: 'bg-emerald-100 text-emerald-700',
    icon: '🦮',
    title: 'Single 40 Min Walk',
    subtitle: 'One-time walk, no commitment',
    price: 'ZMW 150',
    cta: 'Try Now',
  },
  {
    tag: null,
    icon: '⚡',
    title: '20 Min Walk Plans',
    subtitle: 'Quick daily exercise sessions',
    price: 'from ZMW 103 / walk',
    cta: 'View Options',
  },
  {
    tag: 'Bestseller',
    tagColor: 'bg-amber-100 text-amber-700',
    icon: '🌳',
    title: '40 Min Walk Plans',
    subtitle: 'Most popular — full neighbourhood walk',
    price: 'from ZMW 120 / walk',
    cta: 'View Options',
  },
];

/* ── FAQs ── */
const groomingFaqs = [
  { q: 'What grooming services do you offer?', a: 'We offer full grooming packages including bath, blow-dry, haircut, nail trim, ear cleaning, and teeth brushing. You can book one-off sessions or recurring plans.' },
  { q: 'How often should I schedule grooming?', a: 'Most breeds benefit from grooming every 4–6 weeks. Long-haired breeds may need it more frequently. Our groomers will advise based on your dog.' },
  { q: 'Can I stay with my pet during grooming?', a: 'Yes — our grooming is done at your home, so you can be present the whole time. This keeps your dog calm and comfortable.' },
  { q: 'What products do you use?', a: 'We use premium, pet-safe, hypoallergenic shampoos and conditioners. All products are free from harsh chemicals and safe for all coat types.' },
];

const walkingFaqs = [
  { q: "What if my dog doesn't go for a walk with the walker?", a: 'Our walkers are trained to build trust with shy or hesitant dogs. The first session includes a 10-minute meet-and-greet before the walk begins.' },
  { q: 'What if my dog is reactive or pulls the leash?', a: 'Our walkers are experienced handling all temperaments. Just mention it in your special instructions when booking and we will match you with the right walker.' },
  { q: 'How can I identify the PawFleet walker?', a: 'All PawFleet walkers wear an orange vest and carry an ID card. You can also verify via the app before they arrive.' },
  { q: "Where can I track my dog's walk?", a: 'Once the walker starts the session, you can track your dog live on the map from your dashboard. You will receive a notification when the walk begins and ends.' },
  { q: 'How long will the walk be?', a: 'Depending on the plan you choose — 20 or 40 minutes of active walking time, not counting pickup and drop-off.' },
];

/* ── Reviews ── */
const reviews = [
  { name: 'Chanda M., Lusaka', text: 'PawFleet has been a lifesaver. My walker is always on time and sends me photos during the walk. Max loves it!', rating: 5 },
  { name: 'Bwalya K., Ndola', text: 'The groomer was so gentle with my anxious golden. She was spotless and relaxed after. Worth every kwacha.', rating: 5 },
  { name: 'Mutale C., Kitwe', text: 'Booked the monthly grooming plan and I have not looked back. Professional, punctual, and my dog smells amazing.', rating: 5 },
];

/* ── FAQ Item ── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-surface-border last:border-0">
      <button
        className="w-full flex items-start justify-between gap-3 py-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-medium text-ink">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />}
      </button>
      {open && <p className="text-sm text-ink-secondary pb-4 pr-6 leading-relaxed">{a}</p>}
    </div>
  );
}

/* ── Plan Card ── */
function PlanCard({ plan, onBook }: { plan: typeof groomingPlans[0]; onBook: () => void }) {
  return (
    <div className="border border-surface-border rounded-2xl p-4 bg-white relative overflow-hidden">
      {plan.tag && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.tagColor} mb-2 inline-block`}>
          {plan.tag}
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plan.icon}</span>
          <div>
            <p className="text-sm font-semibold text-ink">{plan.title}</p>
            <p className="text-xs text-ink-muted">{plan.subtitle}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-ink-muted">{plan.price}</p>
          <button
            onClick={onBook}
            className="mt-1 text-xs font-semibold text-primary border border-primary/30 px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            {plan.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function Services() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'grooming' | 'walking'>('grooming');

  return (
    <div className="max-w-2xl mx-auto pb-28 lg:pb-8">
      {/* Tab selector */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-surface-border px-4 pt-4 pb-0">
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-secondary rounded-xl mb-4 max-w-xs">
          {(['grooming', 'walking'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-white shadow-sm text-primary' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t === 'grooming' ? <Scissors className="w-4 h-4" /> : <PawPrint className="w-4 h-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {tab === 'grooming' ? (
          <>
            {/* Hero */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full inline-block mb-3">
                    🏆 Over 1,000+ grooming sessions delivered
                  </p>
                  <h2 className="text-xl font-bold leading-tight mb-1">Grooming Plans</h2>
                  <p className="text-white/80 text-sm">At-home grooming — stress-free, so your dog stays healthy, clean, and happy</p>
                </div>
                <span className="text-5xl">✂️</span>
              </div>
              <div className="flex items-center gap-1 mt-4">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />)}
                <span className="text-white/80 text-xs ml-1">4.90 · 1,000+ sessions</span>
              </div>
            </div>

            {/* Plans */}
            <div>
              <h3 className="text-base font-bold text-ink mb-3">Choose a Plan</h3>
              <div className="space-y-3">
                {groomingPlans.map(plan => (
                  <PlanCard key={plan.title} plan={plan} onBook={() => navigate('/owner/request')} />
                ))}
              </div>
            </div>

            {/* How it works */}
            <div>
              <h3 className="text-base font-bold text-ink mb-4">How It Works</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Choose a service', desc: 'Pick a one-time groom or a recurring plan — monthly or twice a month.' },
                  { step: 2, title: 'Set your schedule', desc: 'Pick a date and time that works for you. We come to your door.' },
                  { step: 3, title: 'Book your first session', desc: 'Set your first slot and relax — we manage the rest.' },
                  { step: 4, title: 'Your groomer arrives', desc: 'A trusted PawFleet groomer shows up right on schedule.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </div>
                    <div className="flex-1 pb-4 border-l border-violet-100 pl-4">
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why choose */}
            <div>
              <h3 className="text-base font-bold text-ink mb-4">Why Choose PawFleet?</h3>
              <div className="space-y-3">
                {[
                  { icon: Heart, title: 'At-home comfort', desc: "Your dog stays stress-free in a space they know and love." },
                  { icon: Smile, title: 'Groomers they\'ll love', desc: "Our pet professionals are trained, kind, and dog-approved." },
                  { icon: Sparkles, title: 'We clean up after', desc: "No mess, no fuss. We tidy up once grooming is done." },
                  { icon: Clock, title: 'Flexible scheduling', desc: "Book sessions when you need them — no expiry dates." },
                  { icon: Phone, title: 'Support 9am–7pm', desc: "Got questions? We're just a message away, all day long." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="text-xs text-ink-secondary">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm font-bold text-ink mb-4">More than 12,000 5-star reviews!</p>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
                {reviews.map(r => (
                  <div key={r.name} className="snap-start shrink-0 w-72 bg-white border border-surface-border rounded-2xl p-4">
                    <div className="flex gap-0.5 mb-2">
                      {Array(r.rating).fill(0).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-sm text-ink-secondary leading-relaxed mb-3">"{r.text}"</p>
                    <p className="text-xs font-semibold text-ink">— {r.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="text-base font-bold text-ink mb-2">Frequently Asked Questions</h3>
              <div className="bg-white border border-surface-border rounded-2xl px-4">
                {groomingFaqs.map(faq => <FaqItem key={faq.q} {...faq} />)}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Hero */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full inline-block mb-3">
                    📍 GPS tracked every walk
                  </p>
                  <h2 className="text-xl font-bold leading-tight mb-1">Walking Plans</h2>
                  <p className="text-white/80 text-sm">Reliable daily walks, fixed time slots, and GPS tracking for peace of mind</p>
                </div>
                <span className="text-5xl">🦮</span>
              </div>
              <div className="flex items-center gap-1 mt-4">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />)}
                <span className="text-white/80 text-xs ml-1">4.95 · Trusted by 500+ owners</span>
              </div>
            </div>

            {/* Plans */}
            <div>
              <h3 className="text-base font-bold text-ink mb-3">Walking Plans</h3>
              <div className="space-y-3">
                {walkingPlans.map(plan => (
                  <PlanCard key={plan.title} plan={plan} onBook={() => navigate('/owner/request')} />
                ))}
              </div>
            </div>

            {/* How it works */}
            <div>
              <h3 className="text-base font-bold text-ink mb-4">How It Works</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Schedule your walks', desc: 'Set timings that work for you — one-time or recurring, we\'re flexible.' },
                  { step: 2, title: 'Meet your walker', desc: 'A friendly, trained walker will arrive at your doorstep on time.' },
                  { step: 3, title: 'Track in real-time', desc: 'The walker starts the session on the app — follow along live, get notified when it ends.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </div>
                    <div className="flex-1 pb-4 border-l border-emerald-100 pl-4">
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MapPin, title: 'Live GPS', desc: 'Track your dog\'s exact route in real time' },
                { icon: Shield, title: 'Vetted Walkers', desc: 'Background-checked and trained' },
                { icon: Clock, title: 'Flexible Times', desc: 'Morning, afternoon, or evening walks' },
                { icon: CheckCircle, title: 'Walk Reports', desc: 'Photo updates after every session' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white border border-surface-border rounded-xl p-4">
                  <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm font-bold text-ink mb-4">More than 12,000 5-star reviews!</p>
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
                {reviews.map(r => (
                  <div key={r.name} className="snap-start shrink-0 w-72 bg-white border border-surface-border rounded-2xl p-4">
                    <div className="flex gap-0.5 mb-2">
                      {Array(r.rating).fill(0).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-sm text-ink-secondary leading-relaxed mb-3">"{r.text}"</p>
                    <p className="text-xs font-semibold text-ink">— {r.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div>
              <h3 className="text-base font-bold text-ink mb-2">Frequently Asked Questions</h3>
              <div className="bg-white border border-surface-border rounded-2xl px-4">
                {walkingFaqs.map(faq => <FaqItem key={faq.q} {...faq} />)}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <p className="text-base font-bold text-ink mb-1">Ready to book your first walk?</p>
              <p className="text-sm text-ink-secondary mb-4">Takes less than 30 seconds</p>
              <Button onClick={() => navigate('/owner/request')} icon={<PawPrint className="w-4 h-4" />}>
                Book a Walk
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
