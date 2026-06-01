/**
 * Import one battle skill draft from a table row (Import by id + header → field mapping).
 */

import {
  BATTLE_SKILL_MAPPING_FIELDS,
  type BattleSkillColumnMappingKey,
} from './battleLocalTableSkillSource';
import type { BattleSkillDraft, LocalTableCellRef } from './battleSkillDrafts';
import { cellValueToString } from './cellDisplayValue';
import { ASSET_NAME_COLUMN_KEY, type TableColumnInfo } from './simTablePickerData';
import type { SimTableRow } from '@/lib/simLocalTables/types';

/** Normalize header / column key for case-insensitive alias lookup. */
export function normalizeHeaderToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/** Aliases: normalized header → possible battle skill fields (length > 1 = ambiguous). */
const HEADER_SKILL_CANDIDATES: Record<string, BattleSkillColumnMappingKey[]> = {
  id: ['id'],
  skillid: ['id'],
  name: ['name'],
  displayname: ['name'],
  display: ['name'],
  skillname: ['name'],
  title: ['name'],
  type: ['type'],
  skilltype: ['type'],
  power: ['power'],
  mp: ['mpCost'],
  mpcost: ['mpCost'],
  manacost: ['mpCost'],
  manacostmp: ['mpCost'],
  maxcooldown: ['maxCooldown'],
  cooldown: ['maxCooldown'],
  cd: ['maxCooldown'],
  maxcd: ['maxCooldown'],
  description: ['description'],
  desc: ['description'],
  attachelement: ['attachElement'],
  element: ['attachElement'],
  attachstrength: ['attachStrength'],
  strength: ['attachStrength'],
  attachduration: ['attachDuration'],
  attachturns: ['attachDuration'],
  attachturn: ['attachDuration'],
  duration: ['attachDuration', 'dotDuration', 'specialDuration'],
  dotdamage: ['dotDamage'],
  dotpower: ['dotDamage'],
  dotduration: ['dotDuration'],
  dotturns: ['dotDuration'],
  freezeduration: ['freezeDuration'],
  freezeturns: ['freezeDuration'],
  freeze: ['freezeDuration'],
  special: ['specialType'],
  specialtype: ['specialType'],
  specialvalue: ['specialValue'],
  specialduration: ['specialDuration'],
  reactiontriggersjson: ['reactionTriggersJson'],
  reactiontriggers: ['reactionTriggersJson'],
  reactions: ['reactionTriggersJson'],
};

export type ImportHeaderAmbiguity = {
  kind: 'header';
  columnKey: string;
  columnLabel: string;
  candidates: BattleSkillColumnMappingKey[];
};

export type ImportColumnCollision = {
  kind: 'columnCollision';
  skillKey: BattleSkillColumnMappingKey;
  columns: { columnKey: string; columnLabel: string }[];
};

export type ImportAmbiguity = ImportHeaderAmbiguity | ImportColumnCollision;

export type ImportMappingPlan = {
  columnToField: Map<string, BattleSkillColumnMappingKey>;
  ambiguities: ImportAmbiguity[];
  unmappedColumnKeys: string[];
};

function skillKeysForHeaderToken(token: string): BattleSkillColumnMappingKey[] {
  const norm = normalizeHeaderToken(token);
  if (!norm) return [];
  return HEADER_SKILL_CANDIDATES[norm] ?? [];
}

function candidatesForColumn(col: TableColumnInfo): BattleSkillColumnMappingKey[] {
  // Studio asset name: fixed UI label "Name" is not a user-defined header; never auto-map.
  if (col.key === ASSET_NAME_COLUMN_KEY) return [];
  const fromLabel = skillKeysForHeaderToken(col.label);
  const fromKey = skillKeysForHeaderToken(col.key);
  const merged = new Set<BattleSkillColumnMappingKey>([...fromLabel, ...fromKey]);
  return [...merged];
}

