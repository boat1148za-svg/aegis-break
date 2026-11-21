import { combatConfig } from '../logic/dataLoader';
import type { DraftChoice, UpgradeCategory } from '../logic/types';

interface UpgradeDraftModalProps {
  nodeNumber: number;
  choices: DraftChoice[];
  equippedWeaponCount: number;
  onSelectChoice: (choice: DraftChoice) => void;
}

function getCategoryStyle(category: UpgradeCategory): {
  border: string;
  badge: string;
  button: string;
} {
  switch (category) {
    case 'tactical_chips':
      return {
        border:
          'border-violet-500/55 bg-violet-950/25 hover:border-violet-400 hover:bg-violet-950/45',
        badge: 'bg-violet-500/25 text-violet-200',
        button: 'bg-violet-600 group-hover:bg-violet-500',
      };
    case 'weapon_tech':
      return {
        border:
          'border-amber-500/50 bg-amber-950/20 hover:border-amber-400 hover:bg-amber-950/40',
        badge: 'bg-amber-500/25 text-amber-200',
        button: 'bg-amber-600 group-hover:bg-amber-500',
      };
    case 'power_parts':
    default:
      return {
        border:
          'border-cyan-500/45 bg-cyan-950/20 hover:border-cyan-400 hover:bg-cyan-950/40',
        badge: 'bg-cyan-500/25 text-cyan-200',
        button: 'bg-cyan-600 group-hover:bg-cyan-500',
      };
  }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      data-testid="upgrade-draft-modal"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-950/90 px-6 py-5 text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Node {nodeNumber} Victory · Post-Battle Draft
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-50">
            เลือกการ์ดอัปเกรดหรืออาวุธใหม่ 1 จาก 3 ใบ
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            ช่องอาวุธปัจจุบัน: {equippedWeaponCount} / {maxWeapons} ช่อง
            {equippedWeaponCount >= maxWeapons
              ? ' (เต็มแล้ว — หากเลือกอาวุธใหม่จะเปิดหน้าต่างถอดเปลี่ยน)'
              : ''}
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {choices.map((choice, index) => {
            if (choice.kind === 'weapon') {
              const w = choice.weapon;
              const isSignature =
                w.allowed_mechas && !w.allowed_mechas.includes('ALL');

              return (
                <button
                  key={`weapon-${w.id}`}
                  type="button"
                  data-testid={`draft-card-${index}`}
                  data-card-kind="weapon"
                  data-weapon-id={w.id}
                  onClick={() => onSelectChoice(choice)}
                  className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-5 text-left transition-all ${
                    isSignature
                      ? 'border-amber-400/75 bg-gradient-to-b from-amber-950/40 to-slate-950/80 hover:border-amber-300'
                      : 'border-sky-400/60 bg-gradient-to-b from-sky-950/35 to-slate-950/80 hover:border-sky-300'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${
                          isSignature
                            ? 'bg-amber-500/30 text-amber-200'
                            : 'bg-sky-500/25 text-sky-200'
                        }`}
                        data-testid={`draft-weapon-badge-${index}`}
                      >
                        {isSignature
                          ? `[SIGNATURE: ${w.signatureMechaName ?? 'EX'}]`
                          : '[UNIVERSAL WEAPON]'}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-300 uppercase">
                        {w.type}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-2xl">
                        {w.is_map_weapon
                          ? '🌟'
                          : w.type === 'melee'
                            ? '⚔️'
                            : '🔫'}
                      </span>
                      <div className="text-base font-extrabold text-slate-50">
                        {w.name}
                      </div>
                    </div>

                    {/* Weapon Stats Grid */}
                    <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-[11px] text-slate-300">
                      <div>
                        PWR <strong className="text-rose-300">{w.power}</strong>
                      </div>
                      <div>
                        RNG{' '}
                        <strong className="text-slate-100">
                          {w.minRange}–{w.maxRange}
                        </strong>
                      </div>
                      <div>
                        EN <strong className="text-amber-300">{w.enCost}</strong>
                      </div>
                      <div>ACC +{w.accuracy}</div>
                      {w.armorPiercePercent && (
                        <div className="col-span-2 font-bold text-cyan-300">
                          🛡️ เจาะเกราะ {w.armorPiercePercent}%
                        </div>
                      )}
                      {w.critBonus && (
                        <div className="col-span-2 font-bold text-amber-300">
                          ⚡ คริติคอล +{w.critBonus}%
                        </div>
                      )}
                      {w.mobilityDebuffAmount && (
                        <div className="col-span-2 font-bold text-emerald-300">
                          ⚡ ลด Mobility -{w.mobilityDebuffAmount}
                        </div>
                      )}
                      {w.knockback && (
                        <div className="col-span-2 font-bold text-orange-300">
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
                    className={`mt-4 rounded-lg py-2 text-center text-xs font-bold text-white transition ${
                      isSignature
                        ? 'bg-amber-600 group-hover:bg-amber-500'
                        : 'bg-sky-600 group-hover:bg-sky-500'
                    }`}
                  >
                    {equippedWeaponCount >= maxWeapons
                      ? 'เลือกและถอดเปลี่ยนอาวุธ'
                      : 'ติดตั้งอาวุธนี้ (Equip)'}
                  </div>
                </button>
              );
            }

            const card = choice.card;
            const style = getCategoryStyle(card.category);

            return (
              <button
                key={`upgrade-${card.id}`}
                type="button"
                data-testid={`draft-card-${index}`}
                data-card-kind="upgrade"
                data-upgrade-id={card.id}
                onClick={() => onSelectChoice(choice)}
                className={`group flex cursor-pointer flex-col justify-between rounded-xl border p-5 text-left transition-all ${style.border}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${style.badge}`}
                    >
                      {card.categoryLabel}
                    </span>
                    {card.unique && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 uppercase">
                        Unique
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950 text-2xl">
                      {card.icon}
                    </span>
                    <div>
                      <div className="text-base font-bold text-slate-50">
                        {card.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {card.nameTh}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-slate-200">
                    {card.description}
                  </p>
                </div>

                <div
                  className={`mt-5 rounded-lg py-2 text-center text-xs font-bold text-white transition ${style.button}`}
                >
                  ติดตั้งการ์ดนี้ (Install)
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
