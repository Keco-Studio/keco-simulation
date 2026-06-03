/**
 * Re-read skill draft field values from live table rows (table + column bindings).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SimTableRow } from '@/lib/simLocalTables/types';
import {
  BATTLE_SKILL_MAPPING_FIELDS,
  type BattleSkillColumnMappingKey,
} from './battleLocalTableSkillSource';
import type { BattleSkillDraft, SkillDraftValidationResult } from './battleSkillDrafts';
import { saveBattleSkillDrafts, validateSkillDrafts } from './battleSkillDrafts';
import { attributeBindingsFromDraftFields, refreshDraftFromLiveTables } from './buildDraftsFromAttributeBindings';
import { loadTableRows, type TableColumnInfo } from './simTablePickerData';

export type DraftRefreshWarning = {
  draftId: string;
  label: string;
  warning: string;
};

export type RefreshDraftsFromLiveTablesResult = {
  drafts: BattleSkillDraft[];
  warnings: DraftRefreshWarning[];
};

type TableSnapshot = {
  rows: SimTableRow[];
  columns: TableColumnInfo[];
};

function draftLabel(draft: BattleSkillDraft, index: number): string {
  return (
    draft.fields.name?.value?.trim() ||
    draft.fields.id?.value?.trim() ||
    `Skill ${index + 1}`
  );
}

function collectTableIds(draft: BattleSkillDraft): string[] {
  const ids = new Set<string>();
  const bindings = attributeBindingsFromDraftFields(draft.fields);
  for (const binding of Object.values(bindings)) {
    if (binding?.tableId) ids.add(binding.tableId);
  }
  return [...ids];
}

export async function refreshDraftsFromLiveTables(
  drafts: BattleSkillDraft[],
  loadTable: (tableId: string) => Promise<TableSnapshot | null>,
): Promise<RefreshDraftsFromLiveTablesResult> {
  const tableCache = new Map<string, TableSnapshot>();
  const warnings: DraftRefreshWarning[] = [];
  const next: BattleSkillDraft[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    const tableIds = collectTableIds(draft);
    if (tableIds.length === 0) {
      next.push(draft);
      continue;
    }

    const rowsByTable = new Map<string, TableSnapshot['rows']>();
    const columnsByTable = new Map<string, TableColumnInfo[]>();

    for (const tableId of tableIds) {
      let snapshot = tableCache.get(tableId);
      if (snapshot === undefined) {
        snapshot = (await loadTable(tableId)) ?? { rows: [], columns: [] };
        tableCache.set(tableId, snapshot);
      }
      rowsByTable.set(tableId, snapshot.rows);
      columnsByTable.set(tableId, snapshot.columns);
    }

    const refreshed = refreshDraftFromLiveTables(draft, rowsByTable, columnsByTable);
    if (!refreshed.ok) {
      warnings.push({
        draftId: draft.draftId,
        label: draftLabel(draft, i),
        warning:
          'Source table row not found (id may have changed). Using last saved field values.',
      });
      next.push(draft);
      continue;
    }

    next.push(refreshed.draft);
  }

  return { drafts: next, warnings };
}

export async function refreshDraftsFromLiveTablesWithSupabase(
  supabase: SupabaseClient | null,
  drafts: BattleSkillDraft[],
): Promise<RefreshDraftsFromLiveTablesResult> {
  return refreshDraftsFromLiveTables(drafts, async (tableId) => {
    const loaded = await loadTableRows(supabase, tableId);
    if (!loaded) return null;
    return { rows: loaded.rows, columns: loaded.columns };
  });
}

export type ValidateSkillDraftsFromLiveResult = SkillDraftValidationResult & {
  refreshedDrafts: BattleSkillDraft[];
  warnings: DraftRefreshWarning[];
};

/** Refresh field values from source tables, persist drafts, then validate. */
export async function validateSkillDraftsFromLiveTables(
  supabase: SupabaseClient | null,
  drafts: BattleSkillDraft[],
): Promise<ValidateSkillDraftsFromLiveResult> {
  const { drafts: refreshed, warnings } = await refreshDraftsFromLiveTablesWithSupabase(
    supabase,
    drafts,
  );
  saveBattleSkillDrafts(refreshed);
  const result = validateSkillDrafts(refreshed);
  return { ...result, refreshedDrafts: refreshed, warnings };
}
