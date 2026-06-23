import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { DEFAULT_CONFIG } from '../../defaults';
import {
  PROGRESSION_RULE_COLUMNS,
  PROGRESSION_TRACK_COLUMNS,
} from '../columnKeys';
import {
  PROGRESSION_RULES_SHEET_NAME,
  PROGRESSION_TRACKS_SHEET_NAME,
  buildProgressionRulesTemplateXlsxBuffer,
  buildProgressionStudioTemplateWorkbookBuffer,
  buildProgressionTracksTemplateXlsxBuffer,
  progressionRuleHeaderKeys,
  progressionTrackHeaderKeys,
} from '../exportProgressionStudioTemplateXlsx';
import {
  buildStudioRuleTableRows,
  buildStudioTrackTableRows,
  ruleToSheetRow,
  trackDefToSheetRow,
} from '../studioSampleTableRows';

function readSheetHeaders(buffer: Uint8Array, sheetName: string): string[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[sheetName];
  expect(ws).toBeTruthy();
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws!, { header: 1 }) as unknown[][];
  return (rows[0] ?? []).map(String);
}

describe('exportProgressionStudioTemplateXlsx', () => {
  it('exports track headers matching columnKeys', () => {
    expect(progressionTrackHeaderKeys()).toEqual([
      PROGRESSION_TRACK_COLUMNS.trackId,
      PROGRESSION_TRACK_COLUMNS.label,
      PROGRESSION_TRACK_COLUMNS.kind,
      PROGRESSION_TRACK_COLUMNS.params,
    ]);
    const headers = readSheetHeaders(
      buildProgressionTracksTemplateXlsxBuffer(),
      PROGRESSION_TRACKS_SHEET_NAME,
    );
    expect(headers).toEqual(progressionTrackHeaderKeys());
  });

  it('exports rule headers matching columnKeys', () => {
    expect(progressionRuleHeaderKeys()).toEqual([
      PROGRESSION_RULE_COLUMNS.ruleId,
      PROGRESSION_RULE_COLUMNS.enabled,
      PROGRESSION_RULE_COLUMNS.whenType,
      PROGRESSION_RULE_COLUMNS.filter,
      PROGRESSION_RULE_COLUMNS.targetTrackId,
      PROGRESSION_RULE_COLUMNS.rewardFormula,
      PROGRESSION_RULE_COLUMNS.params,
    ]);
    const headers = readSheetHeaders(
      buildProgressionRulesTemplateXlsxBuffer(),
      PROGRESSION_RULES_SHEET_NAME,
    );
    expect(headers).toEqual(progressionRuleHeaderKeys());
  });

  it('includes sample rows in the combined workbook', () => {
    const wb = XLSX.read(buildProgressionStudioTemplateWorkbookBuffer(), { type: 'array' });
    expect(wb.SheetNames).toEqual([PROGRESSION_TRACKS_SHEET_NAME, PROGRESSION_RULES_SHEET_NAME]);

    const trackRows = XLSX.utils.sheet_to_json<Record<string, string>>(
      wb.Sheets[PROGRESSION_TRACKS_SHEET_NAME]!,
    );
    expect(trackRows.length).toBeGreaterThan(0);
    expect(trackRows[0]?.track_id).toBe('char_exp');

    const ruleRows = XLSX.utils.sheet_to_json<Record<string, string>>(
      wb.Sheets[PROGRESSION_RULES_SHEET_NAME]!,
    );
    expect(ruleRows.length).toBeGreaterThan(0);
    expect(ruleRows[0]?.rule_id).toBe('exp_from_damage');
    expect(ruleRows[0]?.params).toContain('damageRatio');
  });

  it('matches on-screen table rows for the built-in default config', () => {
    const trackHeaders = progressionTrackHeaderKeys();
    const ruleHeaders = progressionRuleHeaderKeys();

    DEFAULT_CONFIG.tracks.forEach((track) => {
      const uiRow = buildStudioTrackTableRows([track])[0]!;
      const sheetRow = trackDefToSheetRow(track);
      trackHeaders.forEach((key, col) => {
        expect(String(sheetRow[col])).toBe(String(uiRow[key as keyof typeof uiRow]));
      });
    });

    DEFAULT_CONFIG.rules.forEach((rule) => {
      const uiRow = buildStudioRuleTableRows([rule])[0]!;
      const sheetRow = ruleToSheetRow(rule);
      ruleHeaders.forEach((key, col) => {
        expect(String(sheetRow[col])).toBe(String(uiRow[key as keyof typeof uiRow]));
      });
    });
  });
});
