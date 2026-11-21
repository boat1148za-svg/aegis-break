import type { WeaponData } from '../logic/types';

interface WeaponSwapModalProps {
  newWeapon: WeaponData;
  currentWeapons: WeaponData[];
  onSwap: (replaceWeaponId: string) => void;
  onCancel: () => void;
}

export function WeaponSwapModal({
  newWeapon,
  currentWeapons,
  onSwap,
  onCancel,
}: WeaponSwapModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      data-testid="weapon-swap-modal"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-amber-500/50 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 bg-slate-950/90 px-6 py-4">
          <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">
            Weapon Slots Full ({currentWeapons.length} / {currentWeapons.length})
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-50">
            ช่องอาวุธเต็มแล้ว — เลือกอาวุธเก่า 1 ชิ้นเพื่อถอดเปลี่ยน
          </h2>
        </div>

        <div className="space-y-4 p-6">
          {/* Incoming Weapon */}
          <div className="rounded-xl border border-cyan-400/50 bg-cyan-950/25 p-4">
            <div className="text-[11px] font-bold text-cyan-300 uppercase">
              อาวุธใหม่ที่จะติดตั้ง
            </div>
            <div className="mt-1 text-base font-bold text-slate-50">
              ⚔️ {newWeapon.name}
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-300">
              <span>PWR {newWeapon.power}</span>
              <span>
                RNG {newWeapon.minRange}–{newWeapon.maxRange}
              </span>
              <span>EN {newWeapon.enCost}</span>
              <span>ACC +{newWeapon.accuracy}</span>
            </div>
          </div>

          {/* Current Equipped Weapons */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400">
              คลิกอาวุธเดิมที่ต้องการถอดออก:
            </div>
            {currentWeapons.map((w) => (
              <button
                key={w.id}
                type="button"
                data-testid={`swap-out-${w.id}`}
                onClick={() => onSwap(w.id)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950/75 px-4 py-3 text-left transition hover:border-rose-400 hover:bg-rose-950/25"
              >
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {w.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-slate-400">
                    <span>PWR {w.power}</span>
                    <span>
                      RNG {w.minRange}–{w.maxRange}
                    </span>
                    <span>EN {w.enCost}</span>
                    <span>ACC +{w.accuracy}</span>
                  </div>
                </div>
                <span className="rounded bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300">
                  ถอดเปลี่ยน
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              ยกเลิก (กลับไปเลือกการ์ดอื่น)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
