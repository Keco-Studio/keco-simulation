/**
 * Hero roster — reference data inspired by classic mobile RPG tables.
 */

import type { Character, Talent, Skill, CharacterBaseStats, Camp, Rarity } from '../types';

export const CHARACTERS: Character[] = [
  {
    id: 1001,
    name: 'Xiahou Dun',
    rarity: 3,
    int: 14,
    camp: 'Wei',
    baseStats: { atk: 178, life: 2850, def: 78, mdf: 78 },
    talentIds: [2021, 2002, 2023, 2043, 2025, 2032, 2007, 2040, 2029, 2047, 2020, 2036],
    skillIds: [4001, 4002],
  },
  {
    id: 1002,
    name: 'Yue Jin',
    rarity: 2,
    int: 10,
    camp: 'Wei',
    baseStats: { atk: 96, life: 1200, def: 48, mdf: 48 },
    talentIds: [2011, 2022, 2003, 2014, 2025, 2016, 2033, 2008],
    skillIds: [4003, 4004],
  },
  {
    id: 1003,
    name: 'Cao Pi',
    rarity: 2,
    int: 10,
    camp: 'Wei',
    baseStats: { atk: 80, life: 1000, def: 40, mdf: 40 },
    talentIds: [2001, 2022, 2013, 2024, 2005, 2016, 2033, 2008],
    skillIds: [4005, 4006],
  },
  {
    id: 1004,
    name: 'Yu Jin',
    rarity: 2,
    int: 10,
    camp: 'Wei',
    baseStats: { atk: 107, life: 1067, def: 47, mdf: 47 },
    talentIds: [2001, 2022, 2023, 2004, 2015, 2026, 2033, 2028],
    skillIds: [4007, 4008],
  },
  {
    id: 1005,
    name: 'Pang De',
    rarity: 2,
    int: 10,
    camp: 'Wei',
    baseStats: { atk: 80, life: 1000, def: 40, mdf: 40 },
    talentIds: [2021, 2012, 2023, 2004, 2025, 2016, 2033, 2008],
    skillIds: [4009, 4010],
  },
  {
    id: 1006,
    name: 'Zhao Yun',
    rarity: 3,
    int: 14,
    camp: 'Shu',
    baseStats: { atk: 175, life: 2983, def: 77, mdf: 77 },
    talentIds: [2021, 2002, 2023, 2043, 2015, 2032, 2027, 2040, 2029, 2047, 2010, 2042],
    skillIds: [4011, 4012],
  },
  {
    id: 1007,
    name: 'Wei Yan',
    rarity: 3,
    int: 14,
    camp: 'Shu',
    baseStats: { atk: 180, life: 2736, def: 79, mdf: 79 },
    talentIds: [2021, 2022, 2013, 2031, 2015, 2044, 2007, 2034, 2029, 2041, 2010, 2048],
    skillIds: [4013, 4014],
  },
  {
    id: 1008,
    name: 'Fa Zheng',
    rarity: 2,
    int: 10,
    camp: 'Shu',
    baseStats: { atk: 80, life: 1000, def: 40, mdf: 40 },
    talentIds: [2001, 2022, 2003, 2024, 2015, 2026, 2033, 2028],
    skillIds: [4015, 4016],
  },
  {
    id: 1009,
    name: 'Zhu Rong',
    rarity: 1,
    int: 8,
    camp: 'Shu',
    baseStats: { atk: 50, life: 500, def: 25, mdf: 25 },
    talentIds: [2021, 2022, 2023, 2004, 2015, 2026, 2033, 2028],
    skillIds: [4017, 4018],
  },
  {
    id: 1010,
    name: 'Meng Huo',
    rarity: 1,
    int: 8,
    camp: 'Shu',
    baseStats: { atk: 43, life: 605, def: 25, mdf: 25 },
    talentIds: [2011, 2002, 2003, 2024, 2015, 2026, 2033, 2008],
    skillIds: [4019, 4020],
  },
];

