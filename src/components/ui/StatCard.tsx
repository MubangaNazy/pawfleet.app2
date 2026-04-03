import React, { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label?: string };
  color?: 'blue' | 'green' | 'amber' | 'cyan' | 'violet' | 'rose';
}

const colorMap = {
  blue:   { iconBg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'from-blue-400 to-blue-600',   glow: 'rgba(71,118,230,0.12)' },
  green:  { iconBg: 'bg-emerald-50',icon: 'text-emerald-600',bar: 'from-emerald-400 to-teal-500', glow: 'rgba(16,185,129,0.12)' },
  amber:  { iconBg: 'bg-amber-50',  icon: 'text-amber-600',  bar: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,0.12)' },
  cyan:   { iconBg: 'bg-sky-50',    icon: 'text-sky-600',    bar: 'from-sky-400 to-cyan-500',     glow: 'rgba(14,165,233,0.12)' },
  violet: { iconBg: 'bg-violet-50', icon: 'text-violet-600', bar: 'from-violet-400 to-purple-600',glow: 'rgba(139,92,246,0.12)' },
  rose:   { iconBg: 'bg-rose-50',   icon: 'text-rose-600',   bar: 'from-rose-400 to-pink-600',    glow: 'rgba(244,63,94,0.12)' },
};

export function StatCard({ icon, label, value, subtitle, trend, color = 'blue' }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className="bg-white border border-surface-border rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5 overflow-hidden relative"
      style={{ boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` }}
    >
      {/* Gradient top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${c.bar}`} />

      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.iconBg} shrink-0`}>
          <span className={`${c.icon} [&>svg]:w-5 [&>svg]:h-5`}>{icon}</span>
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${trend.value >= 0 ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}{trend.label || '%'}
          </span>
        )}
      </div>

      <div className="text-[28px] font-extrabold text-ink leading-none mb-1">{value}</div>
      <div className="text-sm font-medium text-ink-secondary">{label}</div>
      {subtitle && <div className="text-xs text-ink-muted mt-1">{subtitle}</div>}
    </div>
  );
}
