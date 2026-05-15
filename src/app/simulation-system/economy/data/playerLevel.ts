/**
 * Player level / experience table (1–200).
 * Piecewise curve: diminishing returns early, steeper cost at apex.
 */

import type { PlayerLevelData } from '../types';

export type ExpCurveModel = 'logarithmic' | 'sqrt' | 'linear' | 'exponential';

export const EXP_CURVE_STAGES = {
  beginner: { 
    minLevel: 1, 
    maxLevel: 30, 
    label: 'Beginner', 
    model: 'logarithmic' as ExpCurveModel,
    baseExp: 50,
    growthFactor: 1.08,
  },
  growth: { 
    minLevel: 31, 
    maxLevel: 60, 
    label: 'Growth', 
    model: 'sqrt' as ExpCurveModel,
    baseExp: 300,
    growthFactor: 1.15,
  },
  mid: { 
    minLevel: 61, 
    maxLevel: 100, 
    label: 'Mid', 
    model: 'sqrt' as ExpCurveModel,
    baseExp: 1500,
    growthFactor: 1.20,
  },
  late: { 
    minLevel: 101, 
    maxLevel: 140, 
    label: 'Late', 
    model: 'linear' as ExpCurveModel,
    baseExp: 8000,
    growthFactor: 1.25,
  },
  end: { 
    minLevel: 141, 
    maxLevel: 170, 
    label: 'Endgame', 
    model: 'linear' as ExpCurveModel,
    baseExp: 50000,
    growthFactor: 1.35,
  },
  apex: { 
    minLevel: 171, 
    maxLevel: 200, 
    label: 'Apex', 
    model: 'exponential' as ExpCurveModel,
    baseExp: 300000,
    growthFactor: 1.45,
  },
} as const;

/** Per-level EXP for a row in the ladder. */
function calculateExpForLevel(
  level: number, 
  stage: typeof EXP_CURVE_STAGES[keyof typeof EXP_CURVE_STAGES],
  levelInStage: number
): number {
  const { model, baseExp, growthFactor } = stage;
  
  switch (model) {
    case 'logarithmic':
      return Math.floor(baseExp * (1 + Math.log(level) * growthFactor));
    
    case 'sqrt':
      return Math.floor(baseExp * (1 + Math.sqrt(levelInStage + 1) * growthFactor));
    
    case 'linear':
      return Math.floor(baseExp * (1 + levelInStage * growthFactor / 10));
    
    case 'exponential':
      return Math.floor(baseExp * Math.pow(growthFactor, levelInStage));
    
    default:
      return Math.floor(baseExp * growthFactor);
  }
}

export const PLAYER_LEVELS: PlayerLevelData[] = [];

/** Build `PLAYER_LEVELS` once at module load. */
function generateLevelExpTable(): void {
  let cumulativeExp = 0;
  
  for (let level = 1; level <= 200; level++) {
    const stage = getExpCurveStage(level);
    const levelInStage = level - stage.minLevel;
    
    let expForLevel = calculateExpForLevel(level, stage, levelInStage);
    
    // Keep EXP monotonic if a segment dips
    const lastLevelExp = PLAYER_LEVELS.length > 0 
      ? PLAYER_LEVELS[PLAYER_LEVELS.length - 1].expToNext 
      : 0;
    if (expForLevel < lastLevelExp * 0.9) {
      expForLevel = Math.floor(lastLevelExp * 1.08);
    }
    
    cumulativeExp += expForLevel;
    
    PLAYER_LEVELS.push({
      level,
      expToNext: expForLevel,
      cumulativeExp,
      tier: getLevelTier(level),
    });
  }
}

export function getExpCurveStage(level: number): typeof EXP_CURVE_STAGES[keyof typeof EXP_CURVE_STAGES] {
  if (level <= 30) return EXP_CURVE_STAGES.beginner;
  if (level <= 60) return EXP_CURVE_STAGES.growth;
  if (level <= 100) return EXP_CURVE_STAGES.mid;
  if (level <= 140) return EXP_CURVE_STAGES.late;
  if (level <= 170) return EXP_CURVE_STAGES.end;
  return EXP_CURVE_STAGES.apex;
}

export const LEVEL_TIERS = {
  beginner: { minLevel: 1, maxLevel: 30, label: 'Beginner' },
  growth: { minLevel: 31, maxLevel: 60, label: 'Growth' },
  mid: { minLevel: 61, maxLevel: 100, label: 'Mid' },
  late: { minLevel: 101, maxLevel: 140, label: 'Late' },
  end: { minLevel: 141, maxLevel: 170, label: 'Endgame' },
  apex: { minLevel: 171, maxLevel: 200, label: 'Apex' },
} as const;

