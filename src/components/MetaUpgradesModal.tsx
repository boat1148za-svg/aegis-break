import { getMetaUpgradeCost, metaUpgrades } from '../logic/metaLogic';
import type { MetaProgressState } from '../logic/types';

interface MetaUpgradesModalProps {
  meta: MetaProgressState;
  onPurchase: (upgradeId: string) => void;
  onClose: () => void;
}

export function MetaUpgradesModal({
  meta,
  onPurchase,
  onClose,
}: MetaUpgradesModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      data-testid="meta-upgrades-modal"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-violet-500/45 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-violet-400 uppercase">
              Meta-Progression · Permanent Upgrades
            </p>
            <h2 className="text-xl font-bold text-slate-50">
              อัปเกรดถาวร (Meta-Upgrades)
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-4 py-2 text-sm font-bold text-violet-200"
              data-testid="meta-modal-shards"
            >
              ✨ {meta.astralShards.toLocaleString()} Astral Shards
            </div>
            <button
              type="button"
              data-testid="meta-modal-close"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              ปิด
            </button>
          </div>
        </div>

        {/* Upgrade Cards */}
        <div className="grid gap-3 p-6 md:grid-cols-2">
          {metaUpgrades.map((upgrade) => {
            const level = meta.upgradeLevels[upgrade.id] ?? 0;
            const isMaxed = level >= upgrade.maxLevel;
            const cost = getMetaUpgradeCost(upgrade, level);
            const canAfford = !isMaxed && meta.astralShards >= cost;

            return (
              <div
                key={upgrade.id}
                data-testid={`meta-card-${upgrade.id}`}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/75 p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-xl">
                        {upgrade.icon}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-100">
                          {upgrade.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {upgrade.nameTh}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        isMaxed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                      data-testid={`meta-level-${upgrade.id}`}
                    >
                      Lv.{level}/{upgrade.maxLevel}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300">
                    {upgrade.description}
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    data-testid={`meta-buy-${upgrade.id}`}
                    disabled={!canAfford}
                    onClick={() => onPurchase(upgrade.id)}
                    className={`w-full cursor-pointer rounded-lg py-2 text-xs font-bold transition ${
                      isMaxed
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-600/40'
                        : canAfford
                          ? 'bg-violet-600 text-white hover:bg-violet-500'
                          : 'bg-slate-800 text-slate-500'
                    } disabled:cursor-not-allowed`}
                  >
                    {isMaxed
                      ? '✓ ปลดล็อกสูงสุดแล้ว (MAX)'
                      : `อัปเกรด — ✨ ${cost} Shards`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
