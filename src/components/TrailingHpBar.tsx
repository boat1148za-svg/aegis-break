import { useEffect, useState } from 'react';

interface TrailingHpBarProps {
  current: number;
  max: number;
  barColorClass: string;
  heightClass?: string;
}

/**
 * Trailing HP Bar: primary bar drops immediately when taking damage,
 * while a glowing yellow/amber trailing bar holds for 0.4s then smoothly glides down.
 */
export function TrailingHpBar({
  current,
  max,
  barColorClass,
  heightClass = 'h-2',
}: TrailingHpBarProps) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  const [trailPct, setTrailPct] = useState(pct);

  useEffect(() => {
    if (pct >= trailPct) {
      setTrailPct(pct);
      return;
    }

    const timer = window.setTimeout(() => {
      setTrailPct(pct);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [pct, trailPct]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-slate-950/95 ${heightClass}`}
      data-testid="trailing-hp-bar"
    >
      {/* Yellow/Amber Trailing Bar (holds 0.4s then glides smoothly) */}
      <div
        className="absolute inset-y-0 left-0 bg-amber-300/90 transition-all duration-500 ease-out"
        style={{ width: `${trailPct}%` }}
      />
      {/* Main Instant HP Bar */}
      <div
        className={`relative h-full transition-all duration-150 ease-out ${barColorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
