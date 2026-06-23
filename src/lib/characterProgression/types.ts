import type { Skill } from '@/app/simulation-system/battle/types';

export interface UserProgression {
  userId: string;
  characterAssetId: string | null;
  characterLibraryId: string | null;
  level: number;
  exp: number;
  skillPoints: number;
  updatedAt: string;
}

export interface UserSkillLevel {
  skillId: string;
  level: number;
  spentSp: number;
}

export interface StudioCharacterRow {
  assetId: string;
  characterId: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mp: number;
  skillIds: string[];
}

export interface CharLevelCurveRow {
  level: number;
  needExp: number;
  grantSp: number;
}

export interface SkillLevelCurveRow {
  skillId: string;
  level: number;
  costSp: number;
  powerBonus?: number;
  mpCostDelta?: number;
  cooldownDelta?: number;
}

export interface StudioProgressionBundle {
  characters: Record<string, StudioCharacterRow>;
  skills: Record<string, Skill>;
  charLevelCurve: CharLevelCurveRow[];
  skillLevelCurve: SkillLevelCurveRow[];
}

export interface ApplyBattleExpResult {
  progression: UserProgression;
  leveledUp: boolean;
  levelsGained: number;
  spGranted: number;
  expGained: number;
}

export interface EffectiveBattleLoadout {
  character: {
    name: string;
    stats: { maxHp: number; atk: number; def: number; spd: number; maxMp: number };
    level: number;
    exp: number;
    skillPoints: number;
  };
  skills: Skill[];
  skillLevels: Record<string, number>;
}
