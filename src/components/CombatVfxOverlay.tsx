import type { GridPosition, WeaponType } from '../logic/types';

export interface CombatVfxEvent {
  id: string;
  weaponType: WeaponType;
  from: GridPosition;
  to: GridPosition;
  color: string;
}

interface CombatVfxOverlayProps {
  rows: number;
  cols: number;
  effects: CombatVfxEvent[];
}

export function CombatVfxOverlay({
  rows,
  cols,
  effects,
}: CombatVfxOverlayProps) {
  if (effects.length === 0) return null;

  const toPercentX = (col: number) => ((col + 0.5) / cols) * 100;
  const toPercentY = (row: number) => ((row + 0.5) / rows) * 100;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
      data-testid="combat-vfx-overlay"
    >
      {effects.map((fx) => {
        const x1 = toPercentX(fx.from.col);
        const y1 = toPercentY(fx.from.row);
        const x2 = toPercentX(fx.to.col);
        const y2 = toPercentY(fx.to.row);

        if (fx.weaponType === 'ranged') {
          return (
            <g key={fx.id} data-testid="vfx-beam">
              {/* Outer Glowing Laser Bloom */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={fx.color}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeOpacity="0.65"
                className="animate-beam-fire"
              />
              {/* White-Hot Core */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="animate-beam-fire"
              />
              {/* Muzzle Flash */}
              <circle
                cx={x1}
                cy={y1}
                r="2.4"
                fill="#ffffff"
                stroke={fx.color}
                strokeWidth="1"
                className="animate-impact-burst"
              />
              {/* Impact Starburst */}
              <circle
                cx={x2}
                cy={y2}
                r="4.2"
                fill={fx.color}
                fillOpacity="0.45"
                stroke="#ffffff"
                strokeWidth="0.9"
                className="animate-impact-burst"
              />
            </g>
          );
        }

        // Melee Energy X-Slash right on target tile
        const r = 4.6;
        return (
          <g key={fx.id} data-testid="vfx-slash">
            <line
              x1={x2 - r}
              y1={y2 - r}
              x2={x2 + r}
              y2={y2 + r}
              stroke={fx.color}
              strokeWidth="2.8"
              strokeLinecap="round"
              className="animate-melee-slash"
            />
            <line
              x1={x2 - r}
              y1={y2 - r}
              x2={x2 + r}
              y2={y2 + r}
              stroke="#ffffff"
              strokeWidth="1.1"
              strokeLinecap="round"
              className="animate-melee-slash"
            />
            <line
              x1={x2 + r}
              y1={y2 - r}
              x2={x2 - r}
              y2={y2 + r}
              stroke={fx.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              className="animate-melee-slash"
            />
            <circle
              cx={x2}
              cy={y2}
              r="3.2"
              fill="#ffffff"
              fillOpacity="0.6"
              className="animate-impact-burst"
            />
          </g>
        );
      })}
    </svg>
  );
}
