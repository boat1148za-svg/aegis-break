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
  icon: string;
  shortName: string;
  startPosition: GridPosition;
  mecha: MechaData;
  pilot: PilotData;
}

export interface ActiveSpirits {
  valor: boolean;
  focus: boolean;
  ironWall: boolean;
}

export interface BattleUnit {
  instanceId: string;
  faction: Faction;
  icon: string;
  shortName: string;
  mecha: MechaData;
  pilot: PilotData;
  position: GridPosition;
  hp: number;
  en: number;
  sp: number;
  will: number;
  ammoByWeaponId: Record<string, number>;
  hasMoved: boolean;
  hasActed: boolean;
  activeSpirits: ActiveSpirits;
}

export interface CombatPreview {
  hitRate: number;
  baseDamage: number;
  finalDamage: number;
}

export interface BattleForecast {
  attacker: BattleUnit;
  defender: BattleUnit;
  attackerWeapon: WeaponData;
  attackerPreview: CombatPreview;
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
}

export type UnitAnimationType = 'hit' | 'evade' | 'attack';

export interface StrikeResolution {
  updatedAttacker: BattleUnit;
  updatedDefender: BattleUnit;
  hit: boolean;
  damage: number;
  destroyed: boolean;
  hitRate: number;
  roll: number;
}

export interface FloatingTextEvent {
  id: string;
  position: GridPosition;
  text: string;
  variant: 'damage' | 'miss' | 'heal' | 'destroyed';
}

export interface TurnState {
  turnNumber: number;
  phase: TurnPhase;
  actionStep: PlayerActionStep;
  selectedUnitId: string | null;
}
