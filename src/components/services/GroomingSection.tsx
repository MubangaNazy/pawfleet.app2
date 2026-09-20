import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Scissors, ShieldCheck, Sparkles, Home } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWalkersLive } from '../../lib/liveTracking';
import GroomIllustration from '../ui/GroomIllustrations';
import { GROOM_PACKAGES, GROOM_PLANS, formatMinutes, planPrice } from '../../lib/groomingPackages';

/** Top of the grooming tab: headline, trust points, and a live count of groomers you can book right now. */
export function GroomingHero() {
  const navigate = useNavigate();
  const { data, currentUser } = useApp();
  const live = useWalkersLive(currentUser?.id);

  const groomers = data.users.filter(u => u.role === 'walker' && (!u.walkerStatus || u.walkerStatus === 'active') && u.pricing?.grooming != null);
  const liveNow = groomers.filter(g => live[g.id]).length;

  return (
    <div>
      <div className="relative overflow-hidden px-5 pt-6 pb-7"
        style={{ background: 'linear-gradient(145deg, #0F2D20 0%, #1B4332 55%, #2B8A50 100%)' }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(82,183,136,0.35), transparent 70%)' }} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/10 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" /> Grooming at your door
          </span>
          <h2 className="text-2xl font-black text-white leading-tight mt-3">A fresh, happy pup<br />without leaving home</h2>
          <p className="text-sm text-white/70 mt-2 max-w-xs leading-relaxed">Certified groomers come to you. Pick a package, pick a groomer, and watch them arrive on the map.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {[[ShieldCheck, 'ID-verified groomers'], [Home, 'Done at home'], [Clock, 'Flexible times']].map(([Icon, text]: any) => (
              <span key={text} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-white/10 px-2.5 py-1.5 rounded-full">
                <Icon className="w-3.5 h-3.5 text-[#86EFAC]" /> {text}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => navigate('/owner/grooming')}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-extrabold active:scale-95 transition-transform shadow-lg"
            style={{ background: '#fff', color: '#1B4332' }}>
            <Scissors className="w-4 h-4" /> Book a groom
          </button>
        </div>
      </div>

      {/* Live groomers */}
      <div className="px-4 -mt-4 relative">
        <button type="button" onClick={() => navigate('/owner/walker-map?service=grooming')}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-surface-border shadow-md text-left active:scale-[0.99] transition-transform">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#EBF5EF' }}>
            <MapPin className="w-5 h-5" style={{ color: '#2B8A50' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-ink">Find groomers near you</p>
            <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-0.5">
              {liveNow > 0
                ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {liveNow} online now</>
                : groomers.length > 0 ? `${groomers.length} groomer${groomers.length === 1 ? '' : 's'} on PawFleet` : 'See who is available on the live map'}
            </p>
          </div>
          <span className="text-sm font-bold shrink-0" style={{ color: '#2B8A50' }}>Open map</span>
        </button>
      </div>
    </div>
  );
}

/** Structured packages and plans. Both feed the booking form with the choice already made. */
export function GroomingPackages() {
  const navigate = useNavigate();
  const [view, setView] = useState<'visits' | 'plans'>('visits');
  const packages = GROOM_PACKAGES.filter(p => !p.isVet && p.art);
  const planBase = GROOM_PACKAGES.find(p => p.id === 'full_groom')!;

  return (
    <div className="px-4 pt-6">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-lg font-extrabold text-ink">Choose your grooming</h3>
          <p className="text-xs text-ink-muted mt-0.5">Prices in kwacha. Pay the groomer on the day.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-surface-secondary mb-4">
        {([['visits', 'One-time visits'], ['plans', 'Save with a plan']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setView(key)}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all ${view === key ? 'bg-white shadow-sm text-primary' : 'text-ink-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'visits' && (
        <div className="space-y-4">
          {packages.map(p => (
            <div key={p.id} className="rounded-3xl overflow-hidden bg-white border border-surface-border shadow-sm">
              <div className="relative h-36">
                <GroomIllustration kind={p.art!} className="absolute inset-0 w-full h-full" />
                {p.tag && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold text-white px-2.5 py-1 rounded-full shadow"
                    style={{ background: p.tag === 'Premium' ? '#6D28D9' : '#1B4332' }}>
                    {p.tag}
                  </span>
                )}
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-ink bg-white/90 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> {formatMinutes(p.minutes)}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-ink leading-tight">{p.label}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{p.desc}</p>
                  </div>
                  <p className="text-xl font-black shrink-0" style={{ color: '#1B4332' }}>K{p.price}</p>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {p.includes.map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-ink-secondary">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#2B8A50' }} /> {item}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => navigate(`/owner/grooming?package=${p.id}`)}
                  className="w-full mt-4 py-3 rounded-2xl text-sm font-extrabold text-white active:scale-[0.98] transition-transform"
                  style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                  Book {p.label}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'plans' && (
        <div className="space-y-4">
          <p className="text-xs text-ink-secondary leading-relaxed bg-[#EBF5EF] rounded-2xl px-4 py-3">
            Plans take a percentage off every visit. Prices below use a Full Groom. You book your first visit now and rebook at the plan price whenever you are ready.
          </p>
          {GROOM_PLANS.map(plan => {
            const each = planPrice(planBase.price, plan.id);
            const perMonth = plan.id === 'fortnightly' ? each * 2 : each;
            return (
              <div key={plan.id} className="rounded-3xl overflow-hidden bg-white border border-surface-border shadow-sm">
                <div className="relative h-32">
                  <GroomIllustration kind={plan.art} className="absolute inset-0 w-full h-full" />
                  <span className="absolute top-3 left-3 text-[10px] font-bold text-[#1B4332] px-2.5 py-1 rounded-full shadow" style={{ background: '#F2C94C' }}>
                    Save {plan.discountPct}%
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-extrabold text-ink leading-tight">{plan.label}</p>
                      <p className="text-xs text-ink-muted mt-0.5">{plan.visits}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black" style={{ color: '#1B4332' }}>K{each}</p>
                      <p className="text-[10px] text-ink-muted line-through">K{planBase.price}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-secondary mt-2 leading-relaxed">{plan.blurb}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-surface-secondary py-2"><p className="text-[10px] text-ink-muted">Per visit</p><p className="text-sm font-bold text-ink">K{each}</p></div>
                    <div className="rounded-xl bg-surface-secondary py-2"><p className="text-[10px] text-ink-muted">Per month</p><p className="text-sm font-bold text-ink">K{perMonth}</p></div>
                  </div>
                  <button type="button" onClick={() => navigate(`/owner/grooming?package=full_groom&plan=${plan.id}`)}
                    className="w-full mt-4 py-3 rounded-2xl text-sm font-extrabold text-white active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
                    Start {plan.label.toLowerCase()}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
