import type { Skill } from '../types';

export function mergeCloudLoadoutSkills(
  currentSkills: Skill[],
  cloudSkills: Skill[],
): Skill[] {
  const byId = new Map(currentSkills.map((skill) => [skill.id, skill]));
  for (const skill of cloudSkills) byId.set(skill.id, skill);
  return [...byId.values()];
}
