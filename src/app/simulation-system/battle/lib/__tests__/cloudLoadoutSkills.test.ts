import { describe, expect, it } from 'vitest';
import type { Skill } from '../../types';
import { mergeCloudLoadoutSkills } from '../cloudLoadoutSkills';

const strike: Skill = {
  id: 'strike',
  name: 'Strike',
  type: 'attack',
  power: 1,
  mpCost: 0,
  cooldown: 0,
  maxCooldown: 0,
  description: '',
};

const fireball: Skill = {
  id: 'fireball',
  name: 'Fireball',
  type: 'attack',
  power: 1.2,
  mpCost: 10,
  cooldown: 0,
  maxCooldown: 3,
  description: '',
};

describe('mergeCloudLoadoutSkills', () => {
  it('adds cloud progression skills to the current battle skill list', () => {
    expect(mergeCloudLoadoutSkills([strike], [fireball]).map((s) => s.id)).toEqual([
      'strike',
      'fireball',
    ]);
  });

  it('replaces existing skills with the cloud-leveled version', () => {
    const leveledFireball = { ...fireball, power: 1.5 };

    expect(mergeCloudLoadoutSkills([fireball], [leveledFireball])).toEqual([leveledFireball]);
  });
});
