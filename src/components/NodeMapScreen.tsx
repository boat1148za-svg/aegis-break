import {
  combatConfig,
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
  getUnitDefById,
} from '../logic/dataLoader';
import { getSelectableNodeIds } from '../logic/mapGenerator';
import { AmbientBackdrop } from './AmbientBackdrop';
import { InstalledUpgradesBar } from './InstalledUpgradesBar';
import { MechaSprite } from './MechaSprite';
import type {
  BranchingMapNode,
  BranchingStageMap,
  MetaProgressState,
  NodeType,
  RunNodeData,
  RunPlayerState,
} from '../logic/types';

interface NodeMapScreenProps {
  stageMap: BranchingStageMap;
  currentNodeId: string | null;
  clearedNodeIds: string[];
  totalFloorsCleared: number;
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
      return 'border-emerald-400/75 text-emerald-300';
    case 'elite_battle':
    case 'hard_battle':
      return 'border-[#ffb800]/80 text-[#ffb800]';
    case 'boss_battle':
      return 'border-[#ff2a55]/85 text-[#ff2a55]';
    case 'standard_battle':
    default:
      return 'border-[#00f0ff]/75 text-[#00f0ff]';
  }
}

const SVG_WIDTH = 1200;
const SVG_HEIGHT = 440;

function getNodeCoords(node: BranchingMapNode): { x: number; y: number } {
  const x = Math.round(((node.floor - 0.5) / 6) * SVG_WIDTH);
  let y = SVG_HEIGHT / 2;
  if (node.laneCount === 2) {
    y = node.lane === 0 ? 132 : 308;
  } else if (node.laneCount === 3) {
    y = node.lane === 0 ? 82 : node.lane === 1 ? 220 : 358;
  }
  return { x, y };
}

