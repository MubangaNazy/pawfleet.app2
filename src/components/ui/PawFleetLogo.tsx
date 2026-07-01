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
        <span
          className="font-extrabold text-2xl tracking-tight"
          style={{ color: textWhite ? '#ffffff' : '#1B4332' }}
        >
          PawFleet
        </span>
      )}
    </div>
  );
}
