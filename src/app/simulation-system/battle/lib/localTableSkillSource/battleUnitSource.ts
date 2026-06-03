/**
 * Battle unit (player / enemy) stats — table column mapping definitions.
 */

export type BattleUnitConfig = {
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mp: number;
};

export type BattleUnitColumnMappingKey = 'name' | 'hp' | 'atk' | 'def' | 'spd' | 'mp';

export type BattleUnitMappingFieldDef = {
  key: BattleUnitColumnMappingKey;
  label: string;
  required?: boolean;
  typeDescription?: string;
  hint?: string;
};

export const BATTLE_UNIT_MAPPING_FIELDS: BattleUnitMappingFieldDef[] = [
  {
    key: 'name',
    label: 'Name',
    required: true,
    typeDescription: 'string — unit display name',
  },
  { key: 'hp', label: 'HP', typeDescription: 'integer > 0' },
  { key: 'atk', label: 'ATK', typeDescription: 'integer > 0' },
  { key: 'def', label: 'DEF', typeDescription: 'integer ≥ 0' },
  { key: 'spd', label: 'SPD', typeDescription: 'integer > 0' },
  { key: 'mp', label: 'MP', typeDescription: 'integer > 0' },
];

export const REQUIRED_BATTLE_UNIT_MAPPING_KEYS: BattleUnitColumnMappingKey[] = ['name'];
