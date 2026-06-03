/**
 * Import battle unit stats from a table row (by id + header mapping).
 */

import {
  BATTLE_UNIT_MAPPING_FIELDS,
  type BattleUnitColumnMappingKey,
  type BattleUnitConfig,
} from './battleUnitSource';
import type { LocalTableCellRef } from './battleSkillDrafts';
import { cellValueToString } from './cellDisplayValue';
import { ASSET_NAME_COLUMN_KEY, type TableColumnInfo } from './simTablePickerData';
import type { SimTableRow } from '@/lib/simLocalTables/types';
import { normalizeHeaderToken } from './importSkillRowFromTable';

const HEADER_UNIT_CANDIDATES: Record<string, BattleUnitColumnMappingKey[]> = {
  name: ['name'],
  displayname: ['name'],
  unitname: ['name'],
  charactername: ['name'],
  charname: ['name'],
  title: ['name'],
  hp: ['hp'],
  maxhp: ['hp'],
  health: ['hp'],
  hitpoints: ['hp'],
  atk: ['atk'],
  attack: ['atk'],
  att: ['atk'],
  def: ['def'],
  defense: ['def'],
  defence: ['def'],
  spd: ['spd'],
  speed: ['spd'],
  mp: ['mp'],
  maxmp: ['mp'],
  mana: ['mp'],
  manapoints: ['mp'],
  id: [],
  unitid: [],
  characterid: [],
};

export type UnitImportHeaderAmbiguity = {
  kind: 'header';
  columnKey: string;
  columnLabel: string;
  candidates: BattleUnitColumnMappingKey[];
};

export type UnitImportColumnCollision = {
  kind: 'columnCollision';
  unitKey: BattleUnitColumnMappingKey;
  columns: { columnKey: string; columnLabel: string }[];
};

export type UnitImportAmbiguity = UnitImportHeaderAmbiguity | UnitImportColumnCollision;

export type UnitImportMappingPlan = {
  columnToField: Map<string, BattleUnitColumnMappingKey>;
  ambiguities: UnitImportAmbiguity[];
  unmappedColumnKeys: string[];
};

function unitKeysForHeaderToken(token: string): BattleUnitColumnMappingKey[] {
  const norm = normalizeHeaderToken(token);
  if (!norm) return [];
  return HEADER_UNIT_CANDIDATES[norm] ?? [];
}

function candidatesForColumn(col: TableColumnInfo): BattleUnitColumnMappingKey[] {
  if (col.key === ASSET_NAME_COLUMN_KEY) return ['name'];
  const fromLabel = unitKeysForHeaderToken(col.label);
  const fromKey = unitKeysForHeaderToken(col.key);
  return [...new Set([...fromLabel, ...fromKey])];
}

export function planUnitImportColumnMapping(
  columns: TableColumnInfo[],
  resolutions: Record<string, BattleUnitColumnMappingKey> = {},
): UnitImportMappingPlan {
  const columnToField = new Map<string, BattleUnitColumnMappingKey>();
  const ambiguities: UnitImportAmbiguity[] = [];
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

  const byUnit = new Map<BattleUnitColumnMappingKey, { columnKey: string; columnLabel: string }[]>();
  for (const col of columns) {
    const unitKey = columnToField.get(col.key);
    if (!unitKey) continue;
    const list = byUnit.get(unitKey) ?? [];
    list.push({ columnKey: col.key, columnLabel: col.label });
    byUnit.set(unitKey, list);
  }

  for (const [unitKey, cols] of byUnit) {
    if (cols.length <= 1) continue;
    const resolved = cols.find((c) => resolutions[c.columnKey] === unitKey);
    if (resolved) {
      for (const c of cols) {
        if (c.columnKey !== resolved.columnKey) columnToField.delete(c.columnKey);
      }
      columnToField.set(resolved.columnKey, unitKey);
      continue;
    }
    ambiguities.push({ kind: 'columnCollision', unitKey, columns: cols });
  }

  return { columnToField, ambiguities, unmappedColumnKeys };
}

export function detectUnitIdColumnKey(columns: TableColumnInfo[]): string | undefined {
  const hit = columns.find((c) => {
    const nLabel = normalizeHeaderToken(c.label);
    const nKey = normalizeHeaderToken(c.key);
    return (
      nLabel === 'id' ||
      nKey === 'id' ||
      nLabel === 'unitid' ||
      nKey === 'unitid' ||
      nLabel === 'characterid' ||
      nKey === 'characterid'
    );
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

export function buildUnitFieldsFromTableRow(args: {
  tableId: string;
  row: SimTableRow;
  columnToField: Map<string, BattleUnitColumnMappingKey>;
  idColumnKey: string;
  idValue: string;
}): Partial<Record<BattleUnitColumnMappingKey, LocalTableCellRef>> {
  const { tableId, row, columnToField, idColumnKey, idValue } = args;
  const fields: Partial<Record<BattleUnitColumnMappingKey, LocalTableCellRef>> = {};

  for (const [columnKey, unitKey] of columnToField) {
    const raw = row.values[columnKey];
    const value = cellValueToString(raw).trim();
    if (!value) continue;
    fields[unitKey] = { tableId, columnKey, value };
  }

  if (!fields.name?.value?.trim()) {
    const nameCol = [...columnToField.entries()].find(([, k]) => k === 'name')?.[0];
    const assetName = cellValueToString(row.values[ASSET_NAME_COLUMN_KEY]).trim();
    const idFromRow = cellValueToString(row.values[idColumnKey]).trim();
    const fallback =
      (nameCol ? cellValueToString(row.values[nameCol]).trim() : '') ||
      assetName ||
      idFromRow ||
      idValue.trim();
    fields.name = {
      tableId,
      columnKey: nameCol ?? (assetName ? ASSET_NAME_COLUMN_KEY : idColumnKey),
      value: fallback,
    };
  }

  return fields;
}

function parseStat(value: string | undefined, fallback: number, min: number): number {
  if (!value?.trim()) return fallback;
  const n = Number(value.trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.floor(n));
}

export function unitFieldsToConfig(
  fields: Partial<Record<BattleUnitColumnMappingKey, LocalTableCellRef>>,
  fallback: BattleUnitConfig,
): { config: BattleUnitConfig } | { error: string } {
  const name = fields.name?.value?.trim();
  if (!name) {
    return { error: 'Name is required. Map a name column or pick a row with a display name.' };
  }

  return {
    config: {
      name,
      hp: parseStat(fields.hp?.value, fallback.hp, 1),
      atk: parseStat(fields.atk?.value, fallback.atk, 1),
      def: parseStat(fields.def?.value, fallback.def, 0),
      spd: parseStat(fields.spd?.value, fallback.spd, 1),
      mp: parseStat(fields.mp?.value, fallback.mp, 1),
    },
  };
}

export function unitFieldLabel(key: BattleUnitColumnMappingKey): string {
  return BATTLE_UNIT_MAPPING_FIELDS.find((f) => f.key === key)?.label ?? key;
}
