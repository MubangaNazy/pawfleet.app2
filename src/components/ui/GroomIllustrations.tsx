import React from 'react';

/**
 * Original vector illustrations for the grooming packages. They are drawn in code, so they always
 * load (no remote photo to break), scale sharply on any phone, and follow the PawFleet colours.
 */

export type GroomArt = 'bath' | 'groom' | 'nails' | 'spa' | 'plan-monthly' | 'plan-fortnightly';

const Sparkle = ({ x, y, s = 1, fill = '#FFFFFF', o = 0.95 }: { x: number; y: number; s?: number; fill?: string; o?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill={fill}
    d="M0 -10 C1.5 -4 4 -1.5 10 0 C4 1.5 1.5 4 0 10 C-1.5 4 -4 1.5 -10 0 C-4 -1.5 -1.5 -4 0 -10Z" />
);

/** A friendly dog face centred on (0,0), about 100 units wide. */
const DogFace = ({ fur = '#E2A766', ear = '#A9682B', muzzle = '#F7E1C4', tongue = true }: { fur?: string; ear?: string; muzzle?: string; tongue?: boolean }) => (
  <g>
    <ellipse cx="-40" cy="-4" rx="15" ry="31" transform="rotate(18 -40 -4)" fill={ear} />
    <ellipse cx="40" cy="-4" rx="15" ry="31" transform="rotate(-18 40 -4)" fill={ear} />
    <ellipse cx="0" cy="0" rx="43" ry="39" fill={fur} />
    <ellipse cx="0" cy="15" rx="23" ry="18" fill={muzzle} />
    {tongue && <path d="M-6 24 Q0 40 6 24Z" fill="#F08A9B" />}
    <ellipse cx="0" cy="6" rx="8.5" ry="6" fill="#2A2A2A" />
    <circle cx="-16" cy="-9" r="4.6" fill="#2A2A2A" />
    <circle cx="16" cy="-9" r="4.6" fill="#2A2A2A" />
    <circle cx="-14.6" cy="-10.6" r="1.5" fill="#fff" />
    <circle cx="17.4" cy="-10.6" r="1.5" fill="#fff" />
    <path d="M-9 21 Q0 29 9 21" fill="none" stroke="#2A2A2A" strokeWidth="2.2" strokeLinecap="round" />
  </g>
);

const Bubble = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#FFFFFF" fillOpacity="0.85" stroke="#BFE3F5" strokeWidth="1.2" />
    <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.22} fill="#fff" />
  </g>
);

function Bath() {
  return (
    <>
      <defs>
        <linearGradient id="ga-bath" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D8F1FF" /><stop offset="1" stopColor="#8FD3F4" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ga-bath)" />
      {/* shower */}
      <path d="M262 0 V34 Q262 46 250 46 H226" fill="none" stroke="#7B8794" strokeWidth="7" strokeLinecap="round" />
      <rect x="196" y="40" width="36" height="14" rx="6" fill="#9AA5B1" />
      {[204, 213, 222, 231].map(x => <line key={x} x1={x} y1="60" x2={x - 5} y2="84" stroke="#4FB4E8" strokeWidth="3" strokeLinecap="round" />)}
      {[208, 218, 227].map(x => <line key={x} x1={x} y1="70" x2={x - 4} y2="92" stroke="#7CC8F0" strokeWidth="3" strokeLinecap="round" />)}
      {/* dog */}
      <g transform="translate(150 92)"><DogFace tongue /></g>
      {/* foam on head */}
      {[[132, 52, 13], [150, 46, 15], [168, 53, 12], [142, 42, 9], [160, 40, 8]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" stroke="#E3F4FC" strokeWidth="1.5" />
      ))}
      {/* tub */}
      <path d="M62 118 H258 V128 Q258 168 218 168 H102 Q62 168 62 128Z" fill="#FFFFFF" />
      <path d="M62 118 H258 V128 Q258 136 252 140 H68 Q62 136 62 128Z" fill="#E8F0F5" />
      <rect x="54" y="112" width="212" height="12" rx="6" fill="#F4F8FB" stroke="#D5E2EA" strokeWidth="1.5" />
      <rect x="92" y="168" width="14" height="8" rx="3" fill="#9AA5B1" /><rect x="214" y="168" width="14" height="8" rx="3" fill="#9AA5B1" />
      <Bubble x={84} y={104} r={9} /><Bubble x={70} y={88} r={6} /><Bubble x={236} y={102} r={10} />
      <Bubble x={252} y={84} r={6} /><Bubble x={108} y={92} r={5} /><Bubble x={44} y={124} r={5} />
      <Sparkle x={40} y={40} s={1.1} /><Sparkle x={290} y={130} s={0.9} />
    </>
  );
}

