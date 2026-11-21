import { useEffect, useRef } from 'react';
import type { GridPosition } from '../logic/types';

export interface CanvasParticleBurst {
  id: string;
  kind:
    | 'beam'
    | 'impact'
    | 'explosion'
    | 'ultimate_beam'
    | 'ultimate_explosion';
  from?: GridPosition;
  to: GridPosition;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
  kind: 'spark' | 'smoke' | 'ring';
}

interface BeamStreak {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  alpha: number;
  width: number;
}

interface CanvasParticleOverlayProps {
  rows: number;
  cols: number;
  bursts: CanvasParticleBurst[];
}

export function CanvasParticleOverlay({
  rows,
  cols,
  bursts,
}: CanvasParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const beamsRef = useRef<BeamStreak[]>([]);
  const seenBurstIdsRef = useRef<Set<string>>(new Set());

  // Enqueue new particle bursts whenever `bursts` prop updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width || 600;
    const height = canvas.height || 600;

    const toPx = (pos: GridPosition) => ({
      x: ((pos.col + 0.5) / cols) * width,
      y: ((pos.row + 0.5) / rows) * height,
    });

    for (const burst of bursts) {
      if (seenBurstIdsRef.current.has(burst.id)) continue;
      seenBurstIdsRef.current.add(burst.id);

      const target = toPx(burst.to);

      if (
        (burst.kind === 'beam' || burst.kind === 'ultimate_beam') &&
        burst.from
      ) {
        const origin = toPx(burst.from);
        const isUlt = burst.kind === 'ultimate_beam';
        beamsRef.current.push({
          x1: origin.x,
          y1: origin.y,
          x2: target.x,
          y2: target.y,
          color: burst.color,
          alpha: 1,
          width: isUlt ? 24 : 8,
        });

        // Sparks flying along beam path
        const count = isUlt ? 38 : 14;
        for (let i = 0; i < count; i++) {
          const t = Math.random();
          particlesRef.current.push({
            x: origin.x + (target.x - origin.x) * t,
            y: origin.y + (target.y - origin.y) * t,
            vx: (Math.random() - 0.5) * (isUlt ? 6.2 : 3.2),
            vy: (Math.random() - 0.5) * (isUlt ? 6.2 : 3.2),
            radius: (isUlt ? 2.4 : 1.5) + Math.random() * 3.0,
            alpha: 1,
            decay: isUlt ? 0.03 : 0.045,
            color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#00f0ff' : burst.color,
            kind: 'spark',
          });
        }
      }

      if (
        burst.kind === 'impact' ||
        burst.kind === 'explosion' ||
        burst.kind === 'ultimate_explosion'
      ) {
        const isUltExp = burst.kind === 'ultimate_explosion';
        const sparkCount = isUltExp
          ? 64
          : burst.kind === 'explosion'
            ? 32
            : 18;
        for (let i = 0; i < sparkCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed =
            (isUltExp ? 3.8 : burst.kind === 'explosion' ? 2.5 : 1.8) +
            Math.random() * (isUltExp ? 6.8 : 4.2);
          particlesRef.current.push({
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: (isUltExp ? 2.4 : 1.8) + Math.random() * 3.2,
            alpha: 1,
            decay: isUltExp ? 0.022 + Math.random() * 0.015 : 0.032 + Math.random() * 0.02,
            color:
              i % 4 === 0
                ? '#ffffff'
                : i % 3 === 0
                  ? '#ffb800'
                  : burst.color,
            kind: 'spark',
          });
        }

        // Expanding shockwave ring(s)
        const ringCount = isUltExp ? 3 : 1;
        for (let r = 0; r < ringCount; r++) {
          particlesRef.current.push({
            x: target.x,
            y: target.y,
            vx: 0,
            vy: 0,
            radius: 10 + r * 14,
            alpha: 0.98,
            decay: isUltExp ? 0.036 + r * 0.008 : 0.055,
            color:
              r === 0
                ? '#ffffff'
                : r === 1
                  ? '#ffb800'
                  : '#00f0ff',
            kind: 'ring',
          });
        }
      }

      if (burst.kind === 'explosion' || burst.kind === 'ultimate_explosion') {
        const isUltExp = burst.kind === 'ultimate_explosion';
        // Rising smoke / fiery plasma clouds
        for (let i = 0; i < (isUltExp ? 26 : 16); i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (isUltExp ? 1.2 : 0.6) + Math.random() * (isUltExp ? 3.2 : 1.8);
          particlesRef.current.push({
            x: target.x + (Math.random() - 0.5) * (isUltExp ? 26 : 14),
            y: target.y + (Math.random() - 0.5) * (isUltExp ? 26 : 14),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.7,
            radius: (isUltExp ? 10 : 7) + Math.random() * (isUltExp ? 14 : 10),
            alpha: 0.8,
            decay: 0.016 + Math.random() * 0.01,
            color:
              i % 3 === 0
                ? '#ffb800'
                : i % 3 === 1
                  ? '#ff2a55'
                  : '#475569',
            kind: 'smoke',
          });
        }
      }
    }
  }, [bursts, rows, cols]);

  // 60 FPS Canvas Animation Loop
  useEffect(() => {
    let animFrameId = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          (canvas.width !== Math.round(rect.width) ||
            canvas.height !== Math.round(rect.height))
        ) {
          canvas.width = Math.round(rect.width);
          canvas.height = Math.round(rect.height);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw Laser Beams
          beamsRef.current = beamsRef.current.filter((b) => b.alpha > 0.02);
          for (const b of beamsRef.current) {
            ctx.save();
            ctx.globalAlpha = b.alpha;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 18;
            ctx.shadowColor = b.color;
            ctx.strokeStyle = b.color;
            ctx.lineWidth = b.width;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.5, b.width * 0.38);
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
            ctx.restore();

            b.alpha -= 0.055;
            b.width *= 0.96;
          }

          // Draw Sparks, Smoke & Shockwave Rings
          particlesRef.current = particlesRef.current.filter(
            (p) => p.alpha > 0.02
          );
          for (const p of particlesRef.current) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            if (p.kind === 'ring') {
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 3;
              ctx.shadowBlur = 12;
              ctx.shadowColor = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.stroke();
              p.radius += 2.6;
            } else {
              ctx.fillStyle = p.color;
              if (p.kind === 'spark') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
              }
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
              ctx.fill();
              p.x += p.vx;
              p.y += p.vy;
              p.vx *= 0.94;
              p.vy *= 0.94;
              if (p.kind === 'smoke') {
                p.radius += 0.35;
              }
            }
            ctx.restore();
            p.alpha -= p.decay;
          }
        }
      }

      animFrameId = window.requestAnimationFrame(render);
    };

    animFrameId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animFrameId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-particle-overlay"
      className="pointer-events-none absolute inset-0 z-25 h-full w-full"
    />
  );
}
