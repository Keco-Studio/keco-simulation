import type { Skill } from '../../types';

type ProgressionForLoadoutKey = {
  characterAssetId: string | null;
  level: number;
  exp: number;
};

type EffectiveLoadoutForKey = {
  character: {
    name: string;
    stats: {
      maxHp: number;
      atk: number;
      def: number;
      spd: number;
      maxMp: number;
    };
  };
  skills: Pick<Skill, 'id' | 'name' | 'power' | 'mpCost' | 'cooldown' | 'maxCooldown'>[];
};

type SkillLevelForKey = {
  skillId: string;
  level: number;
};

export function buildCloudLoadoutSyncKey(input: {
  progression: ProgressionForLoadoutKey | null;
  effectiveLoadout: EffectiveLoadoutForKey | null;
  skillLevels: SkillLevelForKey[];
}): string | null {
  const { progression, effectiveLoadout, skillLevels } = input;
  if (!progression || !effectiveLoadout) return null;

  const stats = effectiveLoadout.character.stats;
  const characterPart = [
    progression.characterAssetId ?? '',
    progression.level,
    progression.exp,
    effectiveLoadout.character.name,
    stats.maxHp,
    stats.atk,
    stats.def,
    stats.spd,
    stats.maxMp,
  ].join(':');

  const skillLevelPart = [...skillLevels]
    .sort((a, b) => a.skillId.localeCompare(b.skillId))
    .map((s) => `${s.skillId}:${s.level}`)
    .join(',');

  const skillPart = [...effectiveLoadout.skills]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => `${s.id}:${s.name}:${s.power}:${s.mpCost}:${s.cooldown}:${s.maxCooldown}`)
    .join(',');

  return `${characterPart}|levels=${skillLevelPart}|skills=${skillPart}`;
}
