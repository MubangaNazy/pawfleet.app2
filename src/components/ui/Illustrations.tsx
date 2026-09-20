// Brand SVG illustrations for empty states, success screens, onboarding moments

export function WalkingDogIllustration({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 320 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="162" cy="186" rx="130" ry="6" fill="rgba(27,67,50,0.09)" />

      {/* == PERSON == */}

      {/* Back leg (trailing) */}
      <path d="M58 108 L70 152 Q72 158 80 158 L84 158 Q88 156 86 150 L74 108" fill="#1E3A5F" />
      {/* Front leg (striding) */}
      <path d="M40 108 L28 152 Q26 158 34 158 L38 158 Q44 156 44 150 L48 108" fill="#1E3A5F" />
      {/* Shoes */}
      <rect x="20" y="152" width="24" height="9" rx="4.5" fill="#F8F8F8" />
      <rect x="20" y="152" width="10" height="9" rx="4.5" fill="#E0E0E0" />
      <rect x="70" y="152" width="24" height="9" rx="4.5" fill="#F8F8F8" />
      <rect x="70" y="152" width="10" height="9" rx="4.5" fill="#E0E0E0" />

      {/* Body — vibrant green shirt */}
      <path d="M32 70 C26 72 22 84 22 96 L22 112 Q46 120 72 112 L72 96 C72 84 74 72 68 70 Q54 62 32 70 Z" fill="#2B8A50" />
      {/* Shirt collar V */}
      <path d="M42 70 Q50 76 58 70" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Shirt side stripe detail */}
      <path d="M36 76 Q34 90 34 104" stroke="rgba(255,255,255,0.12)" strokeWidth="7" strokeLinecap="round" />

      {/* Back arm (swinging back) */}
      <path d="M32 82 Q16 98 10 116" stroke="#7B4A2C" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="9" cy="118" rx="6.5" ry="6" fill="#7B4A2C" />

      {/* Forward arm (holding leash) */}
      <path d="M68 82 Q88 90 106 86" stroke="#7B4A2C" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="108" cy="85" rx="7" ry="6.5" fill="#7B4A2C" />

      {/* Neck */}
      <rect x="45" y="56" width="11" height="18" rx="5.5" fill="#8B5A34" />

      {/* Head */}
      <circle cx="50" cy="40" r="25" fill="#8B5A34" />

      {/* Afro */}
      <path d="M26 42 C24 22 34 8 50 8 C66 8 76 22 74 42 C70 36 62 30 50 30 C38 30 30 36 26 42 Z" fill="#2A1200" />
      <ellipse cx="25" cy="44" rx="9" ry="8" fill="#2A1200" />
      <ellipse cx="75" cy="44" rx="9" ry="8" fill="#2A1200" />

      {/* Ears */}
      <ellipse cx="25" cy="47" rx="5.5" ry="6.5" fill="#7B4A2C" />
      <ellipse cx="75" cy="47" rx="5.5" ry="6.5" fill="#7B4A2C" />

      {/* Eyes whites */}
      <ellipse cx="41" cy="42" rx="5.5" ry="6" fill="white" />
      <ellipse cx="59" cy="42" rx="5.5" ry="6" fill="white" />
      {/* Irises */}
      <circle cx="42" cy="43" r="4" fill="#3A1E00" />
      <circle cx="60" cy="43" r="4" fill="#3A1E00" />
      {/* Pupils */}
      <circle cx="42" cy="43" r="2.2" fill="#0A0400" />
      <circle cx="60" cy="43" r="2.2" fill="#0A0400" />
      {/* Eye shine */}
      <circle cx="43.5" cy="41.5" r="1.2" fill="white" />
      <circle cx="61.5" cy="41.5" r="1.2" fill="white" />

      {/* Eyebrows */}
      <path d="M37 35 Q41 33 45 35" stroke="#2A1200" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M55 35 Q59 33 63 35" stroke="#2A1200" strokeWidth="2.8" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <ellipse cx="50" cy="49" rx="3.5" ry="2.5" fill="#6B3A1C" />

      {/* Happy smile */}
      <path d="M42 54 Q50 62 58 54" stroke="#6B3A1C" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      {/* Cheek blush */}
      <ellipse cx="38" cy="52" rx="5" ry="3" fill="rgba(200,90,60,0.18)" />
      <ellipse cx="62" cy="52" rx="5" ry="3" fill="rgba(200,90,60,0.18)" />

      {/* == LEASH == */}
      <path d="M108 85 Q175 58 224 90" stroke="#52B788" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="6 5" />

      {/* == DOG == */}

      {/* Tail curving up */}
      <path d="M225 120 Q208 96 218 76 Q224 64 232 70" stroke="#C4722A" strokeWidth="10" strokeLinecap="round" fill="none" />
      <circle cx="234" cy="67" r="7" fill="#EDAA58" />

      {/* Body */}
      <ellipse cx="256" cy="132" rx="44" ry="27" fill="#D4842A" />
      <ellipse cx="253" cy="122" rx="33" ry="19" fill="#ECA850" opacity="0.45" />

      {/* Neck */}
      <path d="M274 107 Q292 114 292 128" stroke="#D4842A" strokeWidth="22" strokeLinecap="round" />
      <path d="M276 109 Q292 116 292 128" stroke="#EDAA58" strokeWidth="10" strokeLinecap="round" opacity="0.35" />

      {/* Head */}
      <ellipse cx="296" cy="96" rx="29" ry="27" fill="#D4842A" />
      <ellipse cx="293" cy="84" rx="21" ry="14" fill="#EDAA58" opacity="0.45" />

      {/* Left ear (long floppy) */}
      <path d="M270 84 C260 70 252 80 254 100 Q258 116 270 112 Q280 108 276 90 Z" fill="#B05818" />
      <path d="M266 90 C262 80 258 88 260 102 Q264 112 270 108" stroke="#EDAA58" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.3" />

      {/* Right ear */}
      <path d="M318 84 C328 70 336 80 332 100 Q328 116 316 112 Q306 108 310 90 Z" fill="#B05818" />

      {/* Snout area */}
      <ellipse cx="316" cy="107" rx="16" ry="12" fill="#C47030" />
      <ellipse cx="314" cy="104" rx="9" ry="7" fill="#D48840" opacity="0.45" />

      {/* Nose */}
      <ellipse cx="323" cy="100" rx="6.5" ry="5.5" fill="#180800" />
      <ellipse cx="321" cy="98" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.4)" />

      {/* Mouth */}
      <path d="M316 109 L322 114 L328 109" stroke="#8B3A00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Tongue */}
      <path d="M319 114 Q320 126 317 130" stroke="#E8708A" strokeWidth="8" strokeLinecap="round" />
      <path d="M322 114 Q323 126 320 130" stroke="#E8708A" strokeWidth="8" strokeLinecap="round" opacity="0.65" />
      <path d="M318 129 Q319 131 321 129" stroke="#C85070" strokeWidth="2" fill="none" />

      {/* Left eye */}
      <circle cx="290" cy="90" r="8.5" fill="white" />
      <circle cx="291" cy="91" r="6" fill="#3A1E00" />
      <circle cx="291" cy="91" r="3.5" fill="#0A0400" />
      <circle cx="289" cy="89" r="2.2" fill="white" />
      {/* Eyelash line */}
      <path d="M283 84 Q290 80 297 84" stroke="#2A1200" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Collar */}
      <path d="M278 113 Q296 104 314 113" stroke="#E84040" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="296" cy="108" r="4.5" fill="#FFD700" />
      <circle cx="296" cy="108" r="2.5" fill="#FFA000" />

      {/* 4 Legs */}
      <path d="M246 156 L234 183" stroke="#C4722A" strokeWidth="12" strokeLinecap="round" />
      <path d="M262 158 L274 183" stroke="#C4722A" strokeWidth="12" strokeLinecap="round" />
      <path d="M224 149 L211 176" stroke="#B05818" strokeWidth="12" strokeLinecap="round" />
      <path d="M238 151 L252 176" stroke="#B05818" strokeWidth="12" strokeLinecap="round" />

      {/* Paws */}
      <ellipse cx="231" cy="184" rx="10" ry="6.5" fill="#9A4810" />
      <ellipse cx="275" cy="184" rx="10" ry="6.5" fill="#9A4810" />
      <ellipse cx="209" cy="177" rx="10" ry="6.5" fill="#9A4810" />
      <ellipse cx="253" cy="177" rx="10" ry="6.5" fill="#9A4810" />
      {/* Toe lines on front paw */}
      <path d="M227 182 L227 186" stroke="#7B3808" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M231 181 L231 186" stroke="#7B3808" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M235 182 L235 186" stroke="#7B3808" strokeWidth="1.8" strokeLinecap="round" />

      {/* Motion lines */}
      <path d="M196 124 L180 124" stroke="#52B788" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M198 134 L180 134" stroke="#52B788" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <path d="M196 144 L184 144" stroke="#52B788" strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      {/* Paw prints trailing */}
      <g opacity="0.32">
        <circle cx="12" cy="150" r="5.5" fill="#52B788" />
        <circle cx="10" cy="139" r="3.8" fill="#52B788" />
        <circle cx="17" cy="134" r="3.8" fill="#52B788" />
        <circle cx="23" cy="150" r="3.5" fill="#52B788" />
        <circle cx="40" cy="146" r="5" fill="#52B788" />
        <circle cx="38" cy="135" r="3.5" fill="#52B788" />
        <circle cx="45" cy="130" r="3.5" fill="#52B788" />
        <circle cx="51" cy="146" r="3.2" fill="#52B788" />
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
