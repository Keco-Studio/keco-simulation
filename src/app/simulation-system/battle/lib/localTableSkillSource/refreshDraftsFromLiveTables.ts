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
import { cellValueToString } from './cellDisplayValue';
import { findRowByIdCell } from './importSkillRowFromTable';
import { loadTableRows } from './simTablePickerData';

export type DraftRefreshWarning = {
  draftId: string;
  label: string;
  warning: string;
};

export type RefreshDraftsFromLiveTablesResult = {
  drafts: BattleSkillDraft[];
  warnings: DraftRefreshWarning[];
};

function draftLabel(draft: BattleSkillDraft, index: number): string {
  return (
    draft.fields.name?.value?.trim() ||
    draft.fields.id?.value?.trim() ||
    `Skill ${index + 1}`
  );
}

function anchorTableId(draft: BattleSkillDraft): string | null {
  const idTable = draft.fields.id?.tableId?.trim();
  if (idTable) return idTable;
  for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
    const tid = draft.fields[f.key]?.tableId?.trim();
    if (tid) return tid;
  }
  return null;
}

function findRowForDraft(draft: BattleSkillDraft, rows: SimTableRow[]): SimTableRow | null {
  if (draft.sourceRowId) {
    const byId = rows.find((r) => r.id === draft.sourceRowId);
    if (byId) return byId;
  }
  const idRef = draft.fields.id;
  if (!idRef?.columnKey || !idRef.value?.trim()) return null;
  return findRowByIdCell(rows, idRef.columnKey, idRef.value);
}

function applyRowToDraft(
  draft: BattleSkillDraft,
  row: SimTableRow,
  tableId: string,
): BattleSkillDraft {
  const fields = { ...draft.fields };
  for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
    const ref = fields[f.key];
    if (!ref || ref.tableId !== tableId || !ref.columnKey) continue;
    const live = cellValueToString(row.values[ref.columnKey]).trim();
    fields[f.key] = { ...ref, value: live };
  }
  return { ...draft, sourceRowId: row.id, fields };
}

export async function refreshDraftsFromLiveTables(
  drafts: BattleSkillDraft[],
  loadRows: (tableId: string) => Promise<SimTableRow[] | null>,
): Promise<RefreshDraftsFromLiveTablesResult> {
  const rowCache = new Map<string, SimTableRow[]>();
  const warnings: DraftRefreshWarning[] = [];
  const next: BattleSkillDraft[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    const tableId = anchorTableId(draft);
    if (!tableId) {
      next.push(draft);
      continue;
    }

    let rows = rowCache.get(tableId);
    if (rows === undefined) {
      rows = (await loadRows(tableId)) ?? [];
      rowCache.set(tableId, rows);
    }

    const row = findRowForDraft(draft, rows);
    if (!row) {
      warnings.push({
        draftId: draft.draftId,
        label: draftLabel(draft, i),
        warning:
          'Source table row not found (id may have changed). Using last saved field values.',
      });
      next.push(draft);
      continue;
    }

    next.push(applyRowToDraft(draft, row, tableId));
  }

  return { drafts: next, warnings };
}

export async function refreshDraftsFromLiveTablesWithSupabase(
  supabase: SupabaseClient | null,
  drafts: BattleSkillDraft[],
): Promise<RefreshDraftsFromLiveTablesResult> {
  return refreshDraftsFromLiveTables(drafts, async (tableId) => {
    const loaded = await loadTableRows(supabase, tableId);
    return loaded?.rows ?? null;
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
