export type Faction = 'player' | 'enemy';

export type TerrainId = 'normal' | 'repair_zone' | 'obstacle';

export type WeaponType = 'melee' | 'ranged';

export type DefenseAction = 'counter' | 'defend' | 'evade';

export type TurnPhase = 'PLAYER_PHASE' | 'ENEMY_PHASE';

export type PlayerActionStep =
  | 'IDLE'
  | 'UNIT_SELECTED'
  | 'MOVE_SELECT'
  | 'ACTION_MENU'
  | 'TARGET_SELECT'
  | 'COUNTER_PROMPT'
  | 'RESOLVING';

export interface GridPosition {
  row: number;
  col: number;
}

export interface TerrainConfig {
  id: TerrainId;
  name: string;
  label: string;
  walkable: boolean;
  blocksRanged: boolean;
  hpRegenPercent: number;
  enRegenPercent: number;
  evadeBonus: number;
}

export interface StageMapData {
  id: string;
  name: string;
  rows: number;
  cols: number;
  tiles: TerrainId[][];
}

export interface WeaponData {
  id: string;
  name: string;
  type: WeaponType;
  power: number;
  accuracy: number;
  minRange: number;
  maxRange: number;
  enCost: number;
  ammo: number | null;
  willRequired: number;
  armorBreakAmount?: number;
  armorPiercePercent?: number;
  mobilityDebuffAmount?: number;
  critBonus?: number;
  knockback?: number;
  is_map_weapon?: boolean;
  mapLength?: number;
  allowed_mechas?: string[];
  signatureMechaName?: string;
  description?: string;
  level?: number;
}

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export interface DangerZoneState {
  id: string;
  casterId: string;
  casterName: string;
  weapon: WeaponData;
  row: number;
  tiles: GridPosition[];
}

export interface RepairSkillData {
  id: string;
  name: string;
  range: number;
  healPercent: number;
  enCost: number;
}

export interface SpiritCommandEffects {
  damageMultiplier?: number;
  hitBonus?: number;
  evadeBonus?: number;
  damageTakenMultiplier?: number;
  healHpPercent?: number;
}

export interface SpiritCommandData {
  id: string;
  name: string;
  nameTh: string;
  icon?: string;
  spCost: number;
  duration: 'next_attack' | 'until_enemy_phase_end' | 'instant';
  target: 'self' | 'ally';
  description: string;
  effects: SpiritCommandEffects;
}

export interface MechaData {
  id: string;
  name: string;
  faction: Faction;
  maxHp: number;
  maxEn: number;
  armor: number;
  mobility: number;
  move: number;
  weaponIds: string[];
  weapons?: WeaponData[];
  repairSkill?: RepairSkillData;
  hasDangerZoneSkill?: boolean;
  dangerZoneWeapon?: WeaponData;
  hitAndAwaySteps?: number;
}

export interface PilotData {
  id: string;
  name: string;
  faction: Faction;
  melee: number;
  ranged: number;
  accuracy: number;
  evade: number;
  maxSp: number;
  spiritCommandIds: string[];
}

export interface UnitDefinition {
  instanceId: string;
  faction: Faction;
  stage?: 1 | 2 | 3;
  enemyRole?: 'standard' | 'elite' | 'boss';
  isSupportAlly?: boolean;
  archetype?: string;
  description?: string;
  icon: string;
  shortName: string;
  startPosition: GridPosition;
  mecha: MechaData;
  pilot: PilotData;
}

export type ScreenView =
  | 'TITLE'
  | 'HANGAR'
  | 'NODE_MAP'
  | 'BATTLE'
  | 'EVENT'
  | 'RUN_END';

export interface MetaUpgradeEffect {
  hpBonus?: number;
  spBonus?: number;
  armorBonus?: number;
  unlockSupportMech?: boolean;
}

export interface MetaUpgradeData {
  id: string;
  name: string;
  nameTh: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  effectPerLevel: MetaUpgradeEffect;
}

export interface ThreatLevelData {
  level: number;
  name: string;
  badge: string;
  description: string;
  enemyHpBonusPercent: number;
  enemyArmorBonus: number;
  enemyStartWill: number;
  bossSpecialSkill: boolean;
  bossRegenPercent: number;
  shardMultiplier: number;
}

export interface MetaProgressState {
  astralShards: number;
  upgradeLevels: Record<string, number>;
  totalRuns: number;
  victories: number;
  maxUnlockedThreatLevel: number;
}

export interface MetaBonuses {
  hpBonus: number;
  spBonus: number;
  armorBonus: number;
  unlockSupportMech: boolean;
}

export interface RunSummaryData {
  outcome: 'victory' | 'defeat';
  unitDefId: string;
  threatLevel: number;
  unlockedNewThreatLevel: number | null;
  nodesCleared: number;
  totalNodes: number;
  installedUpgradeCount: number;
  shardsFromNodes: number;
  bonusShards: number;
  shardMultiplier: number;
  totalShardsEarned: number;
  newTotalShards: number;
}

export type NodeType =
  | 'standard_battle'
  | 'repair_event'
  | 'elite_battle'
  | 'repair_supply'
  | 'hard_battle'
  | 'boss_battle';

export interface EnemySpawnConfig {
  templateId: string;
  labelSuffix: string;
  position: GridPosition;
}

export interface NodeEventConfig {
  repairHpPercent?: number;
  repairEnPercent?: number;
  restoreSpPercent?: number;
  trainMaxWillBonus?: number;
  recruitAllyId?: string;
}

export interface RunNodeData {
  id: string;
  nodeNumber: number;
  title: string;
  type: NodeType;
  typeLabel: string;
  description: string;
  enemySpawns?: EnemySpawnConfig[];
  eventConfig?: NodeEventConfig;
  stage?: 1 | 2 | 3;
  floor?: number;
  lane?: number;
  laneCount?: number;
  nextNodeIds?: string[];
}

