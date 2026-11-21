const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 4.7 + (i % 3) * 3) % 98}%`,
  top: `${(i * 11.3 + 15) % 95}%`,
  size: i % 4 === 0 ? 3 : 2,
  duration: `${7 + (i % 5) * 2.2}s`,
  delay: `-${(i * 1.1) % 8}s`,
  color: i % 3 === 0 ? 'bg-amber-300/60' : 'bg-cyan-300/65',
}));

export function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-testid="ambient-backdrop"
    >
      {/* Deep Space Nebula Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(14,116,144,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(159,18,57,0.16),transparent_55%),linear-gradient(to_bottom,#020617,#090f20,#020617)]" />

      {/* Subtle Sci-Fi Grid Horizon */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating Ambient Light Particles */}
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className={`animate-ambient-drift absolute rounded-full blur-[0.5px] ${p.color}`}
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
