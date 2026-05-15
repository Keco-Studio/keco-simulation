/**
 * Prestige rank ladder — reference data inspired by ninja-rank progression systems.
 */

import type { PrestigeLevel } from '../types';

export const PRESTIGE_LEVELS: PrestigeLevel[] = [
  { level: 1, name: 'Academy Student', requiredPrestige: 0, dailyCost: 0, silverReward: 40000, ultimateReward: 100, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 2, name: 'Genin · Fang', requiredPrestige: 2000, dailyCost: 0, silverReward: 46068, ultimateReward: 100, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 3, name: 'Genin · Beast', requiredPrestige: 1200, dailyCost: 0, silverReward: 52632, ultimateReward: 150, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 4, name: 'Genin · Spirit', requiredPrestige: 1600, dailyCost: 0, silverReward: 59722, ultimateReward: 200, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 5, name: 'Genin · Vault', requiredPrestige: 2000, dailyCost: 0, silverReward: 67368, ultimateReward: 250, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 6, name: 'Genin · Demon', requiredPrestige: 2400, dailyCost: 0, silverReward: 75570, ultimateReward: 300, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 7, name: 'Chunin · Fang', requiredPrestige: 2800, dailyCost: 0, silverReward: 84448, ultimateReward: 1000, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 8, name: 'Chunin · Beast', requiredPrestige: 4000, dailyCost: 0, silverReward: 93942, ultimateReward: 1050, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 9, name: 'Chunin · Spirit', requiredPrestige: 7000, dailyCost: 0, silverReward: 104184, ultimateReward: 1100, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 10, name: 'Chunin · Vault', requiredPrestige: 10000, dailyCost: 0, silverReward: 115178, ultimateReward: 1150, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 11, name: 'Chunin · Demon', requiredPrestige: 13000, dailyCost: 0, silverReward: 126960, ultimateReward: 1200, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 12, name: 'Jonin · Fang', requiredPrestige: 16000, dailyCost: 0, silverReward: 139608, ultimateReward: 1250, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 13, name: 'Jonin · Beast', requiredPrestige: 20000, dailyCost: 0, silverReward: 153208, ultimateReward: 1300, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 14, name: 'Jonin · Spirit', requiredPrestige: 28000, dailyCost: 0, silverReward: 167716, ultimateReward: 1350, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 15, name: 'Jonin · Vault', requiredPrestige: 30000, dailyCost: 0, silverReward: 183312, ultimateReward: 1400, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 16, name: 'Jonin · Demon', requiredPrestige: 30000, dailyCost: 0, silverReward: 200000, ultimateReward: 1450, winPrestige: 200, loseCoefficient: 0.8, dailyGain: 7695 },
  { level: 17, name: 'Anbu · Fang', requiredPrestige: 40000, dailyCost: 0, silverReward: 217828, ultimateReward: 1500, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 7545 },
  { level: 18, name: 'Anbu · Beast', requiredPrestige: 60000, dailyCost: 0, silverReward: 236898, ultimateReward: 1550, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 7545 },
  { level: 19, name: 'Anbu · Spirit', requiredPrestige: 70000, dailyCost: 0, silverReward: 257264, ultimateReward: 1600, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 7545 },
  { level: 20, name: 'Anbu · Vault', requiredPrestige: 80000, dailyCost: 0, silverReward: 279096, ultimateReward: 1650, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 7545 },
  { level: 21, name: 'Anbu · Demon', requiredPrestige: 90000, dailyCost: 0, silverReward: 302340, ultimateReward: 1700, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 7545 },
  { level: 22, name: 'Kage · Fang', requiredPrestige: 100000, dailyCost: 6000, silverReward: 327236, ultimateReward: 1750, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 1545 },
  { level: 23, name: 'Kage · Beast', requiredPrestige: 120000, dailyCost: 6000, silverReward: 353728, ultimateReward: 1800, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 1545 },
  { level: 24, name: 'Kage · Spirit', requiredPrestige: 140000, dailyCost: 6000, silverReward: 382074, ultimateReward: 1850, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 1545 },
  { level: 25, name: 'Kage · Vault', requiredPrestige: 230000, dailyCost: 6000, silverReward: 412216, ultimateReward: 1900, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 1545 },
  { level: 26, name: 'Kage · Demon', requiredPrestige: 200000, dailyCost: 6000, silverReward: 444430, ultimateReward: 1950, winPrestige: 200, loseCoefficient: 0.7, dailyGain: 1545 },
  { level: 27, name: 'Shadow Under the Tree', requiredPrestige: 200000, dailyCost: 8000, silverReward: 478728, ultimateReward: 2000, winPrestige: 200, loseCoefficient: 0.6, dailyGain: -605 },
  { level: 28, name: 'Azure Beast', requiredPrestige: 300000, dailyCost: 8000, silverReward: 515336, ultimateReward: 2050, winPrestige: 200, loseCoefficient: 0.6, dailyGain: -605 },
  { level: 29, name: 'Wood Style Archivist', requiredPrestige: 300000, dailyCost: 8000, silverReward: 554268, ultimateReward: 2100, winPrestige: 200, loseCoefficient: 0.6, dailyGain: -605 },
  { level: 30, name: 'White Fang of the Leaf', requiredPrestige: 400000, dailyCost: 10000, silverReward: 595764, ultimateReward: 2150, winPrestige: 200, loseCoefficient: 0.6, dailyGain: -2605 },
  { level: 31, name: 'Toad Sage', requiredPrestige: 400000, dailyCost: 10000, silverReward: 640000, ultimateReward: 2200, winPrestige: 200, loseCoefficient: 0.6, dailyGain: -2605 },
  { level: 32, name: 'Sword of the Void', requiredPrestige: 400000, dailyCost: 12000, silverReward: 686996, ultimateReward: 2250, winPrestige: 200, loseCoefficient: 0.5, dailyGain: -4755 },
  { level: 33, name: 'Paradise Novel', requiredPrestige: 500000, dailyCost: 16000, silverReward: 737016, ultimateReward: 2300, winPrestige: 200, loseCoefficient: 0.5, dailyGain: -8755 },
  { level: 34, name: 'Yellow Flash', requiredPrestige: 500000, dailyCost: 20000, silverReward: 790254, ultimateReward: 2350, winPrestige: 200, loseCoefficient: 0.5, dailyGain: -12755 },
  { level: 35, name: 'Thousand Hands of the Forest', requiredPrestige: 600000, dailyCost: 25000, silverReward: 846912, ultimateReward: 2400, winPrestige: 200, loseCoefficient: 0.5, dailyGain: -17755 },
  { level: 36, name: 'Six Paths', requiredPrestige: 600000, dailyCost: 30000, silverReward: 1154880, ultimateReward: 2500, winPrestige: 200, loseCoefficient: 0.5, dailyGain: -22755 },
];

