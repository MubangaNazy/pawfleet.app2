interface Props {
  size?: number;
  showText?: boolean;
  textWhite?: boolean;
  className?: string;
}

export default function PawFleetLogo({ size = 40, showText = false, textWhite = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Rounded square background */}
        <rect width="120" height="120" rx="26" fill="#2B8A50" />

        {/* Toe 1 – upper, slight left tilt */}
        <ellipse cx="52" cy="15" rx="11" ry="15" fill="white" transform="rotate(-14 52 15)" />
        {/* Toe 2 – upper right */}
        <ellipse cx="76" cy="23" rx="10" ry="13" fill="white" transform="rotate(13 76 23)" />
        {/* Toe 3 – right */}
        <ellipse cx="91" cy="46" rx="10" ry="13" fill="white" transform="rotate(30 91 46)" />

        {/* Main P-paw body */}
        <path
          fill="white"
          d="M 27 101 C 19 94, 20 78, 30 68 L 48 35 C 55 21, 72 16, 85 23 C 99 30, 106 48, 96 64 C 86 80, 68 87, 56 81 L 50 79 L 43 97 C 38 107, 29 107, 27 101 Z"
        />

        {/* Green counter/cutout — creates the inner paw-pad hole */}
        <path
          fill="#2B8A50"
          d="M 56 36 C 71 31, 88 41, 87 58 C 86 75, 68 83, 56 77 L 52 75 L 55 39 Z"
        />
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
