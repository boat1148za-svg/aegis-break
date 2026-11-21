import { useState, type MouseEvent, type ReactNode } from 'react';
import { combatConfig } from '../logic/dataLoader';
import type { DraftChoice } from '../logic/types';

type CardRarity = 'rare' | 'epic' | 'legendary';

interface UpgradeDraftModalProps {
  nodeNumber: number;
  choices: DraftChoice[];
  equippedWeaponCount: number;
  onSelectChoice: (choice: DraftChoice) => void;
}

function getChoiceRarity(choice: DraftChoice): CardRarity {
  if (choice.kind === 'weapon') {
    const w = choice.weapon;
    const isSignature = Boolean(
      w.allowed_mechas && !w.allowed_mechas.includes('ALL')
    );
    if (isSignature) return 'legendary';
    if (w.armorPiercePercent || w.mobilityDebuffAmount || w.power >= 2000) {
      return 'epic';
    }
    return 'rare';
  }

  const card = choice.card;
  if (card.id === 'hot_blooded_core' || card.id === 'vampire_reactor') {
    return 'legendary';
  }
  if (card.category === 'tactical_chips' || card.category === 'weapon_tech') {
    return 'epic';
  }
  return 'rare';
}

const RARITY_STYLES: Record<
  CardRarity,
  {
    label: string;
    borderClass: string;
    glowShadow: string;
    badgeClass: string;
    btnClass: string;
    foilGradient: string;
    glareColor: string;
  }
> = {
  rare: {
    label: 'RARE',
    borderClass:
      'border-[#00f0ff]/70 bg-gradient-to-b from-[#08243a]/90 via-[#0b1528]/95 to-[#080c14]/98 hover:border-[#00f0ff]',
    glowShadow: '0 0 26px rgba(0, 240, 255, 0.24)',
    badgeClass:
      'border border-[#00f0ff]/60 bg-[#00f0ff]/20 text-[#00f0ff]',
    btnClass:
      'bg-gradient-to-r from-cyan-600 to-sky-500 group-hover:brightness-115',
    foilGradient:
      'linear-gradient(125deg, transparent 15%, rgba(0,240,255,0.28) 38%, rgba(165,243,252,0.45) 50%, rgba(56,189,248,0.25) 62%, transparent 85%)',
    glareColor: 'rgba(0, 240, 255, 0.34)',
  },
  epic: {
    label: 'EPIC',
    borderClass:
      'border-purple-400/75 bg-gradient-to-b from-[#251142]/90 via-[#150e28]/95 to-[#080c14]/98 hover:border-purple-300',
    glowShadow: '0 0 28px rgba(168, 85, 247, 0.28)',
    badgeClass:
      'border border-purple-400/60 bg-purple-500/25 text-purple-200',
    btnClass:
      'bg-gradient-to-r from-purple-600 to-fuchsia-600 group-hover:brightness-115',
    foilGradient:
      'linear-gradient(125deg, transparent 15%, rgba(192,132,252,0.32) 38%, rgba(244,114,182,0.45) 50%, rgba(0,240,255,0.26) 62%, transparent 85%)',
    glareColor: 'rgba(192, 132, 252, 0.38)',
  },
  legendary: {
    label: 'LEGENDARY',
    borderClass:
      'border-[#ffb800]/85 bg-gradient-to-b from-[#3b2505]/92 via-[#1c140a]/95 to-[#080c14]/98 hover:border-amber-300',
    glowShadow: '0 0 34px rgba(255, 184, 0, 0.34)',
    badgeClass:
      'border border-[#ffb800]/75 bg-[#ffb800]/25 text-[#ffb800]',
    btnClass:
      'bg-gradient-to-r from-amber-500 to-orange-500 text-[#080c14] group-hover:brightness-115',
    foilGradient:
      'linear-gradient(125deg, transparent 12%, rgba(255,184,0,0.38) 35%, rgba(255,255,255,0.52) 48%, rgba(255,42,85,0.3) 60%, rgba(0,240,255,0.28) 72%, transparent 88%)',
    glareColor: 'rgba(255, 184, 0, 0.42)',
  },
};

interface HoloTiltCardProps {
  rarity: CardRarity;
  testId: string;
  cardKind: 'weapon' | 'upgrade';
  itemId: string;
  onClick: () => void;
  children: ReactNode;
}

