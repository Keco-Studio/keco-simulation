/**
 * Predefined scratch-table columns aligned with the battle skill sheet
 * (`BATTLE_SKILLS_SHEET_HEADERS` / Import by id header aliases).
 */

import { BATTLE_SKILLS_SHEET_HEADERS } from '@/app/simulation-system/battle/lib/skills/battleSkillsSheetSpec';
import type { SimLocalColumnDef, SimTableMeta, SimTableRow } from './types';

/** Column key used in IndexedDB rows (matches battle skill field mapping keys). */
export type SkillSheetColumnKey =
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

/** Sheet header label → storage key (only where they differ). */
const SHEET_LABEL_TO_KEY: Record<(typeof BATTLE_SKILLS_SHEET_HEADERS)[number], SkillSheetColumnKey> = {
  id: 'id',
  name: 'name',
  type: 'type',
  power: 'power',
  MP: 'mpCost',
  maxCooldown: 'maxCooldown',
  description: 'description',
  attachElement: 'attachElement',
  attachStrength: 'attachStrength',
  attachTurns: 'attachDuration',
  dotDamage: 'dotDamage',
  dotTurns: 'dotDuration',
  freezeTurns: 'freezeDuration',
  specialEffect: 'specialType',
  specialEffectValue: 'specialValue',
  specialEffectDuration: 'specialDuration',
  reactionTriggers: 'reactionTriggersJson',
};

function dataTypeForSkillKey(key: SkillSheetColumnKey): Pick<SimLocalColumnDef, 'dataType'> {
  switch (key) {
    case 'power':
    case 'mpCost':
    case 'maxCooldown':
    case 'attachDuration':
    case 'dotDamage':
    case 'dotDuration':
    case 'freezeDuration':
    case 'specialValue':
    case 'specialDuration':
      return { dataType: 'int' };
    default:
      return { dataType: 'string' };
  }
}

/** Ordered columns for a new local table from the battle skill sheet template. */
export function buildSkillSheetColumnDefs(): SimLocalColumnDef[] {
  return BATTLE_SKILLS_SHEET_HEADERS.map((label) => {
    const key = SHEET_LABEL_TO_KEY[label];
    const { dataType } = dataTypeForSkillKey(key);
    return { key, label, dataType };
  });
}

export function buildSkillSheetScratchMeta(
  id: string,
  name: string,
  now: number,
): Pick<SimTableMeta, 'columnKeys' | 'columnLabels' | 'columns'> {
  const cols = buildSkillSheetColumnDefs();
  return {
    columnKeys: cols.map((c) => c.key),
    columnLabels: cols.map((c) => c.label),
    columns: cols,
  };
}

/** One empty data row (string/int cells) for the skill sheet template. */
export function buildSkillSheetEmptyRow(rowId: string): SimTableRow {
  const values: Record<string, unknown> = {};
  for (const col of buildSkillSheetColumnDefs()) {
    if (col.dataType === 'int') {
      values[col.key] = col.key === 'freezeDuration' ? 0 : '';
    } else {
      values[col.key] = '';
    }
  }
  return { id: rowId, values };
}
