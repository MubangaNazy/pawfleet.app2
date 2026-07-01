// Brand SVG illustrations for empty states, success screens, onboarding moments

export function WalkingDogIllustration({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shadow */}
      <ellipse cx="105" cy="126" rx="70" ry="4" fill="rgba(27,67,50,0.07)" />

      {/* Person — head */}
      <circle cx="30" cy="18" r="11" fill="#D1F0DC" stroke="#1B4332" strokeWidth="2" />
      {/* Person — body */}
      <path d="M21 30 Q30 36 39 30 L42 56 Q30 60 18 56 Z" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Person — arm holding leash */}
      <path d="M39 38 L58 46" stroke="#1B4332" strokeWidth="4.5" strokeLinecap="round" />
      {/* Person — arm back */}
      <path d="M21 38 L10 50" stroke="#1B4332" strokeWidth="4.5" strokeLinecap="round" />
      {/* Person — leg forward */}
      <path d="M23 56 L15 86 L24 86 L30 62" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1.5" />
      {/* Person — leg back */}
      <path d="M37 56 L47 84 L38 84 L30 61" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1.5" />

      {/* Leash — dashed curve */}
      <path d="M58 46 Q90 34 114 56" stroke="#52B788" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />

      {/* Dog — body */}
      <ellipse cx="148" cy="76" rx="28" ry="15" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Dog — neck */}
      <path d="M164 63 Q170 68 170 75" stroke="#EBF5EF" strokeWidth="12" strokeLinecap="round" />
      <path d="M164 63 Q170 68 170 75" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Dog — head */}
      <ellipse cx="166" cy="58" rx="16" ry="14" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Dog — floppy ear */}
      <path d="M174 48 C183 40 187 51 182 61 Q177 68 170 60 Z" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1.5" />
      {/* Dog — snout */}
      <ellipse cx="178" cy="63" rx="9" ry="6" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Dog — nose */}
      <ellipse cx="185" cy="60" rx="4" ry="3" fill="#1B4332" />
      {/* Dog — eye */}
      <circle cx="170" cy="54" r="2" fill="#1B4332" />
      <circle cx="171" cy="53" r="0.7" fill="white" />
      {/* Dog — tail (wagging) */}
      <path d="M120 68 Q107 52 113 38" stroke="#1B4332" strokeWidth="5" strokeLinecap="round" />
      {/* Dog — collar */}
      <path d="M155 65 Q165 60 175 64" stroke="#2B8A50" strokeWidth="3" strokeLinecap="round" />
      {/* Dog — legs */}
      <path d="M154 91 L149 108" stroke="#1B4332" strokeWidth="6" strokeLinecap="round" />
      <path d="M164 91 L170 107" stroke="#1B4332" strokeWidth="6" strokeLinecap="round" />
      <path d="M128 86 L121 102" stroke="#1B4332" strokeWidth="6" strokeLinecap="round" />
      <path d="M140 88 L143 104" stroke="#1B4332" strokeWidth="6" strokeLinecap="round" />

      {/* Paw prints trailing behind */}
      <g opacity="0.45">
        <circle cx="12" cy="100" r="3" fill="#52B788" />
        <circle cx="18" cy="95" r="2" fill="#52B788" />
        <circle cx="8" cy="90" r="2" fill="#52B788" />
        <circle cx="24" cy="88" r="1.5" fill="#52B788" />
      </g>
    </svg>
  );
}

