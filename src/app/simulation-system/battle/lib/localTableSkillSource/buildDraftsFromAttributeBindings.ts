/**
 * Build one skill draft per anchor-table row from field → table + column bindings (no value pick).
 */

import type { SimTableRow } from '@/lib/simLocalTables/types';
import {
  BATTLE_SKILL_MAPPING_FIELDS,
  type BattleSkillColumnMappingKey,
} from './battleLocalTableSkillSource';
import type { BattleSkillDraft, LocalTableCellRef } from './battleSkillDrafts';
import { cellValueToString } from './cellDisplayValue';
import { detectIdColumnKey, findRowByIdCell } from './importSkillRowFromTable';
import { ASSET_NAME_COLUMN_KEY, type TableColumnInfo } from './simTablePickerData';

export type AttributeColumnBinding = {
  tableId: string;
  columnKey: string;
};

export type AttributeColumnBindings = Partial<
  Record<BattleSkillColumnMappingKey, AttributeColumnBinding>
>;

export function bindingFromCellRef(
  ref: LocalTableCellRef | undefined,
): AttributeColumnBinding | undefined {
  if (!ref?.tableId?.trim() || !ref.columnKey?.trim()) return undefined;
  return { tableId: ref.tableId, columnKey: ref.columnKey };
}

export function attributeBindingsFromDraftFields(
  fields: Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>>,
): AttributeColumnBindings {
  const out: AttributeColumnBindings = {};
  for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
    const binding = bindingFromCellRef(fields[f.key]);
    if (binding) out[f.key] = binding;
  }
  return out;
}

export function hasAnchorIdBinding(bindings: AttributeColumnBindings): boolean {
  const id = bindings.id;
  return Boolean(id?.tableId && id.columnKey);
}

/** Resolve which column to match skill id values in a (possibly non-anchor) table. */
export function resolveIdColumnKeyForTable(
  tableId: string,
  anchorIdBinding: AttributeColumnBinding,
  columns: TableColumnInfo[],
): string | null {
  if (anchorIdBinding.tableId === tableId) return anchorIdBinding.columnKey;
  const detected = detectIdColumnKey(columns);
  if (detected) return detected;
  if (columns.some((c) => c.key === anchorIdBinding.columnKey)) {
    return anchorIdBinding.columnKey;
  }
  return null;
}

export function findRowForSkillIdInTable(args: {
  tableId: string;
  skillIdValue: string;
  anchorIdBinding: AttributeColumnBinding;
  rows: SimTableRow[];
  columns: TableColumnInfo[];
  /** When set and table is anchor, prefer this row (stable Studio/scratch id). */
  preferredRowId?: string;
}): SimTableRow | null {
  const { tableId, skillIdValue, anchorIdBinding, rows, columns, preferredRowId } = args;
  if (tableId === anchorIdBinding.tableId && preferredRowId) {
    const byStableId = rows.find((r) => r.id === preferredRowId);
    if (byStableId) return byStableId;
  }
  const idColumnKey = resolveIdColumnKeyForTable(tableId, anchorIdBinding, columns);
  if (!idColumnKey) return null;
  return findRowByIdCell(rows, idColumnKey, skillIdValue);
}

function readCell(row: SimTableRow, columnKey: string): string {
  return cellValueToString(row.values[columnKey]).trim();
}

function resolveFieldValue(args: {
  binding: AttributeColumnBinding;
  skillIdValue: string;
  anchorRow: SimTableRow;
  anchorIdBinding: AttributeColumnBinding;
  rowsByTable: Map<string, SimTableRow[]>;
  columnsByTable: Map<string, TableColumnInfo[]>;
}): string {
  const { binding, skillIdValue, anchorRow, anchorIdBinding, rowsByTable, columnsByTable } = args;

  if (binding.tableId === anchorIdBinding.tableId) {
    return readCell(anchorRow, binding.columnKey);
  }

  const rows = rowsByTable.get(binding.tableId) ?? [];
  const columns = columnsByTable.get(binding.tableId) ?? [];
  const row = findRowForSkillIdInTable({
    tableId: binding.tableId,
    skillIdValue,
    anchorIdBinding,
    rows,
    columns,
  });
  if (!row) return '';
  return readCell(row, binding.columnKey);
}

