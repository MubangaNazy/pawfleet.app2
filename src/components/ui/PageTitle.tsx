import type { ReactNode } from 'react';

/** The PawFleet page header (same as Schedule): italic green-gradient title, soft green subtitle, optional buttons on the right. */
export default function PageTitle({ title, subtitle, right, className = '' }: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-4 pt-5 pb-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold italic leading-tight pr-1"
          style={{ background: 'linear-gradient(135deg, #1B4332, #52B788)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm font-medium mt-1" style={{ color: '#5A8A70' }}>{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0 pt-1">{right}</div>}
    </div>
  );
}
