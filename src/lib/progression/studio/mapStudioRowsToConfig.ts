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

/** Convert loadStudioLibraryTableData rows to StudioProgressionRow[]. */
export function simTableRowsToProgressionRows(
  rows: Array<{ id: string; values: Record<string, string> }>,
): StudioProgressionRow[] {
  return rows.map((r) => ({ id: r.id, values: r.values }));
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
