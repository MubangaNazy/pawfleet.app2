import React from 'react';

interface ProgressBarProps {
  value: number; // 0–100
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ value, max = 100, color = '#4776E6', height = 6, showLabel = false, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-ink-secondary mb-1.5">
          <span>{label || ''}</span>
          <span className="font-medium text-ink">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="progress-bar w-full" style={{ height }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color, height }} />
      </div>
    </div>
  );
}
