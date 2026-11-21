import type { UpgradeCardData, UpgradeCategory } from '../logic/types';

interface UpgradeDraftModalProps {
  nodeNumber: number;
  choices: UpgradeCardData[];
  onSelectCard: (card: UpgradeCardData) => void;
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
  onSelectCard,
}: UpgradeDraftModalProps) {
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
            เลือกการ์ดอัปเกรด 1 จาก 3 ใบ
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            ติดตั้งชิ้นส่วนเสริม, เทคโนโลยีอาวุธ หรือ Tactical Chip
            เพื่อเสริมความแข็งแกร่งให้หุ่นของคุณในด่านถัดไป
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid gap-4 p-6 md:grid-cols-3">
          {choices.map((card, index) => {
            const style = getCategoryStyle(card.category);

            return (
              <button
                key={card.id}
                type="button"
                data-testid={`draft-card-${index}`}
                data-upgrade-id={card.id}
                onClick={() => onSelectCard(card)}
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
