/**
 * Live-linked battle unit import history (binds to table row, not static snapshots).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BattleUnitColumnMappingKey, BattleUnitConfig } from './localTableSkillSource/battleUnitSource';
import {
  findRowByIdCell,
  planUnitImportColumnMapping,
  resolveUnitConfigFromTableRow,
} from './localTableSkillSource/importUnitRowFromTable';
import { loadTableRows } from './localTableSkillSource/simTablePickerData';

export type BattleUnitImportBinding = {
  id: string;
  tableId: string;
  tableName: string;
  idColumnKey: string;
  unitIdValue: string;
  columnResolutions: Record<string, BattleUnitColumnMappingKey>;
  importedAt: number;
};

export type BattleUnitConfigSource =
  | { kind: 'manual' }
  | { kind: 'binding'; bindingId: string };

export type UnitImportResult = {
  config: BattleUnitConfig;
  /** Present when imported by table row id; omitted for manual-only edits. */
  binding?: Omit<BattleUnitImportBinding, 'id' | 'importedAt'>;
};

export const MAX_UNIT_IMPORT_HISTORY = 50;

export function createImportBindingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `unit-import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function bindingIdentityKey(binding: Pick<
  BattleUnitImportBinding,
  'tableId' | 'idColumnKey' | 'unitIdValue'
>): string {
  return `${binding.tableId}\0${binding.idColumnKey}\0${binding.unitIdValue.trim().toLowerCase()}`;
}

export function formatImportHistoryLabel(
  binding: BattleUnitImportBinding,
  resolvedName?: string,
): string {
  const name = resolvedName?.trim() || binding.unitIdValue.trim();
  const table = binding.tableName.trim() || binding.tableId;
  return `${name} · ${table}`;
}

export function findImportBinding(
  history: BattleUnitImportBinding[],
  bindingId: string,
): BattleUnitImportBinding | undefined {
  return history.find((b) => b.id === bindingId);
}

export function upsertImportHistoryEntry(
  history: BattleUnitImportBinding[],
  entry: BattleUnitImportBinding,
): BattleUnitImportBinding[] {
  const wantKey = bindingIdentityKey(entry);
  const without = history.filter((h) => bindingIdentityKey(h) !== wantKey);
  return [entry, ...without].slice(0, MAX_UNIT_IMPORT_HISTORY);
}

export function columnMapToResolutions(
  columnToField: Map<string, BattleUnitColumnMappingKey>,
): Record<string, BattleUnitColumnMappingKey> {
  return Object.fromEntries(columnToField);
}

export type ResolveUnitBindingResult =
  | { status: 'ok'; config: BattleUnitConfig }
  | { status: 'error'; error: string; rowMissing?: boolean };

export async function resolveUnitConfigFromBinding(
  binding: BattleUnitImportBinding,
  fallback: BattleUnitConfig,
  supabase: SupabaseClient | null,
): Promise<ResolveUnitBindingResult> {
  const loaded = await loadTableRows(supabase, binding.tableId);
  if (!loaded) {
    return { status: 'error' as const, error: 'Failed to load source table' };
  }

  const plan = planUnitImportColumnMapping(loaded.columns, binding.columnResolutions);
  if (plan.ambiguities.length > 0) {
    return {
      status: 'error' as const,
      error: 'Column mapping is ambiguous; re-import this row to refresh bindings',
    };
  }

  const row = findRowByIdCell(loaded.rows, binding.idColumnKey, binding.unitIdValue);
  if (!row) {
    return {
      status: 'error' as const,
      error: `Source row not found for id "${binding.unitIdValue.trim()}"`,
      rowMissing: true,
    };
  }

  const result = resolveUnitConfigFromTableRow({
    tableId: binding.tableId,
    row,
    columnToField: plan.columnToField,
    idColumnKey: binding.idColumnKey,
    idValue: binding.unitIdValue,
    fallback,
  });
  if ('error' in result) {
    return { status: 'error' as const, error: result.error };
  }
  return { status: 'ok' as const, config: result.config };
}

export function removeImportHistoryEntry(
  history: BattleUnitImportBinding[],
  bindingId: string,
): BattleUnitImportBinding[] {
  return history.filter((entry) => entry.id !== bindingId);
}

export function resolveConfigSourceAfterDelete(
  source: BattleUnitConfigSource,
  bindingId: string,
): BattleUnitConfigSource {
  if (source.kind === 'binding' && source.bindingId === bindingId) {
    return { kind: 'manual' };
  }
  return source;
}

export function sanitizeImportBinding(raw: unknown): BattleUnitImportBinding | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
  const tableId = typeof o.tableId === 'string' && o.tableId.trim() ? o.tableId.trim() : null;
  const tableName = typeof o.tableName === 'string' ? o.tableName.trim() : '';
  const idColumnKey =
    typeof o.idColumnKey === 'string' && o.idColumnKey.trim() ? o.idColumnKey.trim() : null;
  const unitIdValue =
    typeof o.unitIdValue === 'string' && o.unitIdValue.trim() ? o.unitIdValue.trim() : null;
  if (!id || !tableId || !idColumnKey || !unitIdValue) return null;

  const columnResolutions: Record<string, BattleUnitColumnMappingKey> = {};
  if (o.columnResolutions && typeof o.columnResolutions === 'object') {
    const validKeys = new Set<BattleUnitColumnMappingKey>(['name', 'hp', 'atk', 'def', 'spd', 'mp']);
    for (const [colKey, fieldKey] of Object.entries(o.columnResolutions as Record<string, unknown>)) {
      if (typeof colKey !== 'string' || !colKey.trim()) continue;
      if (typeof fieldKey !== 'string' || !validKeys.has(fieldKey as BattleUnitColumnMappingKey)) continue;
      columnResolutions[colKey] = fieldKey as BattleUnitColumnMappingKey;
    }
  }

  const importedAt =
    typeof o.importedAt === 'number' && Number.isFinite(o.importedAt)
      ? Math.floor(o.importedAt)
      : Date.now();

  return {
    id,
    tableId,
    tableName: tableName || tableId,
    idColumnKey,
    unitIdValue,
    columnResolutions,
    importedAt,
  };
}

export function sanitizeImportHistory(raw: unknown): BattleUnitImportBinding[] {
  if (!Array.isArray(raw)) return [];
  const out: BattleUnitImportBinding[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const binding = sanitizeImportBinding(item);
    if (!binding) continue;
    const key = bindingIdentityKey(binding);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(binding);
    if (out.length >= MAX_UNIT_IMPORT_HISTORY) break;
  }
  return out;
}

export function sanitizeConfigSource(
  raw: unknown,
  history: BattleUnitImportBinding[],
): BattleUnitConfigSource {
  if (!raw || typeof raw !== 'object') return { kind: 'manual' };
  const o = raw as Record<string, unknown>;
  if (o.kind === 'binding' && typeof o.bindingId === 'string') {
    const id = o.bindingId.trim();
    if (id && findImportBinding(history, id)) {
      return { kind: 'binding', bindingId: id };
    }
  }
  return { kind: 'manual' };
}
