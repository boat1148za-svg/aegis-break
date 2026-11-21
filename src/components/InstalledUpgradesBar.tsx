import { getInstalledUpgrades } from '../logic/upgradeLogic';
import type { UpgradeCardData } from '../logic/types';

interface InstalledUpgradesBarProps {
  installedUpgradeIds: string[];
  compact?: boolean;
}

function getChipStyle(category: UpgradeCardData['category']): string {
  switch (category) {
    case 'tactical_chips':
      return 'border-violet-500/50 bg-violet-950/40 text-violet-200';
    case 'weapon_tech':
      return 'border-amber-500/50 bg-amber-950/35 text-amber-200';
    case 'power_parts':
    default:
      return 'border-cyan-500/45 bg-cyan-950/35 text-cyan-200';
  }
}

export function InstalledUpgradesBar({
  installedUpgradeIds,
  compact = false,
}: InstalledUpgradesBarProps) {
  const upgrades = getInstalledUpgrades(installedUpgradeIds);

  // Group identical repeatable upgrades with a count badge
  const grouped = new Map<string, { card: UpgradeCardData; count: number }>();
  for (const card of upgrades) {
    const existing = grouped.get(card.id);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(card.id, { card, count: 1 });
    }
  }
  const entries = Array.from(grouped.values());

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/75 ${
        compact ? 'p-3' : 'p-4'
      }`}
      data-testid="installed-upgrades-bar"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Installed Parts &amp; Chips ({installedUpgradeIds.length})
        </h3>
      </div>

      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          ยังไม่ได้ติดตั้งชิ้นส่วนหรือชิป (ชนะด่านต่อสู้เพื่อสุ่มเลือกการ์ดอัปเกรด)
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entries.map(({ card, count }) => (
            <span
              key={card.id}
              title={`${card.name} (${card.nameTh}): ${card.description}`}
              data-testid={`installed-upgrade-${card.id}`}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${getChipStyle(
                card.category
              )}`}
            >
              <span>{card.icon}</span>
              <span>{card.name}</span>
              {count > 1 && (
                <span className="rounded bg-slate-950/70 px-1 text-[10px]">
                  x{count}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
