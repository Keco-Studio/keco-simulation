import type { SimTableRow } from '@/lib/simLocalTables/types';
import type { ProgressionConfig, Rule, TrackDef, TrackKind, TrackParams } from '../types';
import { parseRuleParamsJson } from '../ruleParams';
import {
  PROGRESSION_RULE_COLUMNS as RC,
  PROGRESSION_TRACK_COLUMNS as TC,
} from './columnKeys';

export type StudioProgressionRow = {
  id: string;
  values: Record<string, string>;
};

const TRACK_KINDS: TrackKind[] = [
  'exp_level',
  'proficiency',
  'milestone',
  'rate_accrual',
  'custom',
];

function cell(row: StudioProgressionRow, key: string): string {
  return (row.values[key] ?? '').trim();
}

function parseBoolean(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (!v) return true;
  return v === 'true' || v === '1' || v === 'yes';
}

function parseTrackParams(raw: string, kind: TrackKind): TrackParams {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('missing_params');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('invalid_params_json');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_params_shape');
  }
  return parsed as TrackParams;
}

function mapTrackRow(row: StudioProgressionRow): TrackDef | null {
  const id = cell(row, TC.trackId);
  if (!id) return null;
  const kindRaw = cell(row, TC.kind);
  if (!TRACK_KINDS.includes(kindRaw as TrackKind)) return null;
  const kind = kindRaw as TrackKind;
  try {
    return {
      id,
      kind,
      label: cell(row, TC.label) || id,
      params: parseTrackParams(cell(row, TC.params), kind),
    };
  } catch {
    return null;
  }
}

function mapRuleRow(row: StudioProgressionRow): Rule | null {
  const id = cell(row, RC.ruleId);
  const whenType = cell(row, RC.whenType);
  const targetTrackId = cell(row, RC.targetTrackId);
  const rewardFormula = cell(row, RC.rewardFormula);
  if (!id || !whenType || !targetTrackId || !rewardFormula) return null;

  const filterRaw = cell(row, RC.filter);
  let params: Rule['params'];
  const paramsRaw = cell(row, RC.params);
  if (paramsRaw) {
    try {
      params = parseRuleParamsJson(paramsRaw);
    } catch {
      return null;
    }
  }

  return {
    id,
    enabled: parseBoolean(cell(row, RC.enabled)),
    whenType,
    filter: filterRaw || undefined,
    targetTrackId,
    rewardFormula,
    params,
  };
}

/** Map two Studio library row sets into a ProgressionConfig. Invalid rows are skipped. */
export function mapStudioRowsToProgressionConfig(
  trackRows: StudioProgressionRow[],
  ruleRows: StudioProgressionRow[],
): ProgressionConfig {
  const tracks = trackRows.map(mapTrackRow).filter((t): t is TrackDef => t !== null);
  const rules = ruleRows.map(mapRuleRow).filter((r): r is Rule => r !== null);
  return { tracks, rules };
}

type SimTableColumn = { key: string; label: string };

function cellValueToString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';
  if (typeof raw === 'number') return String(raw);
  return String(raw).trim();
}

/** camelCase / PascalCase column labels → snake_case (whenType → when_type). */
export function normalizeStudioColumnLabel(label: string): string {
  return label
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

const RULES_COLUMN_ALIASES: Record<string, string> = {
  id: RC.ruleId,
  track_id: RC.ruleId,
};

function semanticKeyForColumn(
  col: SimTableColumn,
  aliases: Record<string, string>,
): string | null {
  const fromLabel = normalizeStudioColumnLabel(col.label);
  const fromKey = normalizeStudioColumnLabel(col.key);
  const raw =
    fromLabel && fromLabel !== fromKey && /^[0-9a-f-]{36}$/i.test(col.key)
      ? fromLabel
      : fromLabel || fromKey;
  if (!raw || raw === 'name') return null;
  return aliases[raw] ?? raw;
}

/**
 * Studio stores cell values keyed by field-definition UUID.
 * Remap to progression schema keys using column labels (and optional aliases).
 */
export function remapSimTableRowsByColumns(
  columns: SimTableColumn[],
  rows: SimTableRow[],
  aliases: Record<string, string> = {},
): StudioProgressionRow[] {
  const fieldKeyToSemantic = new Map<string, string>();
  for (const col of columns) {
    const semantic = semanticKeyForColumn(col, aliases);
    if (semantic) fieldKeyToSemantic.set(col.key, semantic);
  }

  return rows.map((row) => {
    const values: Record<string, string> = {};
    for (const [fieldKey, raw] of Object.entries(row.values)) {
      const semantic = fieldKeyToSemantic.get(fieldKey) ?? fieldKey;
      if (semantic === 'name') continue;
      values[semantic] = cellValueToString(raw);
    }
    return { id: row.id, values };
  });
}

/** Convert loadStudioLibraryTableData rows to StudioProgressionRow[]. */
export function simTableRowsToProgressionRows(rows: SimTableRow[]): StudioProgressionRow[] {
  return rows.map((r) => ({
    id: r.id,
    values: Object.fromEntries(
      Object.entries(r.values).map(([k, v]) => [k, cellValueToString(v)]),
    ),
  }));
}

export function simTableRowsToTrackProgressionRows(
  columns: SimTableColumn[],
  rows: SimTableRow[],
): StudioProgressionRow[] {
  return remapSimTableRowsByColumns(columns, rows);
}

export function simTableRowsToRuleProgressionRows(
  columns: SimTableColumn[],
  rows: SimTableRow[],
): StudioProgressionRow[] {
  return remapSimTableRowsByColumns(columns, rows, RULES_COLUMN_ALIASES);
}

export type MapStudioConfigResult = {
  config: ProgressionConfig;
  skippedTracks: number;
  skippedRules: number;
};

export function mapStudioRowsToProgressionConfigWithStats(
  trackRows: StudioProgressionRow[],
  ruleRows: StudioProgressionRow[],
): MapStudioConfigResult {
  const tracks = trackRows.map(mapTrackRow).filter((t): t is TrackDef => t !== null);
  const rules = ruleRows.map(mapRuleRow).filter((r): r is Rule => r !== null);
  return {
    config: { tracks, rules },
    skippedTracks: trackRows.length - tracks.length,
    skippedRules: ruleRows.length - rules.length,
  };
}
