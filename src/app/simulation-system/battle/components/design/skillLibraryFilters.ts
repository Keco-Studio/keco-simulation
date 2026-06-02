import type { Skill } from '../../types';

export type SkillLibraryTab = 'all' | 'visual' | 'base' | 'battle' | 'item';

export function filterSkillsByLibraryTab(skills: Skill[], tab: SkillLibraryTab): Skill[] {
  if (tab === 'all') return skills;
  if (tab === 'visual') return skills.filter((s) => Boolean(s.description?.trim()));
  if (tab === 'base') return skills.filter((s) => s.power > 0 || s.mpCost > 0);
  if (tab === 'battle') {
    return skills.filter(
      (s) =>
        Boolean(s.attachElement) ||
        Boolean(s.reactionTrigger?.length) ||
        Boolean(s.dot) ||
        Boolean(s.crowdControl),
    );
  }
  if (tab === 'item') return skills.filter((s) => s.type === 'heal' || Boolean(s.specialEffect));
  return skills;
}

export function skillSpecialLabel(skill: Skill): string {
  if (skill.specialEffect) {
    return `${skill.specialEffect.type} ${Math.round(skill.specialEffect.value * 100)}%`;
  }
  if (skill.attachElement) {
    return `attach ${skill.attachElement.element}`;
  }
  if (skill.reactionTrigger?.length) {
    return skill.reactionTrigger.map((r) => r.reaction).join(', ');
  }
  return 'special effect';
}
