import { getUnitWeapons } from '../logic/dataLoader';
import { canUseWeapon, getManhattanDistance } from '../logic/gridLogic';
import type { BattleUnit, WeaponData } from '../logic/types';

interface WeaponMenuPanelProps {
  unit: BattleUnit;
  allUnits: BattleUnit[];
  selectedWeaponId: string | null;
  onSelectWeapon: (weapon: WeaponData) => void;
  onCancelWeapon: () => void;
  onRepairAlly: (targetAlly: BattleUnit) => void;
  onWait: () => void;
}

export function WeaponMenuPanel({
  unit,
  allUnits,
  selectedWeaponId,
  onSelectWeapon,
  onCancelWeapon,
  onRepairAlly,
  onWait,
}: WeaponMenuPanelProps) {
  const unitWeapons = getUnitWeapons(unit);
  const repairSkill = unit.mecha.repairSkill;
  const adjacentWoundedAllies = repairSkill
    ? allUnits.filter(
        (u) =>
          u.faction === unit.faction &&
          u.instanceId !== unit.instanceId &&
          u.hp > 0 &&
          u.hp < u.mecha.maxHp &&
          getManhattanDistance(unit.position, u.position) <= repairSkill.range
      )
    : [];

  return (
    <div
      className="rounded-xl border border-rose-500/35 bg-slate-900/90 p-4 shadow-lg"
      data-testid="weapon-menu"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold tracking-wider text-rose-400 uppercase">
            เลือกอาวุธโจมตี (Weapons)
          </h2>
          <p className="text-[11px] text-slate-400">
            {selectedWeaponId
              ? 'คลิกศัตรูในช่องสีแดงเพื่อเปิดหน้าต่างคาดการณ์การรบ'
              : 'เลือกอาวุธเพื่อแสดงระยะยิงสีแดงบนตาราง'}
          </p>
        </div>
        {selectedWeaponId && (
          <button
            type="button"
            onClick={onCancelWeapon}
            className="cursor-pointer rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
          >
            ยกเลิกอาวุธ
          </button>
        )}
      </div>

      <div className="space-y-2">
        {unitWeapons.map((weapon) => {
          const check = canUseWeapon(unit, weapon);
          const isSelected = weapon.id === selectedWeaponId;
          const ammoLeft =
            weapon.ammo !== null
              ? (unit.ammoByWeaponId[weapon.id] ?? weapon.ammo)
              : null;

          return (
            <button
              key={weapon.id}
              type="button"
              data-testid={`weapon-btn-${weapon.id}`}
              disabled={!check.usable}
              onClick={() =>
                isSelected ? onCancelWeapon() : onSelectWeapon(weapon)
              }
              className={`w-full cursor-pointer rounded-lg border p-2.5 text-left transition ${
                isSelected
                  ? 'border-rose-400 bg-rose-500/20 ring-1 ring-rose-400/70'
                  : 'border-slate-800 bg-slate-950/75 hover:border-rose-500/50 hover:bg-slate-900'
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  {weapon.name}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    weapon.type === 'melee'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-cyan-500/15 text-cyan-300'
                  }`}
                >
                  {weapon.type}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <span>
                  PWR <strong className="text-rose-300">{weapon.power}</strong>
                </span>
                <span>
                  RNG{' '}
                  <strong className="text-slate-100">
                    {weapon.minRange}–{weapon.maxRange}
                  </strong>
                </span>
                <span>
                  EN <strong className="text-amber-300">{weapon.enCost}</strong>
                </span>
                <span>ACC +{weapon.accuracy}</span>
                {ammoLeft !== null && (
                  <span>
                    AMMO {ammoLeft}/{weapon.ammo}
                  </span>
                )}
                {weapon.willRequired > 100 && (
                  <span className="text-violet-300">
                    Will {weapon.willRequired}+
                  </span>
                )}
                {weapon.armorBreakAmount && weapon.armorBreakAmount > 0 && (
                  <span className="rounded bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-300">
                    ARM -{weapon.armorBreakAmount}
                  </span>
                )}
              </div>

              {!check.usable && check.reason && (
                <div className="mt-1 text-[11px] font-medium text-rose-400">
                  {check.reason}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Aegis-Medic Adjacent Repair Skill */}
      {repairSkill && (
        <div
          className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-950/25 p-2.5"
          data-testid="medic-repair-section"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-emerald-300">
              🚑 {repairSkill.name} (+{repairSkill.healPercent}% HP)
            </span>
            <span className="text-amber-300">EN {repairSkill.enCost}</span>
          </div>
          {adjacentWoundedAllies.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {adjacentWoundedAllies.map((ally) => (
                <button
                  key={ally.instanceId}
                  type="button"
                  data-testid={`repair-ally-btn-${ally.instanceId}`}
                  disabled={unit.en < repairSkill.enCost}
                  onClick={() => onRepairAlly(ally)}
                  className="w-full cursor-pointer rounded-md bg-emerald-600 px-2.5 py-1.5 text-left text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  ซ่อม {ally.icon} {ally.mecha.name} ({ally.hp}/
                  {ally.mecha.maxHp} HP)
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-slate-400">
              ยืนติดเพื่อนร่วมทีมที่บาดเจ็บ (ระยะ 1 ช่อง) เพื่อกดซ่อมแซม
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onWait}
          className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
        >
          รอ (Wait)
        </button>
      </div>
    </div>
  );
}
