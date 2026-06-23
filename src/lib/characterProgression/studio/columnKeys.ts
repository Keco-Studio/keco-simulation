export const CHARACTER_COLUMNS = [
  'character_id',
  'name',
  'hp',
  'atk',
  'def',
  'spd',
  'mp',
  'skill_ids',
] as const;

export const CHAR_LEVEL_CURVE_COLUMNS = ['level', 'need_exp', 'grant_sp'] as const;

export const SKILL_LEVEL_CURVE_COLUMNS = [
  'skill_id',
  'level',
  'cost_sp',
  'power_bonus',
  'mp_cost_delta',
  'cooldown_delta',
] as const;
