interface Props {
  size?: number;
  showText?: boolean;
  textWhite?: boolean;
  className?: string;
}

export default function PawFleetLogo({ size = 40, showText = false, textWhite = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt="PawFleet"
        width={size}
        height={size}
        style={{ flexShrink: 0, borderRadius: '22%', objectFit: 'cover' }}
      />

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