export function NodeMapScreen({
  stageMap,
  currentNodeId,
  clearedNodeIds,
  totalFloorsCleared,
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

  const totalCampaignFloors =
    combatConfig.campaign.totalStages * combatConfig.campaign.floorsPerStage;
  const clearedSet = new Set(clearedNodeIds);
  const selectableIds = runVictory
    ? new Set<string>()
    : getSelectableNodeIds(stageMap, currentNodeId, clearedNodeIds);

  const currentFloorReached = currentNodeId
    ? (stageMap.nodesById[currentNodeId]?.floor ?? 0)
    : 0;

  const selectableNodes = Array.from(selectableIds)
    .map((id) => stageMap.nodesById[id])
    .filter((n): n is BranchingMapNode => Boolean(n));

  return (
    <div
      className="relative min-h-screen bg-[#080c14] text-slate-100"
      data-testid="node-map-screen"
    >
      <AmbientBackdrop />

      <div className="relative z-10">
        {/* Persistent Player Status Header */}
        <header className="border-b border-[#00f0ff]/25 bg-[#080c14]/82 px-6 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00f0ff]/35 bg-[#0b1324] p-1">
                {unitDef ? (
                  <MechaSprite
                    mechaId={unitDef.mecha.id}
                    faction="player"
                    className="h-10 w-10"
                  />
                ) : (
                  '🤖'
                )}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    data-testid="stage-indicator"
                    className="font-orbitron rounded border border-[#ffb800]/65 bg-[#ffb800]/15 px-2.5 py-0.5 text-[11px] font-black tracking-[0.2em] text-[#ffb800] uppercase"
                  >
                    STAGE {stageMap.stage}/3
                  </span>
                  <span className="font-orbitron text-[10px] font-bold tracking-[0.2em] text-[#00f0ff] uppercase">
                    FLOOR {totalFloorsCleared} / {totalCampaignFloors} CLEARED
                  </span>
                </div>
                <h1 className="font-orbitron mt-0.5 text-lg font-black text-slate-50 sm:text-xl">
                  {unitDef?.mecha.name}{' '}
                  <span className="font-sans text-sm font-medium text-slate-400">
                    ({unitDef?.pilot.name})
                  </span>
                </h1>
              </div>
            </div>

            {/* Persistent Stats */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div
                className="rounded-lg border border-[#00f0ff]/25 bg-[#0b1324]/85 px-3 py-2"
                data-testid="run-stat-hp"
              >
                <span className="text-slate-400">HP </span>
                <span className="font-sci-num font-bold text-emerald-300">
                  {runPlayer.hp} / {effectiveMecha.maxHp}
                </span>
              </div>
              <div
                className="rounded-lg border border-[#ffb800]/25 bg-[#0b1324]/85 px-3 py-2"
                data-testid="run-stat-en"
              >
                <span className="text-slate-400">EN </span>
                <span className="font-sci-num font-bold text-[#ffb800]">
                  {runPlayer.en} / {effectiveMecha.maxEn}
                </span>
              </div>
              <div
                className="rounded-lg border border-violet-500/30 bg-[#0b1324]/85 px-3 py-2"
                data-testid="run-stat-sp"
              >
                <span className="text-slate-400">SP </span>
                <span className="font-sci-num font-bold text-violet-300">
                  {runPlayer.sp} / {effectiveMaxSp}
                </span>
              </div>
              <div
                className="rounded-lg border border-[#ff2a55]/30 bg-[#0b1324]/85 px-3 py-2"
                data-testid="run-stat-maxwill"
              >
                <span className="text-slate-400">Max Will </span>
                <span className="font-sci-num font-bold text-[#ffb800]">
                  {maxWill}
                </span>
              </div>

              <button
                type="button"
                onClick={onReturnToHangar}
                className="cursor-pointer rounded-lg border border-slate-700 bg-[#0b1324]/90 px-3 py-2 font-semibold text-slate-300 transition hover:border-[#00f0ff]/55 hover:text-white"
              >
                กลับโรงเก็บหุ่น
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-7">
          {runVictory && (
            <div
              className="hud-panel mb-6 border-emerald-400/60 p-6 text-center backdrop-blur-md"
              data-testid="run-victory-banner"
            >
              <h2 className="font-orbitron text-2xl font-extrabold text-emerald-300">
                🏆 OPERATION COMPLETE — เคลียร์ครบทั้ง 3 Stages สำเร็จ!
              </h2>
              <p className="mt-2 text-sm text-emerald-100/80">
                คุณนำ {unitDef?.mecha.name} โค่นบอสใหญ่ Overlord Dreadnought เรียบร้อยแล้ว
              </p>
              <button
                type="button"
                onClick={onReturnToHangar}
                className="hud-btn mt-4 cursor-pointer bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
              >
                เริ่มรอบใหม่ที่โรงเก็บหุ่น (Hangar)
              </button>
            </div>
          )}

          <div className="mb-5">
            <InstalledUpgradesBar
              installedUpgradeIds={runPlayer.installedUpgradeIds}
            />
          </div>

          {/* Procedural 6-Floor Branching Tactical Radar Map */}
          <section
            className="hud-panel radar-bg relative mb-7 overflow-hidden p-5 backdrop-blur-md"
            data-testid="node-map-radar"
          >
            {/* Concentric Radar Rings & Rotating Sweep Beam */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <div className="h-[440px] w-[440px] rounded-full border border-[#00f0ff]/16" />
              <div className="absolute h-[290px] w-[290px] rounded-full border border-[#00f0ff]/20" />
              <div className="absolute h-[140px] w-[140px] rounded-full border border-dashed border-[#00f0ff]/25" />
              <div
                className="animate-radar-sweep absolute h-[480px] w-[480px] rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(0,240,255,0.22) 0deg, rgba(0,240,255,0.06) 36deg, transparent 80deg, transparent 360deg)',
                }}
                data-testid="radar-sweep-beam"
              />
            </div>

            {/* Map Title Bar */}
            <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-orbitron text-sm font-extrabold tracking-[0.18em] text-[#00f0ff] uppercase">
                  📡 {stageMap.stageTitle}
                </h2>
                <p className="text-xs text-slate-400">
                  เลือกเส้นทางที่กรอบเรืองแสงกระพริบในชั้นถัดไป (HP, EN, SP ส่งต่อข้ามด่าน · Will รีเซ็ตเป็น{' '}
                  {combatConfig.will.initial})
                </p>
              </div>
              <span
                className="font-sci-num rounded border border-[#00f0ff]/40 bg-[#080c14]/85 px-2.5 py-1 text-[11px] font-bold text-[#00f0ff]"
                data-testid="map-seed-badge"
              >
                SEED #{stageMap.seed}
              </span>
            </div>

            {/* Floor Column Labels */}
            <div className="relative z-10 overflow-x-auto pb-2">
              <div className="min-w-[820px]">
                <div className="font-orbitron mb-2 grid grid-cols-6 text-center text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  <div>FLOOR 1 · ENTRY</div>
                  <div>FLOOR 2</div>
                  <div>FLOOR 3</div>
                  <div>FLOOR 4</div>
                  <div className="text-emerald-300">FLOOR 5 · SUPPLY</div>
                  <div className="text-[#ff2a55]">FLOOR 6 · BOSS</div>
                </div>

                {/* Branching SVG Links + Interactive Nodes Container */}
                <div className="relative h-[440px] w-full rounded-xl border border-[#00f0ff]/20 bg-[#060a13]/75">
                  <svg
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    data-testid="branch-map-svg"
                  >
                    <defs>
                      <filter id="branchGlow">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <linearGradient
                        id="branchEnergyGrad"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#00f0ff" />
                        <stop offset="50%" stopColor="#ffb800" />
                        <stop offset="100%" stopColor="#00f0ff" />
                      </linearGradient>
                    </defs>

                    {Object.values(stageMap.nodesById).flatMap((fromNode) => {
                      const from = getNodeCoords(fromNode);
                      return fromNode.nextNodeIds.map((toId) => {
                        const toNode = stageMap.nodesById[toId];
                        if (!toNode) return null;
                        const to = getNodeCoords(toNode);
                        const pathD = `M ${from.x} ${from.y} C ${from.x + 85} ${from.y}, ${to.x - 85} ${to.y}, ${to.x} ${to.y}`;

                        const isActiveChoice =
                          fromNode.id === currentNodeId &&
                          selectableIds.has(toId);
                        const isClearedEdge =
                          clearedSet.has(fromNode.id) &&
                          (clearedSet.has(toId) || toId === currentNodeId);
                        const isPassedUnchosen =
                          fromNode.floor <= currentFloorReached &&
                          !isClearedEdge &&
                          !isActiveChoice;

                        return (
                          <g key={`edge-${fromNode.id}-${toId}`}>
                            <path
                              d={pathD}
                              fill="none"
                              stroke={
                                isClearedEdge
                                  ? '#10b981'
                                  : isActiveChoice
                                    ? '#00f0ff'
                                    : '#334155'
                              }
                              strokeWidth={
                                isActiveChoice ? 3.5 : isClearedEdge ? 3 : 2
                              }
                              strokeOpacity={
                                isPassedUnchosen
                                  ? 0.2
                                  : isClearedEdge
                                    ? 0.85
                                    : isActiveChoice
                                      ? 0.55
                                      : 0.45
                              }
                              strokeDasharray={
                                isClearedEdge ? undefined : '6 6'
                              }
                            />

                            {isActiveChoice && (
                              <>
                                <path
                                  d={pathD}
                                  fill="none"
                                  stroke="url(#branchEnergyGrad)"
                                  strokeWidth="4"
                                  filter="url(#branchGlow)"
                                  className="animate-energy-flow"
                                />
                                <circle
                                  r="5"
                                  fill="#00f0ff"
                                  filter="url(#branchGlow)"
                                >
                                  <animateMotion
                                    dur="1.4s"
                                    repeatCount="indefinite"
                                    path={pathD}
                                  />
                                </circle>
                              </>
                            )}
                          </g>
                        );
                      });
                    })}
                  </svg>

                  {/* Node Buttons Positioned Over SVG Coordinates */}
                  {Object.values(stageMap.nodesById).map((node) => {
                    const { x, y } = getNodeCoords(node);
                    const isCleared = clearedSet.has(node.id);
                    const isCurrent = node.id === currentNodeId;
                    const isSelectable = selectableIds.has(node.id);
                    const isBoss = node.type === 'boss_battle';
                    const isPassedUnchosen =
                      node.floor <= currentFloorReached && !isCleared;

                    return (
                      <button
                        key={node.id}
                        type="button"
                        disabled={!isSelectable}
                        data-testid={`branch-node-${node.id}`}
                        data-selectable={isSelectable ? 'true' : 'false'}
                        data-cleared={isCleared ? 'true' : 'false'}
                        data-floor={node.floor}
                        onClick={() => isSelectable && onEnterNode(node)}
                        style={{
                          left: `${(x / SVG_WIDTH) * 100}%`,
                          top: `${(y / SVG_HEIGHT) * 100}%`,
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 text-left transition-all ${
                          isBoss ? 'w-44' : 'w-36'
                        } ${
                          isSelectable
                            ? `animate-tile-pulse-blue cursor-pointer bg-[#0b1930]/95 shadow-[0_0_24px_rgba(0,240,255,0.35)] hover:scale-105 ${getNodeAccent(
                                node.type
                              )}`
                            : isCleared
                              ? 'cursor-default border-emerald-400/70 bg-emerald-950/60 text-emerald-200'
                              : isPassedUnchosen
                                ? 'cursor-default border-slate-800 bg-[#080c14]/65 opacity-25'
                                : 'cursor-not-allowed border-slate-700/70 bg-[#0b1324]/75 opacity-55'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-orbitron text-[9px] font-bold tracking-wider uppercase opacity-80">
                            F{node.floor} ·{' '}
                            {isCleared
                              ? 'DONE'
                              : isCurrent
                                ? 'HERE'
                                : isSelectable
                                  ? 'READY'
                                  : isBoss
                                    ? 'BOSS'
                                    : 'LOCKED'}
                          </span>
                          <span className="text-base leading-none">
                            {isCleared ? '✓' : getNodeIcon(node.type)}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs font-bold text-slate-100">
                          {node.title}
                        </div>
                        <div className="truncate text-[10px] opacity-80">
                          {node.typeLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Selectable Next-Floor Mission Cards for Quick Briefing & Accessibility */}
          {!runVictory && selectableNodes.length > 0 && (
            <div data-testid="selectable-nodes-list">
              <h3 className="font-orbitron mb-3 text-xs font-bold tracking-[0.18em] text-[#00f0ff] uppercase">
                ▶ เส้นทางที่เลือกได้ในชั้นถัดไป (FLOOR {selectableNodes[0].floor})
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                {selectableNodes.map((node) => (
                  <div
                    key={node.id}
                    data-testid={`selectable-card-${node.id}`}
                    className={`hud-panel flex flex-col justify-between p-4 backdrop-blur-md ${getNodeAccent(
                      node.type
                    )}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron text-[10px] font-bold tracking-widest uppercase">
                          STAGE {stageMap.stage}/3 · FLOOR {node.floor}
                        </span>
                        <span className="text-xl">{getNodeIcon(node.type)}</span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-white">
                        {node.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-300">
                        {node.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid={`enter-node-${node.id}`}
                      onClick={() => onEnterNode(node)}
                      className="hud-btn font-orbitron mt-4 w-full cursor-pointer border border-[#00f0ff]/80 bg-gradient-to-r from-cyan-600 to-blue-600 py-2 text-xs font-extrabold tracking-wider text-white transition hover:brightness-115"
                    >
                      DEPLOY TO {node.id.toUpperCase()} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
