import {
  combatConfig,
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
  getUnitDefById,
} from '../logic/dataLoader';
import { InstalledUpgradesBar } from './InstalledUpgradesBar';
import type {
  MetaProgressState,
  NodeType,
  RunNodeData,
  RunPlayerState,
} from '../logic/types';

interface NodeMapScreenProps {
  nodes: RunNodeData[];
  currentNodeIndex: number;
  clearedNodeIds: string[];
  runPlayer: RunPlayerState;
  meta: MetaProgressState;
  runVictory: boolean;
  onEnterNode: (node: RunNodeData) => void;
  onReturnToHangar: () => void;
}

function getNodeIcon(type: NodeType): string {
  switch (type) {
    case 'standard_battle':
      return '⚔️';
    case 'repair_event':
      return '🔧';
    case 'elite_battle':
      return '💀';
    case 'repair_supply':
      return '⚡';
    case 'hard_battle':
      return '🔥';
    case 'boss_battle':
      return '👹';
  }
}

function getNodeAccent(type: NodeType): string {
  switch (type) {
    case 'repair_event':
    case 'repair_supply':
      return 'border-emerald-500/45 text-emerald-300';
    case 'elite_battle':
    case 'hard_battle':
      return 'border-amber-500/45 text-amber-300';
    case 'boss_battle':
      return 'border-rose-500/60 text-rose-300';
    case 'standard_battle':
    default:
      return 'border-cyan-500/40 text-cyan-300';
  }
}

export function NodeMapScreen({
  nodes,
  currentNodeIndex,
  clearedNodeIds,
  runPlayer,
  meta,
  runVictory,
  onEnterNode,
  onReturnToHangar,
}: NodeMapScreenProps) {
  const unitDef = getUnitDefById(runPlayer.unitDefId);
  const effectiveMecha = getEffectivePlayerMecha(runPlayer, meta);
  const effectiveMaxSp = getEffectivePlayerMaxSp(runPlayer, meta);
  const maxWill = combatConfig.will.max + runPlayer.maxWillBonus;

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      data-testid="node-map-screen"
    >
      {/* Persistent Player Status Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-2xl">
              {unitDef?.icon}
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-cyan-400 uppercase">
                Operation Route · {clearedNodeIds.length} / {nodes.length} Cleared
              </p>
              <h1 className="text-xl font-bold text-slate-50">
                {unitDef?.mecha.name}{' '}
                <span className="text-sm font-normal text-slate-400">
                  ({unitDef?.pilot.name})
                </span>
              </h1>
            </div>
          </div>

          {/* Persistent Stats */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              data-testid="run-stat-hp"
            >
              <span className="text-slate-400">HP </span>
              <span className="font-bold text-emerald-300">
                {runPlayer.hp} / {effectiveMecha.maxHp}
              </span>
            </div>
            <div
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              data-testid="run-stat-en"
            >
              <span className="text-slate-400">EN </span>
              <span className="font-bold text-amber-300">
                {runPlayer.en} / {effectiveMecha.maxEn}
              </span>
            </div>
            <div
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              data-testid="run-stat-sp"
            >
              <span className="text-slate-400">SP </span>
              <span className="font-bold text-violet-300">
                {runPlayer.sp} / {effectiveMaxSp}
              </span>
            </div>
            <div
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              data-testid="run-stat-maxwill"
            >
              <span className="text-slate-400">Max Will </span>
              <span className="font-bold text-rose-300">{maxWill}</span>
            </div>

            <button
              type="button"
              onClick={onReturnToHangar}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-slate-300 transition hover:bg-slate-700"
            >
              กลับโรงเก็บหุ่น
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {runVictory && (
          <div
            className="mb-8 rounded-2xl border border-emerald-500/60 bg-emerald-950/35 p-6 text-center"
            data-testid="run-victory-banner"
          >
            <h2 className="text-2xl font-extrabold text-emerald-300">
              🏆 OPERATION COMPLETE — ปราบบอสใหญ่สำเร็จ!
            </h2>
            <p className="mt-2 text-sm text-emerald-100/80">
              คุณนำ {unitDef?.mecha.name} ฝ่าฟันครบทั้ง 7 ด่านเรียบร้อยแล้ว
            </p>
            <button
              type="button"
              onClick={onReturnToHangar}
              className="mt-4 cursor-pointer rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              เริ่มรอบใหม่ที่โรงเก็บหุ่น (Hangar)
            </button>
          </div>
        )}

        <div className="mb-6">
          <InstalledUpgradesBar
            installedUpgradeIds={runPlayer.installedUpgradeIds}
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Node Map (แผนที่เส้นทาง 7 ด่าน)
            </h2>
            <p className="text-xs text-slate-400">
              HP, EN และ SP จะถูกส่งต่อข้ามด่านอัตโนมัติ (ค่า Will รีเซ็ตเป็น{' '}
              {combatConfig.will.initial} ทุกครั้งที่เริ่มการต่อสู้ใหม่)
            </p>
          </div>
        </div>

        {/* 7-Node Progression Track */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nodes.map((node, index) => {
            const isCleared = clearedNodeIds.includes(node.id);
            const isCurrent = !runVictory && index === currentNodeIndex;

            return (
              <div
                key={node.id}
                data-testid={`map-node-${node.nodeNumber}`}
                data-status={
                  isCleared ? 'cleared' : isCurrent ? 'current' : 'locked'
                }
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition ${
                  isCurrent
                    ? `bg-slate-900 ring-2 ring-cyan-400/80 shadow-lg shadow-cyan-950/50 ${getNodeAccent(
                        node.type
                      )}`
                    : isCleared
                      ? 'border-emerald-700/40 bg-emerald-950/15 opacity-80'
                      : 'border-slate-800 bg-slate-900/40 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      NODE {node.nodeNumber}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isCleared
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isCurrent
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCleared
                        ? '✓ Cleared'
                        : isCurrent
                          ? '▶ Active'
                          : '🔒 Locked'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="text-2xl">{getNodeIcon(node.type)}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        {node.title}
                      </div>
                      <div className="text-xs font-semibold opacity-90">
                        {node.typeLabel}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                    {node.description}
                  </p>
                </div>

                <div className="mt-4">
                  {isCurrent ? (
                    <button
                      type="button"
                      data-testid={`enter-node-${node.nodeNumber}`}
                      onClick={() => onEnterNode(node)}
                      className="w-full cursor-pointer rounded-lg border border-cyan-400/60 bg-cyan-600 py-2 text-xs font-bold text-white transition hover:bg-cyan-500"
                    >
                      เข้าสู่ Node {node.nodeNumber} →
                    </button>
                  ) : (
                    <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 py-2 text-center text-xs text-slate-500">
                      {isCleared ? 'ผ่านด่านนี้แล้ว' : 'ปลดล็อกเมื่อผ่านด่านก่อนหน้า'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