function HoloTiltCard({
  rarity,
  testId,
  cardKind,
  itemId,
  onClick,
  children,
}: HoloTiltCardProps) {
  const [tilt, setTilt] = useState({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 50,
    hovering: false,
  });

  const styleCfg = RARITY_STYLES[rarity];

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    const ry = (xRatio - 0.5) * 18;
    const rx = (0.5 - yRatio) * 16;
    setTilt({
      rx,
      ry,
      gx: Math.round(xRatio * 100),
      gy: Math.round(yRatio * 100),
      hovering: true,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovering: false });
  };

  return (
    <button
      type="button"
      data-testid={testId}
      data-card-kind={cardKind}
      data-rarity={rarity}
      data-weapon-id={cardKind === 'weapon' ? itemId : undefined}
      data-upgrade-id={cardKind === 'upgrade' ? itemId : undefined}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(920px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${
          tilt.hovering ? 1.035 : 1
        }, ${tilt.hovering ? 1.035 : 1}, 1)`,
        boxShadow: tilt.hovering ? styleCfg.glowShadow : undefined,
        transition: tilt.hovering
          ? 'transform 90ms ease-out, box-shadow 200ms ease-out'
          : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms ease-out',
      }}
      className={`holo-card-shell group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border-2 p-5 text-left ${styleCfg.borderClass}`}
    >
      {/* Dynamic Holographic Prismatic Foil Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 mix-blend-color-dodge transition-opacity duration-200"
        style={{
          opacity: tilt.hovering ? 0.92 : 0.22,
          backgroundImage: styleCfg.foilGradient,
          backgroundSize: '220% 220%',
          backgroundPosition: `${tilt.gx}% ${tilt.gy}%`,
        }}
      />

      {/* Pointer-Tracking Specular Spotlight Sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 mix-blend-screen transition-opacity duration-200"
        style={{
          opacity: tilt.hovering ? 0.85 : 0,
          background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, ${styleCfg.glareColor} 0%, transparent 58%)`,
        }}
      />

      {/* Card Inner Content */}
      <div className="relative z-20 flex h-full flex-col justify-between">
        {children}
      </div>
    </button>
  );
}

