import type { Skill } from '@/app/simulation-system/battle/types';
import type {
  CharLevelCurveRow,
  EffectiveBattleLoadout,
  SkillLevelCurveRow,
  StudioCharacterRow,
  StudioProgressionBundle,
  UserProgression,
  UserSkillLevel,
} from './types';

/** Apply skill level curve rows onto base Studio skill definition. */
export function applyLevelBonus(
  base: Skill,
  skillLevel: number,
  curveByLevel: Map<number, SkillLevelCurveRow>,
): Skill {
  if (skillLevel <= 0) {
    return { ...base };
  }

  let power = base.power;
  let mpCost = base.mpCost;
  let maxCooldown = base.maxCooldown;

  for (let lv = 1; lv <= skillLevel; lv += 1) {
    const row = curveByLevel.get(lv);
    if (!row) continue;
    if (row.powerBonus != null) power += row.powerBonus;
    if (row.mpCostDelta != null) mpCost += row.mpCostDelta;
    if (row.cooldownDelta != null) maxCooldown += row.cooldownDelta;
  }

  return {
    ...base,
    power,
    mpCost: Math.max(0, mpCost),
    maxCooldown: Math.max(0, maxCooldown),
    cooldown: Math.min(base.cooldown, Math.max(0, maxCooldown)),
  };
}

/** P1: pass-through base stats; char level gates unlocks only. */
export function applyCharLevel(
  base: StudioCharacterRow,
  _charLevel: number,
  _curve: CharLevelCurveRow[],
): { maxHp: number; atk: number; def: number; spd: number; maxMp: number } {
  return {
    maxHp: base.hp,
    atk: base.atk,
    def: base.def,
    spd: base.spd,
    maxMp: base.mp,
  };
}

/** Compute exp from a kill with level-diff modifier. */
export function calcKillExp(input: {
  baseExp: number;
  playerLevel: number;
  monsterLevel: number;
  expRateMultiplier?: number;
}): number {
  const { baseExp, playerLevel, monsterLevel } = input;
  const delta = monsterLevel - playerLevel;
  let multiplier: number;

  if (delta > 0) {
    multiplier = Math.min(1.5, 1 + delta * 0.05);
  } else if (delta < 0) {
    multiplier = Math.max(0.05, 1 + delta * 0.15);
  } else {
    multiplier = 1;
  }

  const rate = input.expRateMultiplier ?? 1;
  return Math.max(1, Math.round(baseExp * multiplier * rate));
}

/** Apply gained exp in-memory; returns new progression + meta. */
export function accrueCharacterExp(
  prog: Pick<UserProgression, 'level' | 'exp' | 'skillPoints'>,
  gainedExp: number,
  curve: CharLevelCurveRow[],
): {
  progression: Pick<UserProgression, 'level' | 'exp' | 'skillPoints'>;
  leveledUp: boolean;
  levelsGained: number;
  spGranted: number;
} {
  const sorted = [...curve].sort((a, b) => a.level - b.level);
  const maxLevel = sorted.length > 0 ? sorted[sorted.length - 1].level : prog.level;
  const needExpByLevel = new Map(sorted.map((row) => [row.level, row.needExp]));
  const grantSpByLevel = new Map(sorted.map((row) => [row.level, row.grantSp]));

  let level = prog.level;
  let exp = prog.exp + gainedExp;
  let skillPoints = prog.skillPoints;
  let levelsGained = 0;
  let spGranted = 0;

  while (level < maxLevel) {
    const nextLevel = level + 1;
    const needExp = needExpByLevel.get(nextLevel);
    if (needExp == null || exp < needExp) break;

    level = nextLevel;
    levelsGained += 1;
    const grant = grantSpByLevel.get(nextLevel) ?? 0;
    skillPoints += grant;
    spGranted += grant;
  }

  return {
    progression: { level, exp, skillPoints },
    leveledUp: levelsGained > 0,
    levelsGained,
    spGranted,
  };
}

/** Resolve SP cost to upgrade skill from currentLevel to currentLevel + 1. */
export function resolveUpgradeCost(
  skillId: string,
  currentLevel: number,
  curve: SkillLevelCurveRow[],
): number | null {
  const targetLevel = currentLevel + 1;
  const row = curve.find((r) => r.skillId === skillId && r.level === targetLevel);
  return row?.costSp ?? null;
}

function skillLevelCurveMap(
  skillId: string,
  curve: SkillLevelCurveRow[],
): Map<number, SkillLevelCurveRow> {
  return new Map(
    curve.filter((r) => r.skillId === skillId).map((r) => [r.level, r]),
  );
}

/** Build effective loadout for BattleArena. */
export function buildEffectiveLoadout(input: {
  progression: UserProgression;
  skillLevels: UserSkillLevel[];
  studio: StudioProgressionBundle;
}): EffectiveBattleLoadout {
  const { progression, skillLevels, studio } = input;
  const assetId = progression.characterAssetId;
  if (!assetId) {
    throw new Error('No character asset bound to progression');
  }

  const character = studio.characters[assetId];
  if (!character) {
    throw new Error(`Character asset not found: ${assetId}`);
  }

  const levelBySkillId = new Map(skillLevels.map((s) => [s.skillId, s.level]));
  const skillLevelsOut: Record<string, number> = {};
  const skills: Skill[] = [];

  for (const skillId of character.skillIds) {
    const base = studio.skills[skillId];
    if (!base) continue;

    const allocatedLevel = levelBySkillId.get(skillId) ?? 0;
    if (allocatedLevel > 0) {
      skillLevelsOut[skillId] = allocatedLevel;
    }

    skills.push(
      applyLevelBonus(
        base,
        allocatedLevel,
        skillLevelCurveMap(skillId, studio.skillLevelCurve),
      ),
    );
  }

  const stats = applyCharLevel(character, progression.level, studio.charLevelCurve);

  return {
    character: {
      name: character.name,
      stats,
      level: progression.level,
      exp: progression.exp,
      skillPoints: progression.skillPoints,
    },
    skills,
    skillLevels: skillLevelsOut,
  };
}
