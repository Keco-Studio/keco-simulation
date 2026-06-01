/**
 * Battle Simulator — built-in skills (30 deterministic skills).
 */

import { Skill, SkillId, type Element } from '../types';

export const SKILLS: Record<SkillId, Skill> = {
  // --- Basic attacks (3) ---
  [SkillId.PUGONG_MENGJI]: {
    id: SkillId.PUGONG_MENGJI,
    name: 'Strike',
    type: 'attack',
    power: 1.0,
    mpCost: 0,
    cooldown: 0,
    maxCooldown: 0,
    description: 'Basic attack with no extra effects.',
  },
  [SkillId.PUGONG_YUANSU_CHUOCI]: {
    id: SkillId.PUGONG_YUANSU_CHUOCI,
    name: 'Element Jab',
    type: 'attack',
    power: 1.0,
    mpCost: 0,
    cooldown: 0,
    maxCooldown: 0,
    attachElement: {
      element: 'random',
      strength: 'weak',
      duration: 2,
    },
    description: 'Basic attack; applies a random weak element (2 turns).',
  },
  [SkillId.PUGONG_XUHOU_ZAN]: {
    id: SkillId.PUGONG_XUHOU_ZAN,
    name: 'Charged Slash',
    type: 'attack',
    power: 1.0,
    mpCost: 0,
    cooldown: 0,
    maxCooldown: 0,
    attachElement: {
      element: 'fire',
      strength: 'weak',
      duration: 2,
    },
    description: 'Fire basic attack; applies weak Fire (2 turns).',
  },

  // --- Fire (6) ---
  [SkillId.HUO_XIAOHUODAN]: {
    id: SkillId.HUO_XIAOHUODAN,
    name: 'Firebolt',
    type: 'attack',
    power: 1.2,
    mpCost: 13,
    cooldown: 0,
    maxCooldown: 2,
    attachElement: {
      element: 'fire',
      strength: 'weak',
      duration: 2,
    },
    reactionTrigger: [{ element: 'water', reaction: 'vaporize' }],
    description: 'Weak Fire (2 turns); Vaporize if target has Water.',
  },
  [SkillId.HUO_HUOYAN_ZHAN]: {
    id: SkillId.HUO_HUOYAN_ZHAN,
    name: 'Flame Slash',
    type: 'attack',
    power: 1.4,
    mpCost: 16,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'fire',
      strength: 'medium',
      duration: 3,
    },
    reactionTrigger: [{ element: 'ice', reaction: 'melt' }],
    description: 'Medium Fire (3 turns); Melt if target has Ice.',
  },
  [SkillId.HUO_RANHUO_CHONGJI]: {
    id: SkillId.HUO_RANHUO_CHONGJI,
    name: 'Blazing Rush',
    type: 'attack',
    power: 1.5,
    mpCost: 22,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'fire',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [{ element: 'thunder', reaction: 'overload' }],
    description: 'Strong Fire (4 turns); Overload if target has Thunder.',
  },
  [SkillId.HUO_LIAOYUAN_HUO]: {
    id: SkillId.HUO_LIAOYUAN_HUO,
    name: 'Wildfire',
    type: 'attack',
    power: 1.3,
    mpCost: 16,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'fire',
      strength: 'medium',
      duration: 3,
    },
    dot: {
      damage: 0.3,
      duration: 2,
    },
    reactionTrigger: [{ element: 'grass', reaction: 'burn' }],
    description: 'Medium Fire (3 turns); Burn if target has Grass.',
  },
  [SkillId.HUO_YANBAO]: {
    id: SkillId.HUO_YANBAO,
    name: 'Inferno Burst',
    type: 'attack',
    power: 2.0,
    mpCost: 30,
    cooldown: 0,
    maxCooldown: 5,
    attachElement: {
      element: 'fire',
      strength: 'strong',
      duration: 4,
    },
    dot: {
      damage: 0.3,
      duration: 2,
    },
    description: 'Strong Fire (4 turns); Burn DoT.',
  },
  [SkillId.HUO_JINMIE_JI]: {
    id: SkillId.HUO_JINMIE_JI,
    name: 'Ashbreaker',
    type: 'attack',
    power: 2.2,
    mpCost: 35,
    cooldown: 0,
    maxCooldown: 6,
    attachElement: {
      element: 'fire',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [
      { element: 'water', reaction: 'vaporize' },
      { element: 'ice', reaction: 'melt' },
    ],
    description: 'Strong Fire (4 turns); Vaporize / Melt vs Water / Ice.',
  },

  // --- Water (6) ---
  [SkillId.SHUI_SHUIDAN]: {
    id: SkillId.SHUI_SHUIDAN,
    name: 'Water Dart',
    type: 'attack',
    power: 1.1,
    mpCost: 12,
    cooldown: 0,
    maxCooldown: 2,
    attachElement: {
      element: 'water',
      strength: 'weak',
      duration: 2,
    },
    reactionTrigger: [{ element: 'fire', reaction: 'vaporize' }],
    description: 'Weak Water (2 turns); Vaporize if target has Fire.',
  },
  [SkillId.SHUI_LANGYONG]: {
    id: SkillId.SHUI_LANGYONG,
    name: 'Surge',
    type: 'attack',
    power: 1.3,
    mpCost: 18,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'water',
      strength: 'medium',
      duration: 3,
    },
    reactionTrigger: [{ element: 'thunder', reaction: 'electrify' }],
    description: 'Medium Water (3 turns); Electrify if target has Thunder.',
  },
  [SkillId.SHUI_BINGDONG_SHUIJIAN]: {
    id: SkillId.SHUI_BINGDONG_SHUIJIAN,
    name: 'Glacial Shaft',
    type: 'attack',
    power: 1.2,
    mpCost: 19,
    cooldown: 0,
    maxCooldown: 4,
    attachElement: {
      element: 'water',
      strength: 'medium',
      duration: 3,
    },
    crowdControl: {
      type: 'freeze',
      duration: 1,
    },
    reactionTrigger: [{ element: 'ice', reaction: 'freeze' }],
    description: 'Medium Water (3 turns); Freeze (target skips next turn).',
  },
  [SkillId.SHUI_HONGLIU]: {
    id: SkillId.SHUI_HONGLIU,
    name: 'Torrent',
    type: 'attack',
    power: 1.6,
    mpCost: 22,
    cooldown: 0,
    maxCooldown: 4,
    attachElement: {
      element: 'water',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [{ element: 'fire', reaction: 'vaporize' }],
    description: 'Strong Water (4 turns); Vaporize if target has Fire.',
  },
  [SkillId.SHUI_SHUISHI_BO]: {
    id: SkillId.SHUI_SHUISHI_BO,
    name: 'Corrode Wave',
    type: 'attack',
    power: 1.5,
    mpCost: 24,
    cooldown: 0,
    maxCooldown: 5,
    attachElement: {
      element: 'water',
      strength: 'strong',
      duration: 4,
    },
    specialEffect: {
      type: 'def_debuff',
      value: 0.1,
      duration: 2,
    },
    description: 'Strong Water (4 turns); −10% DEF on target (2 turns).',
  },
  [SkillId.SHUI_CANGLAN_PO]: {
    id: SkillId.SHUI_CANGLAN_PO,
    name: 'Tidal Break',
    type: 'attack',
    power: 2.0,
    mpCost: 35,
    cooldown: 0,
    maxCooldown: 6,
    attachElement: {
      element: 'water',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [
      { element: 'thunder', reaction: 'electrify' },
      { element: 'ice', reaction: 'freeze' },
    ],
    description: 'Strong Water (4 turns); Electrify / Freeze vs Thunder / Ice.',
  },

  // --- Thunder (6) ---
  [SkillId.LEI_LEIHU]: {
    id: SkillId.LEI_LEIHU,
    name: 'Arc Spark',
    type: 'attack',
    power: 1.2,
    mpCost: 13,
    cooldown: 0,
    maxCooldown: 2,
    attachElement: {
      element: 'thunder',
      strength: 'weak',
      duration: 2,
    },
    reactionTrigger: [{ element: 'water', reaction: 'electrify' }],
    description: 'Weak Thunder (2 turns); Electrify if target has Water.',
  },
  [SkillId.LEI_JINGLEI_SHAN]: {
    id: SkillId.LEI_JINGLEI_SHAN,
    name: 'Flash Strike',
    type: 'attack',
    power: 1.4,
    mpCost: 18,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'thunder',
      strength: 'medium',
      duration: 3,
    },
    reactionTrigger: [{ element: 'fire', reaction: 'overload' }],
    description: 'Medium Thunder (3 turns); Overload if target has Fire.',
  },
  [SkillId.LEI_LEITENG_JI]: {
    id: SkillId.LEI_LEITENG_JI,
    name: 'Vine Lash',
    type: 'attack',
    power: 1.5,
    mpCost: 20,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'thunder',
      strength: 'medium',
      duration: 3,
    },
    reactionTrigger: [{ element: 'grass', reaction: 'quicken' }],
    description: 'Medium Thunder (3 turns); Quicken if target has Grass.',
  },
  [SkillId.LEI_KUANGLEI]: {
    id: SkillId.LEI_KUANGLEI,
    name: 'Storm Surge',
    type: 'attack',
    power: 1.7,
    mpCost: 26,
    cooldown: 0,
    maxCooldown: 4,
    attachElement: {
      element: 'thunder',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [{ element: 'water', reaction: 'electrify' }],
    description: 'Strong Thunder (4 turns); Electrify if target has Water.',
  },
  [SkillId.LEI_LEIJI]: {
    id: SkillId.LEI_LEIJI,
    name: 'Judgment Bolt',
    type: 'attack',
    power: 1.8,
    mpCost: 28,
    cooldown: 0,
    maxCooldown: 5,
    attachElement: {
      element: 'thunder',
      strength: 'strong',
      duration: 4,
    },
    specialEffect: {
      type: 'atk_debuff',
      value: 0.15,
      duration: 2,
    },
    description: 'Strong Thunder (4 turns); −15% ATK on target (2 turns).',
  },
  [SkillId.LEI_TIANFA_LEI]: {
    id: SkillId.LEI_TIANFA_LEI,
    name: "Heaven's Wrath",
    type: 'attack',
    power: 2.2,
    mpCost: 38,
    cooldown: 0,
    maxCooldown: 6,
    attachElement: {
      element: 'thunder',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [
      { element: 'fire', reaction: 'overload' },
      { element: 'grass', reaction: 'quicken' },
    ],
    description: 'Strong Thunder (4 turns); Overload / Quicken vs Fire / Grass.',
  },

  // --- Grass (6) ---
  [SkillId.CAO_TENGBIAN]: {
    id: SkillId.CAO_TENGBIAN,
    name: 'Thorn Whip',
    type: 'attack',
    power: 1.1,
    mpCost: 10,
    cooldown: 0,
    maxCooldown: 2,
    attachElement: {
      element: 'grass',
      strength: 'weak',
      duration: 2,
    },
    reactionTrigger: [{ element: 'fire', reaction: 'burn' }],
    description: 'Weak Grass (2 turns); Burn if target has Fire.',
  },
  [SkillId.CAO_JINGJI_TU]: {
    id: SkillId.CAO_JINGJI_TU,
    name: 'Bramble Thrust',
    type: 'attack',
    power: 1.3,
    mpCost: 17,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'grass',
      strength: 'medium',
      duration: 3,
    },
    reactionTrigger: [{ element: 'thunder', reaction: 'quicken' }],
    description: 'Medium Grass (3 turns); Quicken if target has Thunder.',
  },
  [SkillId.CAO_MANSHENG]: {
    id: SkillId.CAO_MANSHENG,
    name: 'Overgrowth',
    type: 'attack',
    power: 0.8,
    mpCost: 12,
    cooldown: 0,
    maxCooldown: 3,
    attachElement: {
      element: 'grass',
      strength: 'medium',
      duration: 3,
    },
    specialEffect: {
      type: 'heal',
      value: 0.3,
      duration: 0,
    },
    description: 'Medium Grass (3 turns); heal self for 0.3×ATK.',
  },
  [SkillId.CAO_RONGKU_SHU]: {
    id: SkillId.CAO_RONGKU_SHU,
    name: 'Wither Bloom',
    type: 'attack',
    power: 1.5,
    mpCost: 23,
    cooldown: 0,
    maxCooldown: 4,
    attachElement: {
      element: 'grass',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [{ element: 'fire', reaction: 'burn' }],
    description: 'Strong Grass (4 turns); Burn if target has Fire.',
  },
  [SkillId.CAO_LINGCAO_YU]: {
    id: SkillId.CAO_LINGCAO_YU,
    name: 'Spirit Herb',
    type: 'attack',
    power: 0.6,
    mpCost: 18,
    cooldown: 0,
    maxCooldown: 5,
    attachElement: {
      element: 'grass',
      strength: 'strong',
      duration: 4,
    },
    specialEffect: {
      type: 'heal',
      value: 0.5,
      duration: 0,
    },
    description: 'Strong Grass (4 turns); heal self for 0.5×ATK.',
  },
  [SkillId.CAO_WANTENG_JIAO]: {
    id: SkillId.CAO_WANTENG_JIAO,
    name: 'Thousand Vines',
    type: 'attack',
    power: 2.0,
    mpCost: 36,
    cooldown: 0,
    maxCooldown: 6,
    attachElement: {
      element: 'grass',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [
      { element: 'thunder', reaction: 'quicken' },
      { element: 'fire', reaction: 'burn' },
    ],
    description: 'Strong Grass (4 turns); Quicken / Burn vs Thunder / Fire.',
  },

  // --- Ice (3) ---
  [SkillId.BING_BINGCI]: {
    id: SkillId.BING_BINGCI,
    name: 'Ice Shard',
    type: 'attack',
    power: 1.2,
    mpCost: 14,
    cooldown: 0,
    maxCooldown: 2,
    attachElement: {
      element: 'ice',
      strength: 'weak',
      duration: 2,
    },
    reactionTrigger: [{ element: 'fire', reaction: 'melt' }],
    description: 'Weak Ice (2 turns); Melt if target has Fire.',
  },
  [SkillId.BING_BINGLENG_ZAN]: {
    id: SkillId.BING_BINGLENG_ZAN,
    name: 'Frost Carve',
    type: 'attack',
    power: 1.2,
    mpCost: 20,
    cooldown: 0,
    maxCooldown: 4,
    attachElement: {
      element: 'ice',
      strength: 'medium',
      duration: 3,
    },
    crowdControl: {
      type: 'freeze',
      duration: 1,
    },
    reactionTrigger: [{ element: 'water', reaction: 'freeze' }],
    description: 'Medium Ice (3 turns); Freeze if target has Water.',
  },
  [SkillId.BING_YONGHAN_YU]: {
    id: SkillId.BING_YONGHAN_YU,
    name: 'Eternal Cell',
    type: 'attack',
    power: 1.8,
    mpCost: 33,
    cooldown: 0,
    maxCooldown: 5,
    attachElement: {
      element: 'ice',
      strength: 'strong',
      duration: 4,
    },
    reactionTrigger: [
      { element: 'water', reaction: 'freeze' },
      { element: 'fire', reaction: 'melt' },
    ],
    description: 'Strong Ice (4 turns); Freeze / Melt vs Water / Fire.',
  },
};

/** Built-in 30-skill list. */
export function getBuiltinSkills(): Skill[] {
  return Object.values(SKILLS);
}

/** @deprecated use getBuiltinSkills */
export const getAllSkills = getBuiltinSkills;

/**
 * Element tab for filtering: prefer attach element; random / none falls back to id prefix (built-in ids).
 */
export function inferSkillTabElement(skill: Skill): Element | 'none' {
  const ae = skill.attachElement;
  if (ae?.element && ae.element !== 'random') return ae.element;
  if (ae?.element === 'random') return 'none';
  const id = skill.id;
  if (id.startsWith('pugong')) return 'none';
  if (id.startsWith('huo_')) return 'fire';
  if (id.startsWith('shui_')) return 'water';
  if (id.startsWith('lei_')) return 'thunder';
  if (id.startsWith('cao_')) return 'grass';
  if (id.startsWith('bing_')) return 'ice';
  return 'none';
}

export function filterSkillsByTab(skills: Skill[], tab: string): Skill[] {
  if (!tab || tab === 'all') return skills;
  if (tab === 'none') return skills.filter((s) => inferSkillTabElement(s) === 'none');
  return skills.filter((s) => inferSkillTabElement(s) === tab);
}

/** Built-in skills filtered by element (used by export scripts, etc.). */
export function getSkillsByElement(element?: string): Skill[] {
  return filterSkillsByTab(getBuiltinSkills(), element || 'all');
}

export const getNormalAttacks = (): Skill[] => {
  return [
    SKILLS[SkillId.PUGONG_MENGJI],
    SKILLS[SkillId.PUGONG_YUANSU_CHUOCI],
    SKILLS[SkillId.PUGONG_XUHOU_ZAN],
  ];
};

export const ELEMENT_SKILLS: Record<string, Skill[]> = {
  fire: filterSkillsByTab(getBuiltinSkills(), 'fire'),
  water: filterSkillsByTab(getBuiltinSkills(), 'water'),
  thunder: filterSkillsByTab(getBuiltinSkills(), 'thunder'),
  grass: filterSkillsByTab(getBuiltinSkills(), 'grass'),
  ice: filterSkillsByTab(getBuiltinSkills(), 'ice'),
};
