/**
 * Load local / Studio-linked table columns and cell values for battle skill pickers.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SimTableMeta, SimTableRow } from '@/lib/simLocalTables/types';
import { SIM_LOCAL_WORKSPACE_TABLE_ID } from '@/lib/simLocalTables/constants';
import { getTableMeta, getTableRows, listTableMetas } from '@/lib/simLocalTables/simLocalTablesDb';
import { listLibraries } from '@studio/lib/services/libraryService';
import {
  getLibraryAssetsWithProperties,
  getLibrarySchema,
} from '@studio/lib/services/libraryAssetsService';
import { listProjects } from '@studio/lib/services/projectService';
import { AuthorizationError } from '@studio/lib/services/authorizationService';
import { cellToPickerOptions, dedupePickerOptions, type PickerValueOption } from './cellDisplayValue';

export type { PickerValueOption } from './cellDisplayValue';

export const ASSET_NAME_COLUMN_KEY = '__asset_name__';

/** Virtual table id for skill drafts bound directly to a Studio library (no local-table bookmark). */
export const STUDIO_SKILL_SOURCE_TABLE_PREFIX = 'studio:';

export type StudioLibraryOption = {
  libraryId: string;
  projectId: string;
  label: string;
};

export type SelectableTableInfo = {
  id: string;
  name: string;
  kind: 'scratch' | 'studio';
};

export type TableColumnInfo = {
  key: string;
  label: string;
};

export type TableRowOption = {
  id: string;
  label: string;
};

export function studioSkillSourceTableId(libraryId: string): string {
  return `${STUDIO_SKILL_SOURCE_TABLE_PREFIX}${libraryId}`;
}

export function parseStudioSkillSourceLibraryId(tableId: string): string | null {
  if (!tableId.startsWith(STUDIO_SKILL_SOURCE_TABLE_PREFIX)) return null;
  const libraryId = tableId.slice(STUDIO_SKILL_SOURCE_TABLE_PREFIX.length).trim();
  return libraryId || null;
}