export function UpgradeDraftModal({
  nodeNumber,
  choices,
  equippedWeaponCount,
  onSelectChoice,
}: UpgradeDraftModalProps) {
  const maxWeapons = combatConfig.weapons.maxSlots;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080c14]/88 p-4 backdrop-blur-md"
      data-testid="upgrade-draft-modal"
    >
      <div className="hud-panel max-h-[92vh] w-full max-w-5xl overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="border-b border-[#00f0ff]/25 bg-[#080c14]/90 px-6 py-5 text-center">
          <p className="font-orbitron text-[11px] font-extrabold tracking-[0.26em] text-[#ffb800] uppercase">
            Node {nodeNumber} Victory · Holographic Tactical Draft
          </p>
          <h2 className="font-orbitron mt-1.5 text-2xl font-black text-slate-50">
            เลือกการ์ดอัปเกรดหรืออาวุธใหม่ 1 จาก 3 ใบ
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            ช่องอาวุธปัจจุบัน:{' '}
            <strong className="font-sci-num text-[#00f0ff]">
              {equippedWeaponCount} / {maxWeapons}
            </strong>{' '}
            ช่อง
            {equippedWeaponCount >= maxWeapons
              ? ' (เต็มแล้ว — หากเลือกอาวุธใหม่จะเปิดหน้าต่างถอดเปลี่ยน)'
              : ' · เลื่อนเมาส์เหนือการ์ดเพื่อดูแสงโฮโลแกรม'}
          </p>
        </div>

        {/* 3 Interactive 3D Holo Cards */}
        <div className="grid gap-5 p-6 md:grid-cols-3">
          {choices.map((choice, index) => {
            const rarity = getChoiceRarity(choice);
            const rStyle = RARITY_STYLES[rarity];

            if (choice.kind === 'weapon') {
              const w = choice.weapon;
              const isSignature =
                w.allowed_mechas && !w.allowed_mechas.includes('ALL');

              return (
                <HoloTiltCard
                  key={`weapon-${w.id}`}
                  rarity={rarity}
                  testId={`draft-card-${index}`}
                  cardKind="weapon"
                  itemId={w.id}
                  onClick={() => onSelectChoice(choice)}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span
                        className={`font-orbitron rounded px-2 py-0.5 text-[9px] font-extrabold tracking-widest uppercase ${rStyle.badgeClass}`}
                        data-testid={`draft-weapon-badge-${index}`}
                      >
                        {rStyle.label} ·{' '}
                        {isSignature
                          ? `SIG: ${w.signatureMechaName ?? 'EX'}`
                          : 'UNIVERSAL'}
                      </span>
                      <span className="font-orbitron rounded bg-[#080c14]/85 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 uppercase">
                        {w.type}
                      </span>
                    </div>

                    <div className="mt-3.5 flex items-center gap-2.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#080c14]/90 text-2xl shadow-inner">
                        {w.is_map_weapon
                          ? '🌟'
                          : w.type === 'melee'
                            ? '⚔️'
                            : '🔫'}
                      </span>
                      <div className="font-orbitron text-sm font-extrabold text-white">
                        {w.name}
                      </div>
                    </div>

                    {/* Weapon Stats Grid */}
                    <div className="font-sci-num mt-3.5 grid grid-cols-2 gap-1.5 rounded-lg border border-white/10 bg-[#080c14]/80 p-2.5 text-[11px] text-slate-300">
                      <div>
                        PWR <strong className="text-[#ff2a55]">{w.power}</strong>
                      </div>
                      <div>
                        RNG{' '}
                        <strong className="text-slate-100">
                          {w.minRange}–{w.maxRange}
                        </strong>
                      </div>
                      <div>
                        EN <strong className="text-[#ffb800]">{w.enCost}</strong>
                      </div>
                      <div>ACC +{w.accuracy}</div>
                      {w.armorPiercePercent && (
                        <div className="col-span-2 font-sans font-bold text-[#00f0ff]">
                          🛡️ เจาะเกราะ {w.armorPiercePercent}%
                        </div>
                      )}
                      {w.critBonus && (
                        <div className="col-span-2 font-sans font-bold text-[#ffb800]">
                          ⚡ คริติคอล +{w.critBonus}%
                        </div>
                      )}
                      {w.mobilityDebuffAmount && (
                        <div className="col-span-2 font-sans font-bold text-emerald-300">
                          ⚡ ลด Mobility -{w.mobilityDebuffAmount}
                        </div>
                      )}
                      {w.knockback && (
                        <div className="col-span-2 font-sans font-bold text-orange-300">
                          💥 Knockback {w.knockback} ช่อง
                        </div>
                      )}
                    </div>

                    {w.description && (
                      <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                        {w.description}
                      </p>
                    )}
                  </div>

                  <div
                    className={`hud-btn font-orbitron mt-4 py-2.5 text-center text-xs font-extrabold tracking-wider text-white transition ${rStyle.btnClass}`}
                  >
                    {equippedWeaponCount >= maxWeapons
                      ? 'เลือกและถอดเปลี่ยนอาวุธ'
                      : 'EQUIP WEAPON'}
                  </div>
                </HoloTiltCard>
              );
            }

            const card = choice.card;

            return (
              <HoloTiltCard
                key={`upgrade-${card.id}`}
                rarity={rarity}
                testId={`draft-card-${index}`}
                cardKind="upgrade"
                itemId={card.id}
                onClick={() => onSelectChoice(choice)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-orbitron rounded px-2 py-0.5 text-[9px] font-extrabold tracking-widest uppercase ${rStyle.badgeClass}`}
                    >
                      {rStyle.label} · {card.categoryLabel}
                    </span>
                    {card.unique && (
                      <span className="font-orbitron rounded border border-white/15 bg-[#080c14]/85 px-1.5 py-0.5 text-[9px] font-bold text-[#ffb800] uppercase">
                        Unique
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#080c14]/90 text-2xl shadow-inner">
                      {card.icon}
                    </span>
                    <div>
                      <div className="font-orbitron text-sm font-extrabold text-white">
                        {card.name}
                      </div>
                      <div className="text-xs text-slate-300">{card.nameTh}</div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-slate-200">
                    {card.description}
                  </p>
                </div>

                <div
                  className={`hud-btn font-orbitron mt-5 py-2.5 text-center text-xs font-extrabold tracking-wider text-white transition ${rStyle.btnClass}`}
                >
                  INSTALL MODULE
                </div>
              </HoloTiltCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
