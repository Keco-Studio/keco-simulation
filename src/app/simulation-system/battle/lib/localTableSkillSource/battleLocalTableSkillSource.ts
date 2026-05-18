/**
 * Persisted battle simulator skill source: local table + column mapping.
 */

export const BATTLE_LOCAL_SKILL_SOURCE_STORAGE_KEY = 'keco-battle-local-skill-source-v1';

/** Maps a Skill / SkillFlatRow field to a local table column key. */
export type BattleSkillColumnMappingKey =
  | 'id'
  | 'name'
  | 'type'
  | 'power'
  | 'mpCost'
  | 'maxCooldown'
  | 'description'
  | 'attachElement'
  | 'attachStrength'
  | 'attachDuration'
  | 'dotDamage'
  | 'dotDuration'
  | 'freezeDuration'
  | 'specialType'
  | 'specialValue'
  | 'specialDuration'
  | 'reactionTriggersJson';

export type BattleSkillColumnMapping = Partial<Record<BattleSkillColumnMappingKey, string>>;

export type BattleLocalSkillSourceConfig = {
  tableId: string | null;
  columnMapping: BattleSkillColumnMapping;
};

export type BattleSkillMappingFieldDef = {
  key: BattleSkillColumnMappingKey;
  label: string;
  required?: boolean;
  group: 'core' | 'element' | 'dot' | 'control' | 'special' | 'reactions';
  /** Shown in Field dropdown after the label (expected value / element type). */
  typeDescription?: string;
  hint?: string;
};

export const BATTLE_SKILL_MAPPING_FIELDS: BattleSkillMappingFieldDef[] = [
  {
    key: 'id',
    label: 'Skill id',
    required: true,
    group: 'core',
    typeDescription: 'identifier — not a free-form display string',
    hint: 'Code key: letters, digits, underscore (table text like "Arc Spark" becomes Arc_Spark)',
  },
  {
    key: 'name',
    label: 'Display name',
    required: true,
    group: 'core',
    typeDescription: 'string — shown in battle UI',
  },
  {
    key: 'type',
    label: 'Type',
    group: 'core',
    typeDescription: 'attack | heal',
    hint: 'attack or heal',
  },
  { key: 'power', label: 'Power', group: 'core', typeDescription: 'number — skill multiplier' },
  { key: 'mpCost', label: 'MP cost', group: 'core', typeDescription: 'integer ≥ 0' },
  { key: 'maxCooldown', label: 'Max cooldown', group: 'core', typeDescription: 'integer ≥ 0 (turns)' },
  { key: 'description', label: 'Description', group: 'core', typeDescription: 'string' },
  {
    key: 'attachElement',
    label: 'Attach element',
    group: 'element',
    typeDescription: 'fire | water | thunder | grass | ice | random',
    hint: 'fire, water, … or random',
  },
  {
    key: 'attachStrength',
    label: 'Attach strength',
    group: 'element',
    typeDescription: 'weak | medium | strong',
    hint: 'weak, medium, strong',
  },
  {
    key: 'attachDuration',
    label: 'Attach duration',
    group: 'element',
    typeDescription: 'integer — turns on target',
  },
  { key: 'dotDamage', label: 'DOT damage', group: 'dot', typeDescription: 'number per tick' },
  { key: 'dotDuration', label: 'DOT duration', group: 'dot', typeDescription: 'integer — turns' },
  {
    key: 'freezeDuration',
    label: 'Freeze duration',
    group: 'control',
    typeDescription: 'integer > 0 — freeze turns',
  },
  {
    key: 'specialType',
    label: 'Special type',
    group: 'special',
    typeDescription: 'heal | atk_debuff | def_debuff',
    hint: 'heal, atk_debuff, def_debuff',
  },
  { key: 'specialValue', label: 'Special value', group: 'special', typeDescription: 'number' },
  {
    key: 'specialDuration',
    label: 'Special duration',
    group: 'special',
    typeDescription: 'integer — buff/debuff turns',
  },
  {
    key: 'reactionTriggersJson',
    label: 'Reaction triggers (JSON)',
    group: 'reactions',
    typeDescription: 'JSON array — element + reaction pairs',
    hint: '[{"element":"fire","reaction":"vaporize"}, …]',
  },
];

/** Label for Field dropdown: name + type / element description. */
export function formatBattleSkillFieldOptionLabel(field: BattleSkillMappingFieldDef): string {
  const name = field.required ? `${field.label} *` : field.label;
  const desc = field.typeDescription ?? field.hint;
  return desc ? `${name} — ${desc}` : name;
}

export const REQUIRED_BATTLE_SKILL_MAPPING_KEYS: BattleSkillColumnMappingKey[] = ['id', 'name'];

export function createEmptyBattleLocalSkillSourceConfig(): BattleLocalSkillSourceConfig {
  return { tableId: null, columnMapping: {} };
}

export function loadBattleLocalSkillSourceConfig(): BattleLocalSkillSourceConfig {
  if (typeof window === 'undefined') return createEmptyBattleLocalSkillSourceConfig();
  try {
    const raw = localStorage.getItem(BATTLE_LOCAL_SKILL_SOURCE_STORAGE_KEY);
    if (!raw) return createEmptyBattleLocalSkillSourceConfig();
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return createEmptyBattleLocalSkillSourceConfig();
    const o = data as BattleLocalSkillSourceConfig;
    const tableId = typeof o.tableId === 'string' ? o.tableId : o.tableId === null ? null : null;
    const columnMapping: BattleSkillColumnMapping = {};
    if (o.columnMapping && typeof o.columnMapping === 'object') {
      for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
        const v = (o.columnMapping as Record<string, unknown>)[f.key];
        if (typeof v === 'string' && v.length > 0) columnMapping[f.key] = v;
      }
    }
    return { tableId, columnMapping };
  } catch {
    return createEmptyBattleLocalSkillSourceConfig();
  }
}

export function saveBattleLocalSkillSourceConfig(config: BattleLocalSkillSourceConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BATTLE_LOCAL_SKILL_SOURCE_STORAGE_KEY, JSON.stringify(config));
}
