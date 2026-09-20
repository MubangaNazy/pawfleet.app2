import { Loader2, Volume2, VolumeX } from 'lucide-react';
import type { TurnByTurn } from '../../hooks/useTurnByTurn';
import { turnGlyph } from '../../lib/guidance';
import { formatKm } from '../../lib/geo';

interface Props {
  tbt: TurnByTurn;
  voiceOn: boolean;
  voiceAvailable: boolean;
  onToggleVoice: () => void;
  /** Wording for the very end of the route. */
  endLabel?: string;
  className?: string;
}

/** The "next turn" card shown over the map, like a car satnav. */
export default function GuidanceBanner({ tbt, voiceOn, voiceAvailable, onToggleVoice, endLabel = 'the end', className = '' }: Props) {
  const { next, remainingKm, remainingMin, offRoute, rerouting, arrived } = tbt;

  let glyph = '↑';
  let title = 'Follow the route';
  let sub = '';
  let tone: 'green' | 'amber' | 'done' = 'green';

  if (arrived) {
    glyph = '🏁'; title = `You have reached ${endLabel}`; tone = 'done';
  } else if (offRoute || rerouting) {
    glyph = '↺'; title = rerouting ? 'Finding your way back…' : 'You are off the route'; tone = 'amber';
    sub = 'Head back towards the green line';
  } else if (next) {
    glyph = turnGlyph(next.maneuver.type);
    title = next.maneuver.text;
    const m = next.distKm * 1000;
    sub = m < 20 ? 'Now' : m < 950 ? `In ${Math.round(m / 10) * 10} m` : `Continue for ${formatKm(next.distKm)}`;
  }

  const bg = tone === 'amber' ? '#B45309' : tone === 'done' ? '#2B8A50' : '#1B4332';

  return (
    <div className={`flex items-stretch rounded-2xl overflow-hidden shadow-xl text-white ${className}`} style={{ background: bg }}>
      <div className="w-16 flex items-center justify-center text-4xl font-black shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
        {rerouting ? <Loader2 className="w-7 h-7 animate-spin" /> : glyph}
      </div>
      <div className="flex-1 min-w-0 px-3 py-2.5">
        <p className="text-sm font-extrabold leading-tight line-clamp-2">{title}</p>
        {sub && <p className="text-xs text-white/75 mt-0.5">{sub}</p>}
        {!arrived && !offRoute && !rerouting && (
          <p className="text-[11px] text-white/60 mt-1">{formatKm(remainingKm)} left · about {remainingMin} min</p>
        )}
      </div>
      <button type="button" onClick={onToggleVoice} disabled={!voiceAvailable} aria-label={voiceOn ? 'Mute voice directions' : 'Turn on voice directions'}
        className="w-12 flex items-center justify-center shrink-0 active:opacity-70 disabled:opacity-30" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {voiceOn && voiceAvailable ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
    </div>
  );
}