export const PRESTIGE_TIERS = {
  trainee: { minLevel: 1, maxLevel: 6, label: 'Trainee', color: '#8c8c8c' },
  chunin: { minLevel: 7, maxLevel: 11, label: 'Chunin', color: '#52c41a' },
  jonin: { minLevel: 12, maxLevel: 16, label: 'Jonin', color: '#1890ff' },
  anbu: { minLevel: 17, maxLevel: 21, label: 'Anbu', color: '#722ed1' },
  kage: { minLevel: 22, maxLevel: 26, label: 'Kage', color: '#fa8c16' },
  legend: { minLevel: 27, maxLevel: 36, label: 'Legend', color: '#eb2f96' },
};

export function getPrestigeLevelByLevel(level: number): PrestigeLevel | undefined {
  return PRESTIGE_LEVELS.find((p) => p.level === level);
}

export function getCurrentPrestigeInfo(currentPrestige: number): {
  currentLevel: number;
  currentName: string;
  nextLevel: number;
  nextName: string;
  progress: number;
  requiredPrestige: number;
} {
  let currentLevel = 1;
  let currentName = PRESTIGE_LEVELS[0].name;

  for (let i = PRESTIGE_LEVELS.length - 1; i >= 0; i--) {
    if (currentPrestige >= PRESTIGE_LEVELS[i].requiredPrestige) {
      currentLevel = PRESTIGE_LEVELS[i].level;
      currentName = PRESTIGE_LEVELS[i].name;
      break;
    }
  }

  const currentIndex = PRESTIGE_LEVELS.findIndex((p) => p.level === currentLevel);
  const nextLevel =
    currentIndex < PRESTIGE_LEVELS.length - 1 ? PRESTIGE_LEVELS[currentIndex + 1].level : currentLevel;
  const nextName =
    currentIndex < PRESTIGE_LEVELS.length - 1 ? PRESTIGE_LEVELS[currentIndex + 1].name : currentName;
  const requiredPrestige =
    currentIndex < PRESTIGE_LEVELS.length - 1 ? PRESTIGE_LEVELS[currentIndex + 1].requiredPrestige : 0;

  const currentRequired = PRESTIGE_LEVELS[currentIndex].requiredPrestige;
  const progress =
    requiredPrestige > 0
      ? Math.min(1, (currentPrestige - currentRequired) / (requiredPrestige - currentRequired))
      : 1;

  return {
    currentLevel,
    currentName,
    nextLevel,
    nextName,
    progress,
    requiredPrestige,
  };
}

export function calculatePrestigeRequired(targetLevel: number): number {
  const targetData = getPrestigeLevelByLevel(targetLevel);
  return targetData?.requiredPrestige || 0;
}

export function calculateDailyPrestigeGain(level: number, challenges: number, winRate: number): number {
  const prestigeData = getPrestigeLevelByLevel(level);
  if (!prestigeData) return 0;

  const baseDaily = prestigeData.dailyGain;
  const arenaPrestige = challenges * winRate * prestigeData.winPrestige;

  return Math.floor(baseDaily + arenaPrestige);
}

export function getPrestigeTier(level: number): (typeof PRESTIGE_TIERS)[keyof typeof PRESTIGE_TIERS] | null {
  if (level >= PRESTIGE_TIERS.trainee.minLevel && level <= PRESTIGE_TIERS.trainee.maxLevel) {
    return PRESTIGE_TIERS.trainee;
  }
  if (level >= PRESTIGE_TIERS.chunin.minLevel && level <= PRESTIGE_TIERS.chunin.maxLevel) {
    return PRESTIGE_TIERS.chunin;
  }
  if (level >= PRESTIGE_TIERS.jonin.minLevel && level <= PRESTIGE_TIERS.jonin.maxLevel) {
    return PRESTIGE_TIERS.jonin;
  }
  if (level >= PRESTIGE_TIERS.anbu.minLevel && level <= PRESTIGE_TIERS.anbu.maxLevel) {
    return PRESTIGE_TIERS.anbu;
  }
  if (level >= PRESTIGE_TIERS.kage.minLevel && level <= PRESTIGE_TIERS.kage.maxLevel) {
    return PRESTIGE_TIERS.kage;
  }
  if (level >= PRESTIGE_TIERS.legend.minLevel && level <= PRESTIGE_TIERS.legend.maxLevel) {
    return PRESTIGE_TIERS.legend;
  }
  return null;
}
