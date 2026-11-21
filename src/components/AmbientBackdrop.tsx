import { useEffect, useState } from 'react';

interface AmbientBackdropProps {
  backgroundImageUrl?: string | null;
}

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 3.7 + (i % 4) * 2.5) % 98}%`,
  top: `${(i * 9.3 + 12) % 96}%`,
  size: i % 5 === 0 ? 3.5 : i % 3 === 0 ? 2.5 : 1.8,
  duration: `${7 + (i % 5) * 2.1}s`,
  delay: `-${(i * 1.15) % 9}s`,
  color:
    i % 4 === 0
      ? 'bg-[#ffb800]/65 shadow-[0_0_6px_rgba(255,184,0,0.75)]'
      : i % 7 === 0
        ? 'bg-[#ff2a55]/45 shadow-[0_0_6px_rgba(255,42,85,0.65)]'
        : 'bg-[#00f0ff]/65 shadow-[0_0_6px_rgba(0,240,255,0.75)]',
}));

export function AmbientBackdrop({
  backgroundImageUrl = null,
}: AmbientBackdropProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [backgroundImageUrl]);

  const showBgImage = Boolean(backgroundImageUrl) && !imgFailed;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#080c14]"
      data-testid="ambient-backdrop"
    >
      {/* Fallback / Base Deep Dark Sci-Fi Mecha Gradient (60% Deep Base) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,240,255,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(255,42,85,0.14),transparent_55%),radial-gradient(ellipse_at_center,rgba(14,26,48,0.55),#080c14_78%)]" />

      {/* Optional Full-Screen Battle Arena Artwork (Slightly Dimmed & Soft-Blurred so Grid Pops) */}
      {showBgImage && backgroundImageUrl && (
        <>
          <img
            src={backgroundImageUrl}
            alt=""
            draggable={false}
            data-testid="battle-bg-image"
            data-bg-src={backgroundImageUrl}
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-55 brightness-[0.46] saturate-[1.08] blur-[2px] transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080c14]/75 via-[#080c14]/45 to-[#080c14]/88" />
        </>
      )}

      {/* Subtle Sci-Fi Holographic Grid Horizon */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,240,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating Ambient Dust-Light Particles */}
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className={`animate-ambient-drift absolute rounded-full ${p.color}`}
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