/** Plan column → skill field mapping; pass resolutions to settle ambiguities from UI. */
export function planImportColumnMapping(
  columns: TableColumnInfo[],
  resolutions: Record<string, BattleSkillColumnMappingKey> = {},
): ImportMappingPlan {
  const columnToField = new Map<string, BattleSkillColumnMappingKey>();
  const ambiguities: ImportAmbiguity[] = [];
  const unmappedColumnKeys: string[] = [];

  for (const col of columns) {
    if (resolutions[col.key]) {
      columnToField.set(col.key, resolutions[col.key]!);
      continue;
    }

    const candidates = candidatesForColumn(col);
    if (candidates.length === 0) {
      unmappedColumnKeys.push(col.key);
      continue;
    }
    if (candidates.length > 1) {
      ambiguities.push({
        kind: 'header',
        columnKey: col.key,
        columnLabel: col.label,
        candidates,
      });
      continue;
    }
    columnToField.set(col.key, candidates[0]!);
  }

  const bySkill = new Map<BattleSkillColumnMappingKey, { columnKey: string; columnLabel: string }[]>();
  for (const col of columns) {
    const skillKey = columnToField.get(col.key);
    if (!skillKey) continue;
    const list = bySkill.get(skillKey) ?? [];
    list.push({ columnKey: col.key, columnLabel: col.label });
    bySkill.set(skillKey, list);
  }

  for (const [skillKey, cols] of bySkill) {
    if (cols.length <= 1) continue;
    const resolved = cols.find((c) => resolutions[c.columnKey] === skillKey);
    if (resolved) {
      for (const c of cols) {
        if (c.columnKey !== resolved.columnKey) columnToField.delete(c.columnKey);
      }
      columnToField.set(resolved.columnKey, skillKey);
      continue;
    }
    ambiguities.push({ kind: 'columnCollision', skillKey, columns: cols });
  }

  return { columnToField, ambiguities, unmappedColumnKeys };
}

export function detectIdColumnKey(columns: TableColumnInfo[]): string | undefined {
  const hit = columns.find((c) => {
    const nLabel = normalizeHeaderToken(c.label);
    const nKey = normalizeHeaderToken(c.key);
    return nLabel === 'id' || nKey === 'id' || nLabel === 'skillid' || nKey === 'skillid';
  });
  return hit?.key;
}

export function findRowByIdCell(
  rows: SimTableRow[],
  idColumnKey: string,
  idValue: string,
): SimTableRow | null {
  const want = idValue.trim().toLowerCase();
  if (!want) return null;
  for (const row of rows) {
    const cell = cellValueToString(row.values[idColumnKey]).trim().toLowerCase();
    if (cell === want) return row;
  }
  return null;
}

export function buildDraftFromTableRow(args: {
  tableId: string;
  row: SimTableRow;
  columnToField: Map<string, BattleSkillColumnMappingKey>;
  idColumnKey: string;
  skillIdValue: string;
}): BattleSkillDraft {
  const { tableId, row, columnToField, idColumnKey, skillIdValue } = args;
  const fields: Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>> = {};

  const idFromRow = cellValueToString(row.values[idColumnKey]).trim();
  const idStored = idFromRow || skillIdValue.trim();
  fields.id = { tableId, columnKey: idColumnKey, value: idStored };

  for (const [columnKey, skillKey] of columnToField) {
    if (skillKey === 'id') continue;
    const raw = row.values[columnKey];
    const value = cellValueToString(raw).trim();
    if (!value) continue;
    fields[skillKey] = { tableId, columnKey, value };
  }

  if (!fields.name?.value?.trim()) {
    const nameCol = [...columnToField.entries()].find(([, k]) => k === 'name')?.[0];
    const assetName = cellValueToString(row.values[ASSET_NAME_COLUMN_KEY]).trim();
    const fallback =
      (nameCol ? cellValueToString(row.values[nameCol]).trim() : '') || assetName || idStored;
    fields.name = {
      tableId,
      columnKey: nameCol ?? (assetName ? ASSET_NAME_COLUMN_KEY : idColumnKey),
      value: fallback,
    };
  }

  return { draftId: crypto.randomUUID(), sourceRowId: row.id, fields };
}

export function skillFieldLabel(key: BattleSkillColumnMappingKey): string {
  return BATTLE_SKILL_MAPPING_FIELDS.find((f) => f.key === key)?.label ?? key;
}
