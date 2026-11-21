export function PostProcessOverlay() {
  return (
    <div
      aria-hidden="true"
      data-testid="post-process-overlay"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {/* Subtle Radar Scanlines */}
      <div className="postprocess-scanlines absolute inset-0 opacity-60" />

      {/* Soft Dark Cinematic Vignette */}
      <div className="postprocess-vignette absolute inset-0" />

      {/* Micro Cockpit Visor Corner Brackets */}
      <div className="absolute top-2.5 left-2.5 h-5 w-5 border-t border-l border-[#00f0ff]/25" />
      <div className="absolute top-2.5 right-2.5 h-5 w-5 border-t border-r border-[#00f0ff]/25" />
      <div className="absolute bottom-2.5 left-2.5 h-5 w-5 border-b border-l border-[#00f0ff]/25" />
      <div className="absolute right-2.5 bottom-2.5 h-5 w-5 border-r border-b border-[#00f0ff]/25" />
    </div>
  );
}
