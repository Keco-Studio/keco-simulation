/**
 * Stage / level data — reference layout inspired by classic mobile RPG tables.
 */

import type { Level, LevelType } from '../types';

/** Stage list */
export const LEVELS: Level[] = [
  {
    id: 100001,
    name: 'Enter the Three Kingdoms',
    type: 'main_story',
    cost: 'Stamina: 15',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100002,
    name: 'Battle of Sishui Pass',
    type: 'main_story',
    cost: 'Stamina: 25',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100003,
    name: 'Three Heroes Fight Lu Bu',
    type: 'main_story',
    cost: 'Stamina: 30',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100004,
    name: 'Siege of Luoyang',
    type: 'main_story',
    cost: 'Stamina: 40',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100005,
    name: "Yuan Shao's Ambition",
    type: 'main_story',
    cost: 'Stamina: 30',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100006,
    name: 'Storm in Cao Camp',
    type: 'main_story',
    cost: 'Stamina: 50',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100007,
    name: "Sun Jian's Trial",
    type: 'main_story',
    cost: 'Stamina: 50',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100008,
    name: "Cao Cao's Stratagem",
    type: 'main_story',
    cost: 'Stamina: 50',
    reward: 'Promotion gear, EXP books, advance stones, silver, hero EXP, ingots',
  },
  {
    id: 100009,
    name: 'Musou Trial',
    type: 'conquest',
    cost: 'Musou trial resets: 1',
    reward: 'Renown currency, silver, equipment chests',
  },
  {
    id: 100010,
    name: 'Liu Bei Chronicle',
    type: 'biography',
    cost: 'No cost',
    reward: 'EXP books, hero EXP, silver, unlock formation bonuses',
  },
];

/** UI labels by level type */
export const LEVEL_TYPE_CONFIG: Record<LevelType, { label: string; color: string }> = {
  main_story: { label: 'Main story', color: '#1890ff' },
  conquest: { label: 'Conquest', color: '#fa8c16' },
  biography: { label: 'Biography', color: '#52c41a' },
  musou_trial: { label: 'Musou trial', color: '#722ed1' },
};

export const STAMINA_CONFIG = {
  dailyRecovery: 120,
  recoveryInterval: 6,
  maxStamina: 120,
  recoverCost: 10,
};

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getLevelsByType(type: LevelType): Level[] {
  return LEVELS.filter((l) => l.type === type);
}

/**
 * Parse human-readable cost string from data rows.
 */
export function parseLevelCost(costStr: string): { type: string; amount: number } | null {
  if (costStr === 'No cost') {
    return { type: 'none', amount: 0 };
  }

  const staminaMatch = costStr.match(/Stamina[:\s]*(\d+)/i);
  if (staminaMatch) {
    return { type: 'stamina', amount: parseInt(staminaMatch[1], 10) };
  }

  const resetMatch = costStr.match(/resets[:\s]*(\d+)/i);
  if (resetMatch) {
    return { type: 'reset', amount: parseInt(resetMatch[1], 10) };
  }

  return null;
}

/**
 * Reward curve — aligned with the economy calculator (log / sqrt blend).
 * Formulas unchanged; only comments and copy are localized here.
 */
export function calculateLevelReward(
  level: Level,
  playerLevel: number,
  isFirstTime: boolean = false
): {
  silver: number;
  exp: number;
  gold: number;
} {
  const silverCurve = (lv: number): number => {
    if (lv <= 50) {
      return 500 + 1200 * Math.log(lv + 1);
    }
    if (lv <= 100) {
      return 2000 + 2000 * Math.sqrt(lv - 50) * 0.6;
    }
    if (lv <= 150) {
      return 3500 + 1500 * Math.sqrt(lv - 100) * 0.4 + 40 * (lv - 100);
    }
    return 5000 + 1000 * Math.sqrt(lv - 150) * 0.3 + 30 * (lv - 150);
  };

  const expCurve = (lv: number): number => {
    if (lv <= 30) {
      return 80 + 40 * Math.log(lv + 1);
    }
    if (lv <= 80) {
      return 250 + 60 * Math.sqrt(lv - 30);
    }
    if (lv <= 150) {
      return 600 + 80 * Math.log(lv - 60);
    }
    return 1200 + 100 * Math.log(lv - 120) * 0.6;
  };

  const FIRST_TIME_MULTIPLIER = 2.5;
  const REPEAT_MULTIPLIER = 1.0;
  const multiplier = isFirstTime ? FIRST_TIME_MULTIPLIER : REPEAT_MULTIPLIER;

  switch (level.type) {
    case 'main_story': {
      const silver = Math.floor(silverCurve(playerLevel) * multiplier);
      const exp = Math.floor(expCurve(playerLevel) * multiplier);
      const gold = isFirstTime ? Math.floor(50 + playerLevel * 0.5) : 10;
      return { silver, exp, gold };
    }
    case 'conquest': {
      const silver = Math.floor(silverCurve(playerLevel) * 1.3 * multiplier);
      const exp = Math.floor(expCurve(playerLevel) * 0.8 * multiplier);
      const gold = isFirstTime ? Math.floor(100 + playerLevel) : 5;
      return { silver, exp, gold };
    }
    case 'biography': {
      const silver = Math.floor(silverCurve(playerLevel) * 0.6 * multiplier);
      const exp = Math.floor(expCurve(playerLevel) * 1.5 * multiplier);
      return { silver, exp, gold: 0 };
    }
    case 'musou_trial': {
      const silver = Math.floor(silverCurve(playerLevel) * 1.5 * multiplier);
      const exp = Math.floor(expCurve(playerLevel) * 0.7 * multiplier);
      const gold = isFirstTime ? Math.floor(150 + playerLevel * 1.5) : 15;
      return { silver, exp, gold };
    }
    default:
      return { silver: 0, exp: 0, gold: 0 };
  }
}

export function calculateTotalStaminaCost(levelIds: number[]): number {
  let total = 0;
  for (const id of levelIds) {
    const level = getLevelById(id);
    if (level) {
      const cost = parseLevelCost(level.cost);
      if (cost && cost.type === 'stamina') {
        total += cost.amount;
      }
    }
  }
  return total;
}

export function calculateRecoveryTime(currentStamina: number, targetStamina: number): number {
  if (currentStamina >= targetStamina) return 0;
  const needed = targetStamina - currentStamina;
  return needed * STAMINA_CONFIG.recoveryInterval;
}

/** Human-readable duration from minutes */
export function formatRecoveryTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours > 0) {
    return `${days} d ${remainingHours} h`;
  }
  return `${days} d`;
}
