/**
 * Economy simulator — shared type definitions.
 */

// ==================== Character system ====================

/** Faction / kingdom */
export type Camp = 'Wei' | 'Shu' | 'Wu' | 'Other';

/** Rarity tier (1–3) */
export type Rarity = 1 | 2 | 3;

/** Base combat stats */
export interface CharacterBaseStats {
  atk: number;
  life: number;
  def: number;
  mdf: number;
}

/** Playable hero / unit */
export interface Character {
  id: number;
  name: string;
  rarity: Rarity;
  int: number;
  camp: Camp;
  baseStats: CharacterBaseStats;
  talentIds: number[];
  skillIds: number[];
}

/** Passive talent */
export interface Talent {
  id: number;
  name: string;
  level: number;
  effect: string;
}

/** Combat skill (economy / character sheet) */
export interface Skill {
  id: number;
  name: string;
  /** Basic attack vs rage / ultimate */
  type: 'Basic' | 'Rage';
  description: string;
}

// ==================== Equipment ====================

export type EquipmentQuality = 'Normal' | 'Advanced' | 'Mythic';

/** Display label for equipment slot index (subType) */
export type EquipmentSlot = 'Kunai' | 'Headband' | 'Chestplate' | 'Cloak' | 'Boots' | 'Belt';

export interface Equipment {
  id: number;
  name: string;
  mainType: number;
  /** 1 weapon pair, 2 head, 3 chest, 4 cloak, 5 boots, 6 belt */
  subType: number;
  level: number;
  quality: number;
  qualityText: EquipmentQuality;
  enhanceCost: number;
  craftCost: number;
  openLevel: number;
}

// ==================== Arena ====================

export interface ArenaRankData {
  rank: number;
  prestigeReward: number;
  silverReward: number;
}

export interface ArenaRewardConfig {
  dailyPurchaseCount: number;
  winRate: number;
}

// ==================== Levels ====================

export type LevelType = 'main_story' | 'conquest' | 'biography' | 'musou_trial';

export interface Level {
  id: number;
  name: string;
  type: LevelType;
  cost: string;
  reward: string;
}

// ==================== Prestige ====================

export interface PrestigeLevel {
  level: number;
  name: string;
  requiredPrestige: number;
  dailyCost: number;
  silverReward: number;
  ultimateReward: number;
  winPrestige: number;
  loseCoefficient: number;
  dailyGain: number;
}

// ==================== Player level / EXP ====================

export type LevelTier = 'beginner' | 'growth' | 'mid' | 'late' | 'end' | 'apex';

export interface PlayerLevelData {
  level: number;
  expToNext: number;
  cumulativeExp: number;
  tier: LevelTier;
}

// ==================== Calculator ====================

export interface RevenueResult {
  silver: number;
  prestige: number;
  exp: number;
  gold: number;
  equipmentChest?: number;
}

export interface CostResult {
  stamina: number;
  time: number;
}

export interface SimulatorConfig {
  playerLevel: number;
  prestigeLevel: number;
  arenaRank: number;
  dailyChallenges: number;
  winRate: number;
}

// ==================== Shared UI constants ====================

export type StatType = 'atk' | 'life' | 'def' | 'mdf';

export const STAT_CONFIG: Record<StatType, { label: string }> = {
  atk: { label: 'ATK' },
  life: { label: 'HP' },
  def: { label: 'DEF' },
  mdf: { label: 'MDF' },
};

export const QUALITY_COLORS: Record<number, string> = {
  1: '#8c8c8c',
  2: '#52c41a',
  3: '#1890ff',
  4: '#722ed1',
  5: '#fa8c16',
  6: '#f5222d',
  7: '#eb2f96',
};

export const CAMP_COLORS: Record<Camp, string> = {
  Wei: '#9c27b0',
  Shu: '#4caf50',
  Wu: '#2196f3',
  Other: '#ff9800',
};

export const RARITY_CONFIG: Record<Rarity, { label: string; color: string }> = {
  1: { label: 'Common', color: '#8c8c8c' },
  2: { label: 'Rare', color: '#1890ff' },
  3: { label: 'Epic', color: '#722ed1' },
};
