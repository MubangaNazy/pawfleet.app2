import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
  className?: string;
}

export function Logo({ size = 40, showText = false, textColor = '#1B4332', className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="PawFleet logo">
        <rect width="120" height="120" rx="28" fill="#267A40" />
        {/* Toe pad 1 – top-center-left */}
        <ellipse cx="52" cy="15" rx="11" ry="15" fill="white" transform="rotate(-14 52 15)" />
        {/* Toe pad 2 – upper right */}
        <ellipse cx="76" cy="23" rx="10" ry="13" fill="white" transform="rotate(13 76 23)" />
        {/* Toe pad 3 – right */}
        <ellipse cx="91" cy="46" rx="10" ry="13" fill="white" transform="rotate(30 91 46)" />
        {/* Main P-shaped main pad (white) */}
        <path fill="white" d="M 27 101 C 19 94, 20 78, 30 68 L 48 35 C 55 21, 72 16, 85 23 C 99 30, 106 48, 96 64 C 86 80, 68 87, 56 81 L 50 79 L 43 97 C 38 107, 29 107, 27 101 Z" />
        {/* P counter – green cutout forming the bowl of the P */}
        <path fill="#267A40" d="M 56 36 C 71 31, 88 41, 87 58 C 86 75, 68 83, 56 77 L 52 75 L 55 39 Z" />
      </svg>
      {showText && (
        <span className="font-extrabold tracking-tight" style={{ color: textColor, fontSize: size * 0.42, lineHeight: 1 }}>
          PawFleet
        </span>
      )}
    </div>
  );
}

export default Logo;