export interface BranchingMapNode extends RunNodeData {
  stage: 1 | 2 | 3;
  floor: number;
  lane: number;
  laneCount: number;
  nextNodeIds: string[];
}

export interface BranchingStageMap {
  stage: 1 | 2 | 3;
  stageTitle: string;
  seed: number;
  floors: BranchingMapNode[][];
  nodesById: Record<string, BranchingMapNode>;
}

export type UpgradeCategory = 'power_parts' | 'weapon_tech' | 'tactical_chips';

export interface UpgradeEffects {
  maxHpBonus?: number;
  maxEnBonus?: number;
  armorBonus?: number;
  mobilityBonus?: number;
  moveBonus?: number;
  weaponPowerBonus?: number;
  weaponAccuracyBonus?: number;
  finisherEnDiscountPercent?: number;
  spiritEnRegen?: number;
  willThreshold?: number;
  hotBloodedDamagePercent?: number;
  vampireHealPercent?: number;
  counterDamagePercent?: number;
}

export interface UpgradeCardData {
  id: string;
  name: string;
  nameTh: string;
  category: UpgradeCategory;
  categoryLabel: string;
  icon: string;
  unique: boolean;
  description: string;
  effects: UpgradeEffects;
}

export type DraftChoice =
  | { kind: 'upgrade'; card: UpgradeCardData }
  | { kind: 'weapon'; weapon: WeaponData }
  | {
      kind: 'weapon_rankup';
      weapon: WeaponData;
      nextLevel: number;
      powerDelta: number;
      enDelta: number;
    };

export interface RunPlayerState {
  unitDefId: string;
  hp: number;
  en: number;
  sp: number;
  maxWillBonus: number;
  installedUpgradeIds: string[];
  equippedWeapons: WeaponData[];
  squadAllyIds: string[];
}

export interface ActiveSpirits {
  valor: boolean;
  focus: boolean;
  ironWall: boolean;
}

export interface BattleUnit {
  instanceId: string;
  faction: Faction;
  isMainUnit?: boolean;
  icon: string;
  shortName: string;
  mecha: MechaData;
  pilot: PilotData;
  position: GridPosition;
  hp: number;
  en: number;
  sp: number;
  will: number;
  maxWill: number;
  ammoByWeaponId: Record<string, number>;
  hasMoved: boolean;
  hasActed: boolean;
  facing?: 'left' | 'right';
  bossPhase2?: boolean;
  stunned?: boolean;
  momentumUsedThisTurn?: boolean;
  momentumMoveLimit?: number | null;
  overLimitActive?: boolean;
  overLimitUsedThisTurn?: boolean;
  activeSpirits: ActiveSpirits;
  installedUpgradeIds: string[];
}

export interface NarrativeEventChoiceEffects {
  hpChangePercent?: number;
  enChangePercent?: number;
  spChangePercent?: number;
  maxWillBonus?: number;
  grantShards?: number;
  grantRandomCategory?: UpgradeCategory;
  triggerAmbushBattle?: boolean;
  rewardAllyId?: string;
  fallbackShards?: number;
}

export interface NarrativeEventChoice {
  id: string;
  label: string;
  riskTag: string;
  description: string;
  effects: NarrativeEventChoiceEffects;
}

export interface NarrativeEventData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  choices: NarrativeEventChoice[];
}

export interface CombatPreview {
  hitRate: number;
  critRate: number;
  baseDamage: number;
  finalDamage: number;
}

export interface SupportAttackPreview {
  ally: BattleUnit;
  weapon: WeaponData;
  preview: CombatPreview;
}

export interface BattleForecast {
  attacker: BattleUnit;
  defender: BattleUnit;
  attackerWeapon: WeaponData;
  attackerPreview: CombatPreview;
  supportAttack: SupportAttackPreview | null;
  defenderCounterWeapon: WeaponData | null;
  defenderPreview: CombatPreview | null;
}

export interface CounterPromptData {
  enemy: BattleUnit;
  player: BattleUnit;
  enemyWeapon: WeaponData;
  enemyPreviewCounter: CombatPreview;
  enemyPreviewDefend: CombatPreview;
  enemyPreviewEvade: CombatPreview;
  playerCounterWeapon: WeaponData | null;
  playerCounterPreview: CombatPreview | null;
  supportDefender: BattleUnit | null;
  supportDefenderPreview: CombatPreview | null;
}

export type UnitAnimationType = 'hit' | 'evade' | 'attack';

export interface StrikeResolution {
  updatedAttacker: BattleUnit;
  updatedDefender: BattleUnit;
  hit: boolean;
  isCrit: boolean;
  damage: number;
  destroyed: boolean;
  hitRate: number;
  roll: number;
  vampireHealed: number;
  armorBroken: number;
  mobilityDebuffed: number;
}

export interface KnockbackResult {
  updatedUnits: BattleUnit[];
  pushed: boolean;
  finalPosition: GridPosition;
  stepsMoved: number;
  collided: boolean;
  collisionType: 'none' | 'obstacle' | 'border' | 'unit';
  collidedUnit: BattleUnit | null;
  collisionDamage: number;
  targetDestroyedByCollision: boolean;
  collidedUnitDestroyed: boolean;
}

export interface FloatingTextEvent {
  id: string;
  position: GridPosition;
  text: string;
  variant: 'damage' | 'miss' | 'heal' | 'destroyed' | 'collision';
}

export interface TurnState {
  turnNumber: number;
  phase: TurnPhase;
  actionStep: PlayerActionStep;
  selectedUnitId: string | null;
}