export function SuccessDogIllustration() {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Confetti dots */}
      <circle cx="20" cy="25" r="5" fill="#52B788" opacity="0.7" />
      <circle cx="112" cy="18" r="4" fill="#2B8A50" opacity="0.6" />
      <circle cx="118" cy="45" r="3" fill="#86EFAC" opacity="0.8" />
      <circle cx="14" cy="52" r="3.5" fill="#D1F0DC" opacity="0.9" />
      <rect x="100" y="28" width="6" height="6" rx="1.5" fill="#52B788" opacity="0.6" transform="rotate(20 100 28)" />
      <rect x="18" y="38" width="5" height="5" rx="1.5" fill="#2B8A50" opacity="0.5" transform="rotate(-15 18 38)" />
      <circle cx="60" cy="12" r="3" fill="#52B788" opacity="0.5" />
      <circle cx="80" cy="8" r="2.5" fill="#86EFAC" opacity="0.7" />
      <circle cx="42" cy="10" r="2" fill="#D1F0DC" opacity="0.8" />

      {/* Circle background */}
      <circle cx="65" cy="72" r="42" fill="#EBF5EF" />
      <circle cx="65" cy="72" r="38" fill="white" />

      {/* Checkmark */}
      <circle cx="65" cy="72" r="28" fill="#1B4332" />
      <path d="M51 72 L60 82 L80 62" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Paw prints around the circle */}
      <g opacity="0.4">
        <circle cx="65" cy="28" r="4" fill="#52B788" />
        <circle cx="28" cy="50" r="3.5" fill="#52B788" />
        <circle cx="102" cy="50" r="3.5" fill="#52B788" />
        <circle cx="35" cy="95" r="3" fill="#52B788" />
        <circle cx="95" cy="95" r="3" fill="#52B788" />
      </g>

      {/* Stars */}
      <path d="M22 18 L24 14 L26 18 L30 18 L27 21 L28 25 L24 22 L20 25 L21 21 L18 18 Z" fill="#52B788" opacity="0.7" />
      <path d="M105 105 L107 101 L109 105 L113 105 L110 108 L111 112 L107 109 L103 112 L104 108 L101 105 Z" fill="#2B8A50" opacity="0.6" />
    </svg>
  );
}

export function NoPetsIllustration() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="70" cy="96" rx="50" ry="4" fill="rgba(27,67,50,0.07)" />
      {/* Sitting dog body */}
      <ellipse cx="70" cy="70" rx="24" ry="18" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Head */}
      <ellipse cx="70" cy="46" rx="20" ry="18" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Ears */}
      <path d="M54 36 C48 24 58 18 64 30 Q62 36 56 36 Z" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1.5" />
      <path d="M86 36 C92 24 82 18 76 30 Q78 36 84 36 Z" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="62" cy="44" r="3.5" fill="#1B4332" />
      <circle cx="78" cy="44" r="3.5" fill="#1B4332" />
      <circle cx="63.2" cy="43" r="1.2" fill="white" />
      <circle cx="79.2" cy="43" r="1.2" fill="white" />
      {/* Nose */}
      <ellipse cx="70" cy="53" rx="4" ry="3" fill="#1B4332" />
      {/* Mouth */}
      <path d="M66 56 Q70 60 74 56" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Front paws */}
      <ellipse cx="55" cy="87" rx="8" ry="5" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      <ellipse cx="85" cy="87" rx="8" ry="5" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Tail */}
      <path d="M92 75 Q106 68 100 58" stroke="#1B4332" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* "+" add button hint */}
      <circle cx="110" cy="20" r="14" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      <path d="M110 14 L110 26 M104 20 L116 20" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function NoWalksIllustration() {
  return (
    <svg width="160" height="100" viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="97" rx="60" ry="3.5" fill="rgba(27,67,50,0.07)" />
      {/* Ground line */}
      <line x1="10" y1="92" x2="150" y2="92" stroke="#DDE9E2" strokeWidth="1.5" />
      {/* Bench / park suggestion */}
      <rect x="60" y="78" width="40" height="5" rx="2.5" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1" />
      <rect x="65" y="83" width="4" height="9" rx="2" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1" />
      <rect x="91" y="83" width="4" height="9" rx="2" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1" />
      {/* Small tree */}
      <rect x="128" y="62" width="5" height="30" rx="2.5" fill="#D1F0DC" stroke="#1B4332" strokeWidth="1" />
      <ellipse cx="130" cy="58" rx="14" ry="16" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Standing person (waiting) */}
      <circle cx="30" cy="22" r="9" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      <path d="M22 32 Q30 37 38 32 L39 52 Q30 55 21 52 Z" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Arms out (shrug/waiting pose) */}
      <path d="M38 36 L50 32" stroke="#1B4332" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 36 L10 32" stroke="#1B4332" strokeWidth="4" strokeLinecap="round" />
      {/* Legs straight */}
      <path d="M25 52 L22 80 L30 80 L30 60" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      <path d="M35 52 L38 80 L30 80 L30 60" fill="#EBF5EF" stroke="#1B4332" strokeWidth="1.5" />
      {/* Question mark / waiting dots */}
      <circle cx="55" cy="28" r="3" fill="#52B788" opacity="0.7" />
      <circle cx="55" cy="22" r="3" fill="#52B788" opacity="0.5" />
      <circle cx="55" cy="16" r="3" fill="#52B788" opacity="0.3" />
    </svg>
  );
}
