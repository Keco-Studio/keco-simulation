/**
 * Export progression tracks / rules as Studio-shaped .xlsx files.
 * Headers use snake_case keys from columnKeys.ts (Keco Studio column labels).
 */

import * as XLSX from 'xlsx';
import { DEFAULT_CONFIG } from '../defaults';
import type { ProgressionConfig, Rule, TrackDef } from '../types';
import {
  PROGRESSION_RULE_COLUMNS as RC,
  PROGRESSION_TRACK_COLUMNS as TC,
} from './columnKeys';
import { ruleToSheetRow, trackDefToSheetRow } from './studioSampleTableRows';

export const PROGRESSION_TRACKS_SHEET_NAME = 'tracks';
export const PROGRESSION_RULES_SHEET_NAME = 'rules';

export function progressionTrackHeaderKeys(): string[] {
  return [TC.trackId, TC.label, TC.kind, TC.params];
}

export function progressionRuleHeaderKeys(): string[] {
  return [
    RC.ruleId,
    RC.enabled,
    RC.whenType,
    RC.filter,
    RC.targetTrackId,
    RC.rewardFormula,
    RC.params,
  ];
}

function buildSheetAoa(headers: string[], dataRows: (string | number)[][]): (string | number)[][] {
  return [headers, ...dataRows];
}

function writeWorkbookBuffer(
  sheets: Array<{ name: string; aoa: (string | number)[][] }>,
): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const { name, aoa } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

/** Single-sheet tracks workbook for the given rows (defaults to built-in config). */
export function buildProgressionTracksTemplateXlsxBuffer(
  tracks: TrackDef[] = DEFAULT_CONFIG.tracks,
): Uint8Array {
  const aoa = buildSheetAoa(
    progressionTrackHeaderKeys(),
    tracks.map(trackDefToSheetRow),
  );
  return writeWorkbookBuffer([{ name: PROGRESSION_TRACKS_SHEET_NAME, aoa }]);
}

/** Single-sheet rules workbook for the given rows (defaults to built-in config). */
export function buildProgressionRulesTemplateXlsxBuffer(
  rules: Rule[] = DEFAULT_CONFIG.rules,
): Uint8Array {
  const aoa = buildSheetAoa(
    progressionRuleHeaderKeys(),
    rules.map(ruleToSheetRow),
  );
  return writeWorkbookBuffer([{ name: PROGRESSION_RULES_SHEET_NAME, aoa }]);
}

/** Two-sheet workbook (tracks + rules) for reference; import one sheet per Studio library. */
export function buildProgressionStudioTemplateWorkbookBuffer(
  tracks: TrackDef[] = DEFAULT_CONFIG.tracks,
  rules: Rule[] = DEFAULT_CONFIG.rules,
): Uint8Array {
  return writeWorkbookBuffer([
    {
      name: PROGRESSION_TRACKS_SHEET_NAME,
      aoa: buildSheetAoa(progressionTrackHeaderKeys(), tracks.map(trackDefToSheetRow)),
    },
    {
      name: PROGRESSION_RULES_SHEET_NAME,
      aoa: buildSheetAoa(progressionRuleHeaderKeys(), rules.map(ruleToSheetRow)),
    },
  ]);
}

export function downloadXlsxBuffer(filename: string, buffer: Uint8Array): void {
  if (typeof window === 'undefined') return;
  const copy = buffer.slice();
  const blob = new Blob([copy], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadProgressionTracksXlsx(tracks: TrackDef[] = DEFAULT_CONFIG.tracks): void {
  downloadXlsxBuffer('progression-tracks.xlsx', buildProgressionTracksTemplateXlsxBuffer(tracks));
}

export function downloadProgressionRulesXlsx(rules: Rule[] = DEFAULT_CONFIG.rules): void {
  downloadXlsxBuffer('progression-rules.xlsx', buildProgressionRulesTemplateXlsxBuffer(rules));
}

export function downloadProgressionStudioWorkbook(config: ProgressionConfig = DEFAULT_CONFIG): void {
  downloadXlsxBuffer(
    'progression-tracks-and-rules.xlsx',
    buildProgressionStudioTemplateWorkbookBuffer(config.tracks, config.rules),
  );
}

/** @deprecated Use downloadProgressionTracksXlsx */
export function downloadProgressionTracksTemplateXlsx(): void {
  downloadProgressionTracksXlsx();
}

/** @deprecated Use downloadProgressionRulesXlsx */
export function downloadProgressionRulesTemplateXlsx(): void {
  downloadProgressionRulesXlsx();
}

/** @deprecated Use downloadProgressionStudioWorkbook */
export function downloadProgressionStudioTemplateWorkbook(): void {
  downloadProgressionStudioWorkbook();
}