function Groom() {
  return (
    <>
      <defs>
        <linearGradient id="ga-groom" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EBF5EF" /><stop offset="1" stopColor="#8ED1A9" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ga-groom)" />
      <g transform="translate(150 96) scale(1.15)"><DogFace tongue={false} /></g>
      {/* bow tie */}
      <g transform="translate(150 152)">
        <path d="M0 0 L-20 -11 V11Z" fill="#1B4332" /><path d="M0 0 L20 -11 V11Z" fill="#1B4332" />
        <circle r="6" fill="#2B8A50" />
      </g>
      {/* scissors */}
      <g transform="translate(252 62) rotate(28)" stroke="#5B6770" strokeWidth="5" strokeLinecap="round" fill="none">
        <line x1="-22" y1="-26" x2="18" y2="20" /><line x1="22" y1="-26" x2="-18" y2="20" />
        <circle cx="-12" cy="30" r="9" stroke="#1B4332" /><circle cx="12" cy="30" r="9" stroke="#1B4332" />
      </g>
      {/* comb */}
      <g transform="translate(58 112) rotate(-22)">
        <rect x="-30" y="-8" width="60" height="16" rx="5" fill="#F2C94C" />
        {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-27 + i * 6.6} y="6" width="3.2" height="14" rx="1.6" fill="#E0B23A" />)}
      </g>
      <Sparkle x={70} y={42} s={1.2} /><Sparkle x={268} y={132} s={1} /><Sparkle x={106} y={150} s={0.8} />
    </>
  );
}

function Nails() {
  return (
    <>
      <defs>
        <linearGradient id="ga-nails" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1DB" /><stop offset="1" stopColor="#F8C98B" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ga-nails)" />
      {/* big paw */}
      <g transform="translate(140 100)">
        <ellipse cx="0" cy="22" rx="42" ry="34" fill="#E2A766" />
        <ellipse cx="0" cy="26" rx="22" ry="17" fill="#B9773A" />
        {[[-50, -14, -18], [-19, -40, -6], [19, -40, 6], [50, -14, 18]].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
            <ellipse cx="0" cy="0" rx="14" ry="19" fill="#E2A766" />
            <ellipse cx="0" cy="-19" rx="6" ry="8" fill="#FFF7EA" stroke="#D6B98F" strokeWidth="1.5" />
          </g>
        ))}
      </g>
      {/* clipper */}
      <g transform="translate(252 112) rotate(-25)">
        <rect x="-38" y="-9" width="70" height="18" rx="8" fill="#5B6770" />
        <rect x="-38" y="-9" width="38" height="18" rx="8" fill="#1B4332" />
        <path d="M32 -9 L52 -4 L52 4 L32 9Z" fill="#C7CFD6" />
        <circle cx="-20" cy="0" r="3.5" fill="#52B788" />
      </g>
      <Sparkle x={56} y={44} s={1.1} /><Sparkle x={236} y={40} s={0.9} /><Sparkle x={70} y={146} s={0.8} />
    </>
  );
}

