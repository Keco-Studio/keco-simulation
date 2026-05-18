/**
 * Map local table rows → SkillFlatRow → Skill with structured validation.
 */

import type { SimTableMeta, SimTableRow } from '@/lib/simLocalTables/types';
import type { ReactionTriggerPairRow, SkillFlatRow } from '../skills/skillTableCodec';
import { emptySkillFlatRow, flatRowToSkill } from '../skills/skillTableCodec';
import type { Skill } from '../../types';
import {
  BATTLE_SKILL_MAPPING_FIELDS,
  type BattleLocalSkillSourceConfig,
  type BattleSkillColumnMapping,
  type BattleSkillColumnMappingKey,
  REQUIRED_BATTLE_SKILL_MAPPING_KEYS,
} from './battleLocalTableSkillSource';

export type LocalTableSkillValidationResult = {
  ok: boolean;
  skills: Skill[];
  validRowCount: number;
  skippedEmptyRows: number;
  mappingErrors: string[];
  rowErrors: { rowIndex: number; rowId: string; error: string }[];
};

function cell(row: SimTableRow, columnKey: string | undefined): string {
  if (!columnKey) return '';
  const raw = row.values[columnKey];
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

function parseReactionTriggersJson(raw: string): ReactionTriggerPairRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const data = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(data)) return [];
    const out: ReactionTriggerPairRow[] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const el = String((item as { element?: unknown }).element ?? '').trim();
      const re = String((item as { reaction?: unknown }).reaction ?? '').trim();
      if (el && re) out.push({ element: el, reaction: re });
    }
    return out;
  } catch {
    return [];
  }
}

/** Validate mapping against table metadata (before reading rows). */
export function validateColumnMapping(
  meta: SimTableMeta | null,
  mapping: BattleSkillColumnMapping,
): string[] {
  const errors: string[] = [];
  if (!meta) {
    errors.push('Select a local table.');
    return errors;
  }
  const keys = new Set(meta.columnKeys);
  for (const req of REQUIRED_BATTLE_SKILL_MAPPING_KEYS) {
    const col = mapping[req]?.trim();
    if (!col) {
      const label = BATTLE_SKILL_MAPPING_FIELDS.find((f) => f.key === req)?.label ?? req;
      errors.push(`Required mapping missing: ${label}.`);
      continue;
    }
    if (!keys.has(col)) {
      errors.push(`Column "${col}" is not in table "${meta.name}".`);
    }
  }
  for (const field of BATTLE_SKILL_MAPPING_FIELDS) {
    const col = mapping[field.key]?.trim();
    if (!col) continue;
    if (!keys.has(col)) {
      errors.push(`${field.label}: column "${col}" does not exist on this table.`);
    }
  }
  const used = new Map<string, BattleSkillColumnMappingKey[]>();
  for (const field of BATTLE_SKILL_MAPPING_FIELDS) {
    const col = mapping[field.key]?.trim();
    if (!col) continue;
    const list = used.get(col) ?? [];
    list.push(field.key);
    used.set(col, list);
  }
  for (const [col, fields] of used) {
    if (fields.length > 1) {
      errors.push(
        `Column "${col}" is mapped to multiple fields (${fields.join(', ')}). Use one column per field.`,
      );
    }
  }
  return errors;
}

export function mapLocalTableRowToFlatRow(
  row: SimTableRow,
  mapping: BattleSkillColumnMapping,
): SkillFlatRow {
  const base = emptySkillFlatRow();
  const pick = (key: BattleSkillColumnMappingKey): string => cell(row, mapping[key]);

  const reactionRaw = pick('reactionTriggersJson');
  return {
    ...base,
    id: pick('id'),
    name: pick('name'),
    type: pick('type') || base.type,
    power: pick('power') || base.power,
    mpCost: pick('mpCost') || base.mpCost,
    maxCooldown: pick('maxCooldown') || base.maxCooldown,
    description: pick('description'),
    attachElement: pick('attachElement'),
    attachStrength: pick('attachStrength') || base.attachStrength,
    attachDuration: pick('attachDuration'),
    dotDamage: pick('dotDamage'),
    dotDuration: pick('dotDuration'),
    freezeDuration: pick('freezeDuration') || base.freezeDuration,
    specialType: pick('specialType'),
    specialValue: pick('specialValue'),
    specialDuration: pick('specialDuration'),
    reactionTriggers: reactionRaw ? parseReactionTriggersJson(reactionRaw) : [],
  };
}

export function isRowEffectivelyEmpty(row: SimTableRow, mapping: BattleSkillColumnMapping): boolean {
  const flat = mapLocalTableRowToFlatRow(row, mapping);
  return !flat.id.trim() && !flat.name.trim();
}

/**
 * Full validation: mapping + per-row conversion. Duplicate ids: first valid row wins.
 */
export function validateLocalTableSkills(
  meta: SimTableMeta | null,
  rows: SimTableRow[],
  mapping: BattleSkillColumnMapping,
): LocalTableSkillValidationResult {
  const mappingErrors = validateColumnMapping(meta, mapping);
  const rowErrors: { rowIndex: number; rowId: string; error: string }[] = [];

  if (mappingErrors.length > 0) {
    return {
      ok: false,
      skills: [],
      validRowCount: 0,
      skippedEmptyRows: 0,
      mappingErrors,
      rowErrors,
    };
  }

  const skills: Skill[] = [];
  const seenIds = new Set<string>();
  let skippedEmptyRows = 0;

  rows.forEach((row, rowIndex) => {
    if (isRowEffectivelyEmpty(row, mapping)) {
      skippedEmptyRows += 1;
      return;
    }
    const flat = mapLocalTableRowToFlatRow(row, mapping);
    const converted = flatRowToSkill(flat);
    if ('error' in converted) {
      rowErrors.push({ rowIndex: rowIndex + 1, rowId: row.id, error: converted.error });
      return;
    }
    if (seenIds.has(converted.skill.id)) {
      rowErrors.push({
        rowIndex: rowIndex + 1,
        rowId: row.id,
        error: `Duplicate skill id "${converted.skill.id}" (first row kept).`,
      });
      return;
    }
    seenIds.add(converted.skill.id);
    skills.push(converted.skill);
  });

  const finalMappingErrors = [...mappingErrors];
  if (skills.length === 0 && rowErrors.length === 0) {
    finalMappingErrors.push('No valid skill rows after mapping (check id and name columns).');
  }

  const ok = finalMappingErrors.length === 0 && rowErrors.length === 0 && skills.length > 0;

  return {
    ok,
    skills,
    validRowCount: skills.length,
    skippedEmptyRows,
    mappingErrors: finalMappingErrors,
    rowErrors,
  };
}

export async function loadAndValidateFromConfig(
  config: BattleLocalSkillSourceConfig,
  loadMeta: (id: string) => Promise<SimTableMeta | null>,
  loadRows: (id: string) => Promise<SimTableRow[]>,
): Promise<LocalTableSkillValidationResult> {
  if (!config.tableId) {
    return {
      ok: false,
      skills: [],
      validRowCount: 0,
      skippedEmptyRows: 0,
      mappingErrors: ['Select a local table.'],
      rowErrors: [],
    };
  }
  const meta = await loadMeta(config.tableId);
  const rows = await loadRows(config.tableId);
  return validateLocalTableSkills(meta, rows, config.columnMapping);
}