export const TALENTS: Talent[] = [
  { id: 2001, name: 'HP I', level: 1, effect: 'energy_general+1, characters_life+3800' },
  { id: 2002, name: 'HP II', level: 2, effect: 'characters_life+14000' },
  { id: 2003, name: 'HP III', level: 3, effect: 'energy_general+1, characters_life+82000' },
  { id: 2004, name: 'HP IV', level: 4, effect: 'characters_life+large_bonus' },
  { id: 2005, name: 'HP V', level: 5, effect: 'characters_life+33000' },
  { id: 2006, name: 'HP VI', level: 6, effect: 'characters_life+1170000' },
  { id: 2007, name: 'HP VII', level: 7, effect: 'characters_life+2540000' },
  { id: 2008, name: 'HP VIII', level: 8, effect: 'characters_life+large_bonus' },
  { id: 2009, name: 'HP IX', level: 9, effect: 'characters_life+4980000' },
  { id: 2010, name: 'HP XI', level: 11, effect: 'characters_life+7920000' },
  { id: 2011, name: 'DEF I', level: 1, effect: 'energy_general+1, characters_def+small_bonus' },
  { id: 2012, name: 'DEF II', level: 2, effect: 'characters_def+small_bonus' },
  { id: 2013, name: 'DEF III', level: 3, effect: 'energy_general+1, characters_def+2500' },
  { id: 2014, name: 'DEF IV', level: 4, effect: 'characters_def+small_bonus' },
  { id: 2015, name: 'DEF V', level: 5, effect: 'characters_def+19000' },
  { id: 2016, name: 'DEF VI', level: 6, effect: 'characters_def+large_bonus' },
  { id: 2017, name: 'DEF VII', level: 7, effect: 'characters_def+large_bonus' },
  { id: 2018, name: 'DEF VIII', level: 8, effect: 'characters_def+large_bonus' },
  { id: 2019, name: 'DEF IX', level: 9, effect: 'characters_def+large_bonus' },
  { id: 2020, name: 'DEF XI', level: 11, effect: 'characters_def+large_bonus' },
  { id: 2021, name: 'ATK I', level: 1, effect: 'energy_general+1, characters_atk+240' },
  { id: 2022, name: 'ATK II', level: 2, effect: 'characters_atk+640' },
  { id: 2023, name: 'ATK III', level: 3, effect: 'energy_general+1, characters_atk+5100' },
  { id: 2024, name: 'ATK IV', level: 4, effect: 'characters_atk+18000' },
  { id: 2025, name: 'ATK V', level: 5, effect: 'characters_atk+33000' },
  { id: 2026, name: 'ATK VI', level: 6, effect: 'characters_atk+large_bonus' },
  { id: 2027, name: 'ATK VII', level: 7, effect: 'characters_atk+134000' },
  { id: 2028, name: 'ATK VIII', level: 8, effect: 'characters_atk+164000' },
  { id: 2029, name: 'ATK IX', level: 9, effect: 'characters_atk+262000' },
  { id: 2030, name: 'ATK XI', level: 11, effect: 'characters_atk+large_bonus' },
  { id: 2031, name: 'Faction HP IV', level: 4, effect: 'characters_camp_life+132000' },
  { id: 2032, name: 'Faction HP VI', level: 6, effect: 'characters_camp_life+461000' },
  { id: 2033, name: 'Faction HP VII', level: 7, effect: 'characters_camp_life+large_bonus' },
  { id: 2034, name: 'Faction HP VIII', level: 8, effect: 'characters_camp_life+1220000' },
  { id: 2035, name: 'Faction HP X', level: 10, effect: 'characters_camp_life+large_bonus' },
  { id: 2036, name: 'Faction HP XII', level: 12, effect: 'characters_camp_life+large_bonus' },
  { id: 2037, name: 'Faction DEF IV', level: 4, effect: 'characters_camp_def+small_bonus' },
  { id: 2038, name: 'Faction DEF VI', level: 6, effect: 'characters_camp_def+small_bonus' },
  { id: 2039, name: 'Faction DEF VII', level: 7, effect: 'characters_camp_def+small_bonus' },
  { id: 2040, name: 'Faction DEF VIII', level: 8, effect: 'characters_camp_def+32000' },
  { id: 2041, name: 'Faction DEF X', level: 10, effect: 'characters_camp_def+57000' },
  { id: 2042, name: 'Faction DEF XII', level: 12, effect: 'characters_camp_def+81000' },
  { id: 2043, name: 'Faction ATK IV', level: 4, effect: 'characters_camp_atk+7000' },
  { id: 2044, name: 'Faction ATK VI', level: 6, effect: 'characters_camp_atk+large_bonus' },
  { id: 2045, name: 'Faction ATK VII', level: 7, effect: 'characters_camp_atk+38000' },
  { id: 2046, name: 'Faction ATK VIII', level: 8, effect: 'characters_camp_atk+large_bonus' },
  { id: 2047, name: 'Faction ATK X', level: 10, effect: 'characters_camp_atk+114000' },
  { id: 2048, name: 'Faction ATK XII', level: 12, effect: 'characters_camp_atk+162000' },
];