function Spa() {
  return (
    <>
      <defs>
        <linearGradient id="ga-spa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1EAFE" /><stop offset="1" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ga-spa)" />
      {/* leaves */}
      <g fill="#52B788"><ellipse cx="44" cy="140" rx="10" ry="26" transform="rotate(-30 44 140)" /><ellipse cx="66" cy="148" rx="9" ry="22" transform="rotate(10 66 148)" fill="#2B8A50" /></g>
      <g fill="#52B788"><ellipse cx="278" cy="138" rx="10" ry="26" transform="rotate(30 278 138)" /><ellipse cx="256" cy="148" rx="9" ry="22" transform="rotate(-10 256 148)" fill="#2B8A50" /></g>
      <g transform="translate(160 100)"><DogFace tongue={false} /></g>
      {/* towel turban */}
      <path d="M112 78 Q112 32 160 30 Q208 32 208 78 Q160 60 112 78Z" fill="#FFFFFF" />
      <path d="M118 72 Q160 56 202 72" fill="none" stroke="#DDD6F3" strokeWidth="4" />
      <path d="M126 58 Q160 46 194 58" fill="none" stroke="#DDD6F3" strokeWidth="3" />
      {/* cucumber slices */}
      <g><circle cx="144" cy="92" r="11" fill="#9BE4B5" stroke="#52B788" strokeWidth="2.5" /><circle cx="144" cy="92" r="5" fill="#C8F5D8" /></g>
      <g><circle cx="176" cy="92" r="11" fill="#9BE4B5" stroke="#52B788" strokeWidth="2.5" /><circle cx="176" cy="92" r="5" fill="#C8F5D8" /></g>
      {/* candle */}
      <g transform="translate(276 92)"><rect x="-9" y="0" width="18" height="24" rx="4" fill="#FFFFFF" /><path d="M0 -16 C7 -8 6 -1 0 0 C-6 -1 -7 -8 0 -16Z" fill="#FFB84D" /></g>
      <Sparkle x={52} y={44} s={1.2} /><Sparkle x={284} y={44} s={1} /><Sparkle x={222} y={152} s={0.8} />
    </>
  );
}

function Plan({ twice }: { twice?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="ga-plan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EBF5EF" /><stop offset="1" stopColor="#B7E4C7" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ga-plan)" />
      {/* calendar */}
      <rect x="86" y="30" width="148" height="128" rx="16" fill="#FFFFFF" stroke="#CDE7D8" strokeWidth="2" />
      <path d="M86 46 Q86 30 102 30 H218 Q234 30 234 46 V62 H86Z" fill="#1B4332" />
      <rect x="112" y="20" width="9" height="20" rx="4.5" fill="#52B788" /><rect x="199" y="20" width="9" height="20" rx="4.5" fill="#52B788" />
      {Array.from({ length: 12 }).map((_, i) => {
        const cx = 108 + (i % 4) * 34; const cy = 84 + Math.floor(i / 4) * 24;
        const marked = twice ? i === 1 || i === 6 : i === 5;
        return marked
          ? <g key={i}><circle cx={cx} cy={cy} r="10" fill="#2B8A50" /><text x={cx} y={cy + 4.5} textAnchor="middle" fontSize="12" fill="#fff">🐾</text></g>
          : <circle key={i} cx={cx} cy={cy} r="4" fill="#DCEBE2" />;
      })}
      <Sparkle x={54} y={54} s={1.1} fill="#2B8A50" o={0.8} /><Sparkle x={272} y={140} s={1} fill="#2B8A50" o={0.8} />
      <circle cx="262" cy="52" r="20" fill="#F2C94C" /><text x="262" y="59" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1B4332">%</text>
    </>
  );
}

export default function GroomIllustration({ kind, className = '', style }: { kind: GroomArt; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 320 180" className={className} style={style} preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      {kind === 'bath' && <Bath />}
      {kind === 'groom' && <Groom />}
      {kind === 'nails' && <Nails />}
      {kind === 'spa' && <Spa />}
      {kind === 'plan-monthly' && <Plan />}
      {kind === 'plan-fortnightly' && <Plan twice />}
    </svg>
  );
}
