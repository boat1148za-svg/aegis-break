import {
  combatConfig,
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
  getUnitDefById,
} from '../logic/dataLoader';
import { AmbientBackdrop } from './AmbientBackdrop';
import { InstalledUpgradesBar } from './InstalledUpgradesBar';
import { MechaSprite } from './MechaSprite';
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
      return 'border-emerald-400/55 text-emerald-300';
    case 'elite_battle':
    case 'hard_battle':
      return 'border-[#ffb800]/60 text-[#ffb800]';
    case 'boss_battle':
      return 'border-[#ff2a55]/75 text-[#ff2a55]';
    case 'standard_battle':
    default:
      return 'border-[#00f0ff]/55 text-[#00f0ff]';
  }
}

// Tactical radar plot positions for the 7-Node sector trajectory (SVG viewBox 0 0 700 190)
const RADAR_NODE_COORDS = [
  { x: 55, y: 122 },
  { x: 152, y: 74 },
  { x: 250, y: 132 },
  { x: 350, y: 66 },
  { x: 450, y: 126 },
  { x: 548, y: 72 },
  { x: 645, y: 98 },
];

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
                <p className="font-orbitron text-[10px] font-bold tracking-[0.24em] text-[#00f0ff] uppercase">
                  Tactical Radar Route · {clearedNodeIds.length} / {nodes.length}{' '}
                  Cleared
                </p>
                <h1 className="font-orbitron text-xl font-black text-slate-50">
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
                🏆 OPERATION COMPLETE — ปราบบอสใหญ่สำเร็จ!
              </h2>
              <p className="mt-2 text-sm text-emerald-100/80">
                คุณนำ {unitDef?.mecha.name} ฝ่าฟันครบทั้ง 7 ด่านเรียบร้อยแล้ว
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

          {/* Tactical Radar Command Map with Rotating Sweep & Flowing Energy Conduits */}
          <section
            className="hud-panel radar-bg relative mb-7 overflow-hidden p-5 backdrop-blur-md"
            data-testid="node-map-radar"
          >
            {/* Concentric Radar Rings & Rotating Sweep Beam */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            >
              <div className="h-[380px] w-[380px] rounded-full border border-[#00f0ff]/18" />
              <div className="absolute h-[250px] w-[250px] rounded-full border border-[#00f0ff]/22" />
              <div className="absolute h-[120px] w-[120px] rounded-full border border-dashed border-[#00f0ff]/28" />
              {/* Horizontal & Vertical Radar Crosshairs */}
              <div className="absolute inset-x-0 h-px bg-[#00f0ff]/12" />
              <div className="absolute inset-y-0 w-px bg-[#00f0ff]/12" />

              {/* Rotating Conic Radar Sweep */}
              <div
                className="animate-radar-sweep absolute h-[420px] w-[420px] rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(0,240,255,0.28) 0deg, rgba(0,240,255,0.08) 38deg, transparent 82deg, transparent 360deg)',
                }}
                data-testid="radar-sweep-beam"
              />
            </div>

            {/* Radar Top Telemetry Header */}
            <div className="relative z-10 mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-orbitron text-sm font-extrabold tracking-[0.18em] text-[#00f0ff] uppercase">
                  📡 TACTICAL SECTOR RADAR · 7-NODE ROUTE
                </h2>
                <p className="text-xs text-slate-400">
                  HP, EN และ SP ส่งต่อข้ามด่านอัตโนมัติ (ค่า Will รีเซ็ตเป็น{' '}
                  {combatConfig.will.initial} ทุกครั้งที่เริ่มฉากต่อสู้)
                </p>
              </div>
              <span className="font-sci-num rounded border border-[#00f0ff]/40 bg-[#080c14]/85 px-2.5 py-1 text-[11px] font-bold text-[#00f0ff]">
                SECTOR SCAN: ACTIVE
              </span>
            </div>

            {/* Interactive SVG Energy Route Graph */}
            <div className="relative z-10 mt-2 w-full overflow-x-auto">
              <svg
                viewBox="0 0 700 190"
                className="h-44 w-full min-w-[560px]"
                data-testid="node-map-energy-links"
              >
                <defs>
                  <filter id="neonCyanGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="activeEnergyGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="50%" stopColor="#ffb800" />
                    <stop offset="100%" stopColor="#00f0ff" />
                  </linearGradient>
                </defs>

                {/* Connecting Energy Conduits Between Consecutive Nodes */}
                {nodes.slice(0, -1).map((node, idx) => {
                  const from = RADAR_NODE_COORDS[idx] ?? { x: 60 + idx * 95, y: 95 };
                  const to = RADAR_NODE_COORDS[idx + 1] ?? {
                    x: 155 + idx * 95,
                    y: 95,
                  };
                  const isFromCleared = clearedNodeIds.includes(node.id);
                  const isToCleared = clearedNodeIds.includes(nodes[idx + 1].id);
                  const isActiveFlow =
                    !runVictory &&
                    (idx === currentNodeIndex || idx === currentNodeIndex - 1);

                  return (
                    <g key={`link-${node.id}`}>
                      {/* Base Track Line */}
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={
                          isFromCleared && isToCleared
                            ? '#10b981'
                            : isActiveFlow
                              ? '#00f0ff'
                              : '#334155'
                        }
                        strokeWidth={isActiveFlow ? 3 : 2}
                        strokeOpacity={
                          isFromCleared && isToCleared
                            ? 0.85
                            : isActiveFlow
                              ? 0.45
                              : 0.55
                        }
                        strokeDasharray={
                          isFromCleared && isToCleared ? undefined : '4 5'
                        }
                      />

                      {/* Animated Flowing Energy Stream from Current Node -> Next Node */}
                      {isActiveFlow && (
                        <>
                          <line
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="url(#activeEnergyGrad)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            filter="url(#neonCyanGlow)"
                            className="animate-energy-flow"
                            data-testid={`energy-flow-link-${idx + 1}`}
                          />
                          <circle r="4.2" fill="#00f0ff" filter="url(#neonCyanGlow)">
                            <animateMotion
                              dur="1.45s"
                              repeatCount="indefinite"
                              path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
                            />
                          </circle>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* 7 Interactive Radar Waypoint Beacons */}
                {nodes.map((node, idx) => {
                  const pt = RADAR_NODE_COORDS[idx] ?? { x: 60 + idx * 95, y: 95 };
                  const isCleared = clearedNodeIds.includes(node.id);
                  const isCurrent = !runVictory && idx === currentNodeIndex;
                  const isBoss = node.type === 'boss_battle';

                  const strokeColor = isCurrent
                    ? '#00f0ff'
                    : isCleared
                      ? '#10b981'
                      : isBoss
                        ? '#ff2a55'
                        : '#475569';

                  return (
                    <g
                      key={`beacon-${node.id}`}
                      onClick={() => {
                        if (isCurrent) onEnterNode(node);
                      }}
                      className={isCurrent ? 'cursor-pointer' : ''}
                    >
                      {isCurrent && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="24"
                          fill="rgba(0, 240, 255, 0.14)"
                          stroke="#00f0ff"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isBoss ? 19 : 16}
                        fill={
                          isCurrent
                            ? '#0b2239'
                            : isCleared
                              ? '#062c22'
                              : '#0b1220'
                        }
                        stroke={strokeColor}
                        strokeWidth={isCurrent ? 2.6 : 1.8}
                        filter={isCurrent ? 'url(#neonCyanGlow)' : undefined}
                      />
                      <text
                        x={pt.x}
                        y={pt.y + 5}
                        textAnchor="middle"
                        fontSize={isBoss ? '14' : '12'}
                      >
                        {isCleared ? '✓' : getNodeIcon(node.type)}
                      </text>
                      <text
                        x={pt.x}
                        y={pt.y + 34}
                        textAnchor="middle"
                        fill={
                          isCurrent
                            ? '#00f0ff'
                            : isCleared
                              ? '#34d399'
                              : isBoss
                                ? '#ff2a55'
                                : '#94a3b8'
                        }
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="Orbitron, Chakra Petch, sans-serif"
                      >
                        N{node.nodeNumber}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          {/* 7-Node Detailed Progression Cards */}
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
                  className={`relative flex flex-col justify-between rounded-xl border p-5 backdrop-blur-md transition ${
                    isCurrent
                      ? `hud-panel ring-2 ring-[#00f0ff]/85 shadow-[0_0_24px_rgba(0,240,255,0.2)] ${getNodeAccent(
                          node.type
                        )}`
                      : isCleared
                        ? 'border-emerald-500/40 bg-emerald-950/20 opacity-85'
                        : 'border-slate-800 bg-[#0b1324]/55 opacity-55'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-orbitron text-xs font-bold tracking-wider text-slate-400 uppercase">
                        NODE 0{node.nodeNumber}
                      </span>
                      <span
                        className={`font-orbitron rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                          isCleared
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isCurrent
                              ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
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
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#080c14]/85 text-xl">
                        {getNodeIcon(node.type)}
                      </span>
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
                        className="hud-btn font-orbitron w-full cursor-pointer border border-[#00f0ff]/75 bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 text-xs font-extrabold tracking-wider text-white shadow-[0_0_16px_rgba(0,240,255,0.3)] transition hover:brightness-115"
                      >
                        DEPLOY NODE {node.nodeNumber} →
                      </button>
                    ) : (
                      <div className="rounded-lg border border-slate-800/80 bg-[#080c14]/60 py-2 text-center text-xs text-slate-500">
                        {isCleared
                          ? 'ผ่านด่านนี้แล้ว'
                          : 'ปลดล็อกเมื่อผ่านด่านก่อนหน้า'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
