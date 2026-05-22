import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import PawFleetLogo from './ui/PawFleetLogo';

interface Props { onDone: () => void; }

const slides = [
  {
    bg: 'from-[#1B4332] to-[#0D2218]',
    emoji: '🐾',
    title: 'Become the parent your dog thinks you are',
    subtitle: 'Everything your dog needs — all in one place. No more juggling calls and texts.',
  },
  {
    bg: 'from-[#2D6A4F] to-[#1B4332]',
    emoji: '📍',
    title: 'Track every walk, live',
    subtitle: 'See exactly where your dog is with real-time GPS tracking. Peace of mind, always.',
  },
  {
    bg: 'from-[#40916C] to-[#2D6A4F]',
    emoji: '⭐',
    title: 'Trusted, vetted walkers',
    subtitle: 'Every PawFleet walker is background-checked, trained, and dog-approved.',
  },
  {
    bg: 'from-[#52B788] to-[#40916C]',
    emoji: '🎉',
    title: 'Get rewarded for great care',
    subtitle: 'Earn badges and points every time your dog completes a walk. Great habits, great perks.',
  },
];

export default function SplashScreen({ onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const next = () => {
    if (isLast) { onDone(); } else { setCurrent(c => c + 1); }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
      {/* Skip */}
      <div className="flex justify-end px-6 pt-12">
        <button
          onClick={onDone}
          className="text-white/80 text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Logo */}
        <div className="mb-12">
          <PawFleetLogo size={52} showText textWhite />
        </div>

        {/* Emoji */}
        <div className="text-7xl mb-8 animate-bounce" style={{ animationDuration: '2s' }}>
          {slide.emoji}
        </div>

        {/* Text */}
        <h1 className="text-white text-3xl font-bold leading-tight mb-4 max-w-xs">
          {slide.title}
        </h1>
        <p className="text-white/75 text-base leading-relaxed max-w-xs">
          {slide.subtitle}
        </p>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-14 flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={next}
          className="w-full max-w-xs bg-white font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-lg"
          style={{ color: '#1B4332' }}
        >
          {isLast ? "Let's Go" : 'Continue'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