export async function listStudioLibrariesForSkillImport(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudioLibraryOption[]> {
  const projects = await listProjects(supabase, userId);
  const pairs: StudioLibraryOption[] = [];
  for (const p of projects) {
    const libs = await listLibraries(supabase, p.id);
    for (const lib of libs) {
      pairs.push({
        projectId: p.id,
        libraryId: lib.id,
        label: `${p.name || p.id} / ${lib.name || lib.id}`,
      });
    }
  }
  pairs.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return pairs;
}

export async function loadStudioLibraryTableData(
  supabase: SupabaseClient,
  libraryId: string,
): Promise<{ columns: TableColumnInfo[]; rows: SimTableRow[] }> {
  return loadStudioColumnsAndRows(supabase, libraryId);
}

export async function loadStudioLibraryColumnValueOptions(
  supabase: SupabaseClient,
  libraryId: string,
  columnKey: string,
): Promise<PickerValueOption[]> {
  if (!columnKey) return [];
  const assets = await getLibraryAssetsWithProperties(supabase, libraryId);
  const assetNameById = new Map(assets.map((a) => [a.id, a.name?.trim() || a.id]));
  const options: PickerValueOption[] = [];
  for (const a of assets) {
    const raw = columnKey === ASSET_NAME_COLUMN_KEY ? a.name : a.propertyValues[columnKey];
    options.push(...cellToPickerOptions(raw, assetNameById));
  }
  return dedupePickerOptions(options);
}

export async function loadTableRows(
  supabase: SupabaseClient | null,
  tableId: string,
): Promise<{ meta: SimTableMeta; columns: TableColumnInfo[]; rows: SimTableRow[] } | null> {
  const studioLibraryId = parseStudioSkillSourceLibraryId(tableId);
  if (studioLibraryId) {
    if (!supabase) {
      return {
        meta: syntheticStudioLinkedMeta(tableId, studioLibraryId),
        columns: [],
        rows: [],
      };
    }
    const data = await tryLoadStudioColumnsAndRows(supabase, studioLibraryId);
    return {
      meta: syntheticStudioLinkedMeta(tableId, studioLibraryId),
      columns: data?.columns ?? [],
      rows: data?.rows ?? [],
    };
  }

  const meta = await getTableMeta(tableId);
  if (!meta) return null;

  if (meta.studioLibraryId) {
    if (!supabase) return { meta, columns: [], rows: [] };
    const data = await tryLoadStudioColumnsAndRows(supabase, meta.studioLibraryId);
    return { meta, columns: data?.columns ?? [], rows: data?.rows ?? [] };
  }

  return { meta, ...(await loadScratchColumnsAndRows(meta)) };
}

/** Row labels for the shared row picker (uses Name / first column). */
export function rowOptionsFromTable(
  columns: TableColumnInfo[],
  rows: SimTableRow[],
): TableRowOption[] {
  const labelKey =
    columns.find((c) => c.key === ASSET_NAME_COLUMN_KEY)?.key ?? columns[0]?.key;
  return rows.map((row, index) => {
    const raw = labelKey ? row.values[labelKey] : undefined;
    const label =
      raw === null || raw === undefined
        ? `Row ${index + 1}`
        : String(raw).trim() || `Row ${index + 1}`;
    return { id: row.id, label };
  });
}

export async function listSelectableSimTables(): Promise<SelectableTableInfo[]> {
  const metas = await listTableMetas();
  return metasToSelectableTableInfos(metas);
}

/** Local scratch/linked tables plus direct Studio libraries (when signed in). */
export async function listSelectableTablesForSkillPicker(
  supabase: SupabaseClient | null,
  userId?: string,
): Promise<SelectableTableInfo[]> {
  const metas = await listTableMetas();
  const local = metasToSelectableTableInfos(metas);

  if (!supabase || !userId) return local;

  const linkedStudioIds = new Set(
    metas.map((m) => m.studioLibraryId).filter((id): id is string => Boolean(id)),
  );

  const studioLibs = await listStudioLibrariesForSkillImport(supabase, userId);
  const directStudio: SelectableTableInfo[] = studioLibs
    .filter((l) => !linkedStudioIds.has(l.libraryId))
    .map((l) => ({
      id: studioSkillSourceTableId(l.libraryId),
      name: l.label,
      kind: 'studio' as const,
    }));

  return [...local, ...directStudio].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

function metasToSelectableTableInfos(metas: SimTableMeta[]): SelectableTableInfo[] {
  return metas
    .filter((m) => m.id !== SIM_LOCAL_WORKSPACE_TABLE_ID)
    .map((m) => ({
      id: m.id,
      name: m.studioLibraryId ? `${m.name} (Studio)` : m.name,
      kind: m.studioLibraryId ? ('studio' as const) : ('scratch' as const),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

async function loadScratchColumnsAndRows(
  meta: SimTableMeta,
): Promise<{ columns: TableColumnInfo[]; rows: SimTableRow[] }> {
  const rows = await getTableRows(meta.id);
  const columns = meta.columnKeys.map((key, i) => ({
    key,
    label: meta.columnLabels?.[i]?.trim() || key,
  }));
  return { columns, rows };
}

function syntheticStudioLinkedMeta(tableId: string, studioLibraryId: string): SimTableMeta {
  return {
    id: tableId,
    name: 'Keco Studio library',
    columnKeys: [],
    createdAt: 0,
    updatedAt: 0,
    dirty: false,
    studioLibraryId,
  };
}

function isStudioAccessError(err: unknown): boolean {
  return err instanceof AuthorizationError || (err as Error)?.name === 'AuthorizationError';
}

async function loadStudioColumnsAndRows(
  supabase: SupabaseClient,
  libraryId: string,
): Promise<{ columns: TableColumnInfo[]; rows: SimTableRow[] }> {
  const { properties } = await getLibrarySchema(supabase, libraryId);
  const assets = await getLibraryAssetsWithProperties(supabase, libraryId);
  const columns: TableColumnInfo[] = [
    { key: ASSET_NAME_COLUMN_KEY, label: 'Name' },
    ...properties.map((p) => ({
      key: p.key,
      label: p.name?.trim() || p.key,
    })),
  ];
  const rows: SimTableRow[] = assets.map((a) => {
    const values: Record<string, string> = {
      [ASSET_NAME_COLUMN_KEY]: a.name ?? '',
    };
    const assetNameById = new Map(assets.map((a) => [a.id, a.name?.trim() || a.id]));
    for (const p of properties) {
      const opts = cellToPickerOptions(a.propertyValues[p.key], assetNameById);
      values[p.key] = opts[0]?.value ?? '';
    }
    return { id: a.id, values };
  });
  return { columns, rows };
}

async function tryLoadStudioColumnsAndRows(
  supabase: SupabaseClient,
  libraryId: string,
): Promise<{ columns: TableColumnInfo[]; rows: SimTableRow[] } | null> {
  try {
    return await loadStudioColumnsAndRows(supabase, libraryId);
  } catch (err) {
    if (isStudioAccessError(err)) {
      console.warn(
        `[simulation] Studio library unavailable (${libraryId}):`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
    throw err;
  }
}

export async function loadTableColumns(
  supabase: SupabaseClient | null,
  tableId: string,
): Promise<{ meta: SimTableMeta; columns: TableColumnInfo[] } | null> {
  const studioLibraryId = parseStudioSkillSourceLibraryId(tableId);
  if (studioLibraryId) {
    if (!supabase) {
      return { meta: syntheticStudioLinkedMeta(tableId, studioLibraryId), columns: [] };
    }
    const { columns } = (await tryLoadStudioColumnsAndRows(supabase, studioLibraryId)) ?? {
      columns: [],
    };
    return { meta: syntheticStudioLinkedMeta(tableId, studioLibraryId), columns };
  }

  const meta = await getTableMeta(tableId);
  if (!meta) return null;

  if (meta.studioLibraryId) {
    if (!supabase) return { meta, columns: [] };
    const data = await tryLoadStudioColumnsAndRows(supabase, meta.studioLibraryId);
    return { meta, columns: data?.columns ?? [] };
  }

  const { columns } = await loadScratchColumnsAndRows(meta);
  return { meta, columns };
}

export async function loadColumnValueOptions(
  supabase: SupabaseClient | null,
  tableId: string,
  columnKey: string,
): Promise<PickerValueOption[]> {
  const studioLibraryId = parseStudioSkillSourceLibraryId(tableId);
  if (studioLibraryId) {
    if (!supabase) return [];
    return loadStudioLibraryColumnValueOptions(supabase, studioLibraryId, columnKey);
  }

  const meta = await getTableMeta(tableId);
  if (!meta || !columnKey) return [];

  if (meta.studioLibraryId) {
    if (!supabase) return [];
    try {
      const { properties } = await getLibrarySchema(supabase, meta.studioLibraryId);
      const assets = await getLibraryAssetsWithProperties(supabase, meta.studioLibraryId);
      const assetNameById = new Map(assets.map((a) => [a.id, a.name?.trim() || a.id]));
      const options: PickerValueOption[] = [];
      for (const a of assets) {
        const raw =
          columnKey === ASSET_NAME_COLUMN_KEY
            ? a.name
            : a.propertyValues[columnKey];
        options.push(...cellToPickerOptions(raw, assetNameById));
      }
      return dedupePickerOptions(options);
    } catch (err) {
      if (isStudioAccessError(err)) {
        console.warn(
          `[simulation] Studio library unavailable (${meta.studioLibraryId}):`,
          err instanceof Error ? err.message : err,
        );
        return [];
      }
      throw err;
    }
  }

  const { rows } = await loadScratchColumnsAndRows(meta);
  const options: PickerValueOption[] = [];
  for (const row of rows) {
    const raw = row.values[columnKey] ?? '';
    options.push(...cellToPickerOptions(raw));
  }
  return dedupePickerOptions(options);
}