export function getLevelTier(level: number): keyof typeof LEVEL_TIERS {
  if (level <= 30) return 'beginner';
  if (level <= 60) return 'growth';
  if (level <= 100) return 'mid';
  if (level <= 140) return 'late';
  if (level <= 170) return 'end';
  return 'apex';
}

export function getTierConfig(tier: keyof typeof LEVEL_TIERS) {
  return LEVEL_TIERS[tier];
}

export function getLevelData(level: number): PlayerLevelData | undefined {
  if (level < 1 || level > 200) return undefined;
  return PLAYER_LEVELS[level - 1];
}

export function getLevelByExp(totalExp: number): number {
  if (totalExp <= 0) return 1;
  
  let low = 1;
  let high = 200;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const levelData = PLAYER_LEVELS[mid - 1];
    
    if (levelData.cumulativeExp <= totalExp) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  return low;
}

export function calcExpToLevel(currentLevel: number, targetLevel: number): number {
  if (currentLevel >= targetLevel) return 0;
  
  let total = 0;
  for (let lv = currentLevel + 1; lv <= targetLevel; lv++) {
    const levelData = getLevelData(lv);
    if (levelData) {
      total += levelData.expToNext;
    }
  }
  return total;
}

export function calcLevelProgress(currentLevel: number, currentExp: number): {
  progress: number;
  expToNext: number;
  expGained: number;
  expNeeded: number;
} {
  const levelData = getLevelData(currentLevel);
  if (!levelData) {
    return { progress: 1, expToNext: 0, expGained: 0, expNeeded: 0 };
  }
  
  const levelStartExp = currentLevel > 1 
    ? PLAYER_LEVELS[currentLevel - 2].cumulativeExp 
    : 0;
  
  const expGained = currentExp - levelStartExp;
  const expToNext = levelData.expToNext;
  const progress = Math.min(1, expGained / expToNext);
  const expNeeded = Math.max(0, expToNext - expGained);
  
  return { progress, expToNext, expGained, expNeeded };
}

export function calcDailyExp(
  playerLevel: number,
  dailyStamina: number,
  staminaPerLevel: number
): number {
  const levelData = getLevelData(playerLevel);
  const tier = levelData?.tier || 'beginner';
  
  const tierMultipliers: Record<keyof typeof LEVEL_TIERS, number> = {
    beginner: 1.0,
    growth: 1.3,
    mid: 1.8,
    late: 2.5,
    end: 3.5,
    apex: 5.0,
  };
  
  const baseExpPerStamina = 8;
  
  const dailyRuns = Math.floor(dailyStamina / staminaPerLevel);
  
  const baseExp = dailyRuns * staminaPerLevel * baseExpPerStamina;
  
  return Math.floor(baseExp * tierMultipliers[tier]);
}

export function estimateDaysToLevel(currentLevel: number, dailyExp: number): number {
  if (dailyExp <= 0) return Infinity;
  
  const targetLevel = Math.min(currentLevel + 1, 200);
  const expNeeded = calcExpToLevel(currentLevel, targetLevel);
  
  return Math.ceil(expNeeded / dailyExp);
}

export function formatExp(exp: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(exp);
}

export function getTierColor(tier: keyof typeof LEVEL_TIERS): string {
  const colors: Record<keyof typeof LEVEL_TIERS, string> = {
    beginner: '#52c41a',
    growth: '#1890ff',
    mid: '#722ed1',
    late: '#fa8c16',
    end: '#f5222d',
    apex: '#eb2f96',
  };
  return colors[tier];
}

generateLevelExpTable();

export const EXP_CURVE_STATS = {
  totalExpToMax: PLAYER_LEVELS[199]?.cumulativeExp || 0,
  
  tierExpRatio: (() => {
    const tiers: Record<string, { levels: number; totalExp: number; ratio: number }> = {};
    const total = PLAYER_LEVELS[199]?.cumulativeExp || 1;
    
    for (const key of Object.keys(LEVEL_TIERS) as (keyof typeof LEVEL_TIERS)[]) {
      const config = LEVEL_TIERS[key];
      let tierExp = 0;
      
      for (let lv = config.minLevel; lv <= config.maxLevel; lv++) {
        const data = getLevelData(lv);
        if (data) tierExp += data.expToNext;
      }
      
      tiers[key] = {
        levels: config.maxLevel - config.minLevel + 1,
        totalExp: tierExp,
        ratio: tierExp / total,
      };
    }
    
    return tiers;
  })(),
};