function applyNameFallback(
  fields: Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>>,
  anchorRow: SimTableRow,
  anchorIdBinding: AttributeColumnBinding,
): void {
  if (fields.name?.value?.trim()) return;

  const nameBinding = bindingFromCellRef(fields.name);
  const idValue = fields.id?.value?.trim() ?? '';
  const assetName = readCell(anchorRow, ASSET_NAME_COLUMN_KEY);
  const fallback =
    (nameBinding ? readCell(anchorRow, nameBinding.columnKey) : '') || assetName || idValue;
  if (!fallback) return;

  fields.name = {
    tableId: nameBinding?.tableId ?? anchorIdBinding.tableId,
    columnKey: nameBinding?.columnKey ?? ASSET_NAME_COLUMN_KEY,
    value: fallback,
  };
}

export function buildDraftsFromAttributeBindings(args: {
  bindings: AttributeColumnBindings;
  rowsByTable: Map<string, SimTableRow[]>;
  columnsByTable: Map<string, TableColumnInfo[]>;
}): BattleSkillDraft[] {
  const { bindings, rowsByTable, columnsByTable } = args;
  const anchorIdBinding = bindings.id;
  if (!anchorIdBinding?.tableId || !anchorIdBinding.columnKey) return [];

  const anchorRows = rowsByTable.get(anchorIdBinding.tableId) ?? [];
  const drafts: BattleSkillDraft[] = [];

  for (const anchorRow of anchorRows) {
    const skillIdValue = readCell(anchorRow, anchorIdBinding.columnKey);
    if (!skillIdValue) continue;

    const fields: Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>> = {};

    for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
      const binding = bindings[f.key];
      if (!binding) continue;
      const value = resolveFieldValue({
        binding,
        skillIdValue,
        anchorRow,
        anchorIdBinding,
        rowsByTable,
        columnsByTable,
      });
      fields[f.key] = {
        tableId: binding.tableId,
        columnKey: binding.columnKey,
        value,
      };
    }

    applyNameFallback(fields, anchorRow, anchorIdBinding);

    drafts.push({
      draftId: crypto.randomUUID(),
      sourceRowId: anchorRow.id,
      fields,
    });
  }

  return drafts;
}

export function refreshDraftFromLiveTables(
  draft: BattleSkillDraft,
  rowsByTable: Map<string, SimTableRow[]>,
  columnsByTable: Map<string, TableColumnInfo[]>,
): { draft: BattleSkillDraft; ok: boolean } {
  const bindings = attributeBindingsFromDraftFields(draft.fields);
  const anchorIdBinding = bindings.id;
  if (!anchorIdBinding) return { draft, ok: false };

  const skillIdValue = draft.fields.id?.value?.trim();
  if (!skillIdValue) return { draft, ok: false };

  const anchorRows = rowsByTable.get(anchorIdBinding.tableId) ?? [];
  const anchorColumns = columnsByTable.get(anchorIdBinding.tableId) ?? [];
  const anchorRow = findRowForSkillIdInTable({
    tableId: anchorIdBinding.tableId,
    skillIdValue,
    anchorIdBinding,
    rows: anchorRows,
    columns: anchorColumns,
    preferredRowId: draft.sourceRowId,
  });
  if (!anchorRow) return { draft, ok: false };

  const fields = { ...draft.fields };
  for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
    const binding = bindings[f.key];
    const ref = fields[f.key];
    if (!binding || !ref?.columnKey) continue;
    const value = resolveFieldValue({
      binding,
      skillIdValue,
      anchorRow,
      anchorIdBinding,
      rowsByTable,
      columnsByTable,
    });
    fields[f.key] = { ...ref, value };
  }

  return {
    draft: { ...draft, sourceRowId: anchorRow.id, fields },
    ok: true,
  };
}
