import React, { useRef } from 'react';

let _counter = 0;

interface Props {
  size?: number;
  showText?: boolean;
  textWhite?: boolean;
  className?: string;
}

export default function PawFleetLogo({ size = 40, showText = false, textWhite = false, className = '' }: Props) {
  const gradId = useRef(`pf-g-${_counter++}`).current;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#52B788" />
            <stop offset="100%" stopColor="#1B4332" />
          </linearGradient>
        </defs>
        {/* Rounded square background */}
        <rect width="100" height="100" rx="24" fill={`url(#${gradId})`} />
        {/* Leash ring */}
        <circle cx="40" cy="55" r="20" stroke="white" strokeWidth="5" fill="none" />
        {/* Leash grip stick */}
        <line x1="56" y1="69" x2="70" y2="82" stroke="white" strokeWidth="5" strokeLinecap="round" />
        {/* Leaf 1 – upper left, angled */}
        <ellipse cx="52" cy="33" rx="5.5" ry="10" stroke="white" strokeWidth="3.5" fill="none" transform="rotate(-28 52 33)" />
        {/* Leaf 2 – centre, pointing up */}
        <ellipse cx="64" cy="27" rx="5.5" ry="10" stroke="white" strokeWidth="3.5" fill="none" />
        {/* Leaf 3 – right, angled */}
        <ellipse cx="74" cy="36" rx="5.5" ry="10" stroke="white" strokeWidth="3.5" fill="none" transform="rotate(28 74 36)" />
      </svg>

      {showText && (
        <div>
          <span
            className="font-bold text-xl tracking-tight block leading-tight"
            style={{ color: textWhite ? '#ffffff' : '#1B4332' }}
          >
            PawFleet
          </span>
          <span
            className="text-[11px] leading-none"
            style={{ color: textWhite ? 'rgba(255,255,255,0.65)' : '#4B5563' }}
          >
            Dog Walking Management
          </span>
        </div>
      )}
    </div>
  );
}
