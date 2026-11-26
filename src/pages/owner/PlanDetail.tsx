import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, Bell, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPlan, SAMPLE_PRICING } from '../../lib/plans';

export default function PlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { currentUser, data, sendNotification } = useApp();
  const plan = getPlan(planId);
  const [option, setOption] = useState(0);
  const [notified, setNotified] = useState(() => {
    try { return localStorage.getItem(`pawfleet_plan_interest_${planId}`) === '1'; } catch { return false; }
  });

  if (!plan) return <Navigate to="/owner" replace />;
  const chosen = plan.options[option];

  const notifyMe = () => {
    if (notified || !currentUser) return;
    data.users.filter(u => u.role === 'admin').forEach(a =>
      sendNotification(a.id, 'plan_interest', `Interest: ${plan.title}`,
        `${currentUser.name} wants the ${plan.title} (${chosen.label}). Phone: ${currentUser.phone || 'not set'}`,
        { planId: plan.id, option: chosen.label, ownerId: currentUser.id }));
    try { localStorage.setItem(`pawfleet_plan_interest_${plan.id}`, '1'); } catch { /* private mode */ }
    setNotified(true);
  };

  return (
    <div className="max-w-2xl mx-auto pb-32 bg-white min-h-full">
      {/* Photo header */}
      <div className="relative h-64 overflow-hidden">
        <img src={plan.image} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1B4332 0%, rgba(27,67,50,0.6) 40%, rgba(27,67,50,0) 75%)' }} />
        <button onClick={() => navigate(-1)} aria-label="Back"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="absolute bottom-0 inset-x-0 p-5">
          <h1 className="text-2xl font-extrabold text-white">{plan.title}</h1>
          <p className="text-white/80 text-sm mt-1">{plan.tagline}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {SAMPLE_PRICING && (
          <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Sample pricing — final prices may change before plans launch.
          </p>
        )}

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {plan.options.map((o, i) => (
            <button key={o.label} type="button" onClick={() => setOption(i)}
              className={`text-left rounded-2xl border-2 p-3.5 transition-all ${i === option ? 'border-primary bg-[#EBF5EF]' : 'border-surface-border bg-white'}`}>
              <p className="text-xs font-bold text-ink">{o.label}</p>
              <p className="text-xl font-extrabold mt-1" style={{ color: '#1B4332' }}>
                K{o.price.toLocaleString()}<span className="text-xs font-semibold text-ink-muted"> /{o.per}</span>
              </p>
              <ul className="mt-2 space-y-0.5">
                {o.details.map(d => <li key={d} className="text-[11px] text-ink-muted">• {d}</li>)}
              </ul>
            </button>
          ))}
        </div>

        {/* What's included */}
        <div className="rounded-2xl border border-surface-border p-4">
          <p className="text-sm font-bold text-ink mb-3">What's included</p>
          <ul className="space-y-2.5">
            {plan.includes.map(line => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-ink">
                <span className="w-5 h-5 rounded-full bg-[#EBF5EF] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {plan.bookPath && (
          <p className="text-xs text-ink-muted leading-relaxed">
            Monthly plan checkout is coming in the next update. For now you can book single sessions with the same walkers and groomers.
          </p>
        )}
      </div>

      {/* Action */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 px-4 z-20">
        <div className="max-w-2xl mx-auto">
          {plan.bookPath ? (
            <button onClick={() => navigate(plan.bookPath!)}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              {plan.bookLabel} →
            </button>
          ) : notified ? (
            <div className="w-full py-4 rounded-2xl font-bold text-sm text-center bg-[#EBF5EF] text-primary flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> We'll let you know when it launches
            </div>
          ) : (
            <button onClick={notifyMe}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm shadow-xl flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1B4332, #2B8A50)' }}>
              <Bell className="w-4 h-4" /> Launching soon — notify me
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
