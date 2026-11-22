import { getUnitWeapons } from '../logic/dataLoader';
import { canUseWeapon, getManhattanDistance } from '../logic/gridLogic';
import type {
  BattleUnit,
  CardinalDirection,
  WeaponData,
} from '../logic/types';

interface WeaponMenuPanelProps {
  unit: BattleUnit;
  allUnits: BattleUnit[];
  selectedWeaponId: string | null;
  mapDirection: CardinalDirection;
  mapTargetCount: number;
  onSelectWeapon: (weapon: WeaponData) => void;
  onCancelWeapon: () => void;
  onChangeMapDirection: (dir: CardinalDirection) => void;
  onFireMapWeapon: () => void;
  onRepairAlly: (targetAlly: BattleUnit) => void;
  onWait: () => void;
}

export function WeaponMenuPanel({
  unit,
  allUnits,
  selectedWeaponId,
  mapDirection,
  mapTargetCount,
  onSelectWeapon,
  onCancelWeapon,
  onChangeMapDirection,
  onFireMapWeapon,
  onRepairAlly,
  onWait,
}: WeaponMenuPanelProps) {
  const unitWeapons = getUnitWeapons(unit);
  const selectedWeaponObj = unitWeapons.find((w) => w.id === selectedWeaponId);
  const isMapWeaponSelected = Boolean(selectedWeaponObj?.is_map_weapon);
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
      className="hud-panel-rose p-4 backdrop-blur-md"
      data-testid="weapon-menu"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-orbitron text-xs font-bold tracking-wider text-[#ff2a55] uppercase">
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
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                  {weapon.name}
                  {(weapon.level ?? 1) > 1 && (
                    <span className="font-sci-num rounded border border-[#ffb800]/60 bg-[#ffb800]/20 px-1.5 py-0.5 text-[10px] font-extrabold text-[#ffb800]">
                      Lv.{weapon.level}
                    </span>
                  )}
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

              <div className="font-sci-num mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <span>
                  PWR <strong className="text-[#ff2a55]">{weapon.power}</strong>
                </span>
                <span>
                  RNG{' '}
                  <strong className="text-slate-100">
                    {weapon.minRange}–{weapon.maxRange}
                  </strong>
                </span>
                <span>
                  EN <strong className="text-[#ffb800]">{weapon.enCost}</strong>
                </span>
                <span>ACC +{weapon.accuracy}</span>
                {ammoLeft !== null && (
                  <span>
                    AMMO {ammoLeft}/{weapon.ammo}
                  </span>
                )}
                {weapon.willRequired > 100 && (
                  <span
                    className={
                      weapon.willRequired >= 120
                        ? 'rounded bg-[#ffb800]/20 px-1.5 font-extrabold text-[#ffb800]'
                        : 'text-violet-300'
                    }
                  >
                    {weapon.willRequired >= 120 ? '⚡ ULT ' : ''}Will{' '}
                    {weapon.willRequired}+
                  </span>
                )}
                {weapon.armorBreakAmount && weapon.armorBreakAmount > 0 && (
                  <span className="rounded bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-300">
                    ARM -{weapon.armorBreakAmount}
                  </span>
                )}
                {weapon.armorPiercePercent && weapon.armorPiercePercent > 0 && (
                  <span className="rounded bg-cyan-500/20 px-1 text-[10px] font-bold text-cyan-300">
                    เจาะเกราะ {weapon.armorPiercePercent}%
                  </span>
                )}
                {weapon.critBonus && weapon.critBonus > 0 && (
                  <span className="rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300">
                    CRIT +{weapon.critBonus}%
                  </span>
                )}
                {weapon.mobilityDebuffAmount &&
                  weapon.mobilityDebuffAmount > 0 && (
                    <span className="rounded bg-teal-500/20 px-1 text-[10px] font-bold text-teal-300">
                      MOB -{weapon.mobilityDebuffAmount}
                    </span>
                  )}
                {weapon.knockback && weapon.knockback > 0 && (
                  <span className="rounded bg-orange-500/25 px-1 text-[10px] font-bold text-orange-300">
                    💥 KB {weapon.knockback}
                  </span>
                )}
                {weapon.is_map_weapon && (
                  <span className="rounded bg-fuchsia-500/25 px-1.5 text-[10px] font-bold text-fuchsia-200">
                    🌟 MAP {weapon.mapLength ?? 4} ช่อง · ห้ามสวนกลับ
                  </span>
                )}
              </div>

              {!check.usable && check.reason && (
                <div
                  className="mt-1.5 inline-block rounded border border-rose-500/40 bg-rose-950/70 px-2 py-0.5 text-[11px] font-bold text-rose-300"
                  data-testid={`weapon-reason-${weapon.id}`}
                >
                  🔒 {check.reason}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* MAP Weapon Direction & Fire Controls */}
      {isMapWeaponSelected && selectedWeaponObj && (
        <div
          className="mt-3 rounded-lg border border-fuchsia-400/50 bg-fuchsia-950/30 p-3"
          data-testid="map-weapon-controls"
        >
          <div className="text-xs font-bold text-fuchsia-200">
            🌟 เลือกทิศทางยิง MAP Weapon (เส้นตรง {selectedWeaponObj.mapLength ?? 4}{' '}
            ช่อง)
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
            {(
              [
                { dir: 'up', label: '⬆️ ขึ้น' },
                { dir: 'down', label: '⬇️ ลง' },
                { dir: 'left', label: '⬅️ ซ้าย' },
                { dir: 'right', label: '➡️ ขวา' },
              ] as const
            ).map(({ dir, label }) => (
              <button
                key={dir}
                type="button"
                data-testid={`map-dir-${dir}`}
                onClick={() => onChangeMapDirection(dir)}
                className={`cursor-pointer rounded border py-1.5 font-semibold transition ${
                  mapDirection === dir
                    ? 'border-fuchsia-300 bg-fuchsia-600 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-fuchsia-400/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="fire-map-weapon-btn"
            onClick={onFireMapWeapon}
            className="mt-2.5 w-full cursor-pointer rounded-lg bg-fuchsia-600 py-2 text-xs font-bold text-white shadow transition hover:bg-fuchsia-500"
          >
            🌟 ยิง {selectedWeaponObj.name} (โดน {mapTargetCount} ศัตรู ·
            ห้ามสวนกลับ)
          </button>
        </div>
      )}

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