export const SKILLS: Skill[] = [
  {
    id: 4001,
    name: 'Iron Will',
    type: 'Basic',
    description: 'Deals 92% physical damage to one enemy column.',
  },
  {
    id: 4002,
    name: 'Arrow Fury',
    type: 'Rage',
    description:
      'Deals 246% physical damage to one enemy column; 25% chance to stun for 1 turn; if target HP > 50%, deals an extra 140% damage.',
  },
  {
    id: 4003,
    name: 'Dauntless',
    type: 'Basic',
    description: 'Deals 100% physical damage to one enemy.',
  },
  {
    id: 4004,
    name: 'Unbreakable',
    type: 'Rage',
    description: 'Deals 192% physical damage to one enemy column; grants +15% crit resist for 2 turns.',
  },
  {
    id: 4005,
    name: 'Majesty',
    type: 'Basic',
    description: 'Deals 100% magic damage to a single enemy.',
  },
  {
    id: 4006,
    name: 'Grand Strategy',
    type: 'Rage',
    description: 'Deals 133% magic damage to 3 random enemies; 30% chance to reduce target rage by 1.',
  },
  {
    id: 4007,
    name: 'Lethal Strike',
    type: 'Basic',
    description: 'Deals 100% physical damage to one enemy in the back row.',
  },
  {
    id: 4008,
    name: 'Meteor Volley',
    type: 'Rage',
    description:
      'Deals 262% physical damage to one enemy in the back row; 60% chance to reduce target ATK by 15% for 2 turns.',
  },
  {
    id: 4009,
    name: 'Charge',
    type: 'Basic',
    description: 'Deals 100% physical damage to a single enemy.',
  },
  {
    id: 4010,
    name: 'Last Stand',
    type: 'Rage',
    description: 'Deals 133% physical damage to the front row; 10% extra crit chance on this attack.',
  },
  {
    id: 4011,
    name: 'Dragon Spear',
    type: 'Basic',
    description: 'Deals 92% physical damage to one enemy column.',
  },
  {
    id: 4012,
    name: 'Serpent Lunge',
    type: 'Rage',
    description:
      'Deals 246% physical damage to one enemy column; 40% chance to gain 4 rage; +15% damage dealt for 2 turns.',
  },
  {
    id: 4013,
    name: 'Wild Bone',
    type: 'Basic',
    description: 'Deals 64% physical damage to the front row.',
  },
  {
    id: 4014,
    name: 'Blood Phantom',
    type: 'Rage',
    description:
      'Deals 171% physical damage to the front row; 20% chance to stun for 1 turn; reduces healing received by 15% for 2 turns; +20% hit on this attack.',
  },
  {
    id: 4015,
    name: 'Ambush',
    type: 'Basic',
    description: 'Deals 100% magic damage to a single enemy.',
  },
  {
    id: 4016,
    name: 'Karma Loop',
    type: 'Rage',
    description: 'Deals 193% magic damage to 2 random enemies; 40% chance to restore 2 rage to self.',
  },
  {
    id: 4017,
    name: 'Blazing Edge',
    type: 'Basic',
    description: 'Deals 80% physical damage to one enemy in the back row.',
  },
  {
    id: 4018,
    name: 'White Tiger Volley',
    type: 'Rage',
    description:
      'Deals 107% physical damage to the back row; deals an extra 50% physical damage to the lowest-HP% target.',
  },
  {
    id: 4019,
    name: 'Ram',
    type: 'Basic',
    description: 'Deals 80% physical damage to a single enemy.',
  },
  {
    id: 4020,
    name: 'Nanzhong Overlord',
    type: 'Rage',
    description: 'Deals 99% physical damage to the target and adjacent units; +15% damage reduction for 2 turns.',
  },
];

export function getCharacterById(id: number): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export function getCharactersByCamp(camp: Camp): Character[] {
  return CHARACTERS.filter((c) => c.camp === camp);
}

export function getCharactersByRarity(rarity: Rarity): Character[] {
  return CHARACTERS.filter((c) => c.rarity === rarity);
}

export function getTalentById(id: number): Talent | undefined {
  return TALENTS.find((t) => t.id === id);
}

export function getSkillById(id: number): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function calculateCharacterStats(character: Character, talentLevel: number): CharacterBaseStats {
  const stats = { ...character.baseStats };

  for (const talentId of character.talentIds) {
    const talent = getTalentById(talentId);
    if (talent && talent.level <= talentLevel) {
      if (talent.effect.includes('characters_atk')) {
        const match = talent.effect.match(/characters_atk\+(\d+)/);
        if (match) stats.atk += parseInt(match[1], 10);
      }
      if (talent.effect.includes('characters_life')) {
        const match = talent.effect.match(/characters_life\+(\d+)/);
        if (match) stats.life += parseInt(match[1], 10);
      }
      if (talent.effect.includes('characters_def')) {
        const match = talent.effect.match(/characters_def\+(\d+)/);
        if (match) stats.def += parseInt(match[1], 10);
      }
      if (talent.effect.includes('characters_mdf')) {
        const match = talent.effect.match(/characters_mdf\+(\d+)/);
        if (match) stats.mdf += parseInt(match[1], 10);
      }
    }
  }

  return stats;
}

export const CAMPS: Camp[] = ['Wei', 'Shu', 'Wu', 'Other'];

export const RARITIES: Rarity[] = [1, 2, 3];
