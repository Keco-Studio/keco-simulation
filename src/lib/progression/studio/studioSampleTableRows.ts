/**
 * Studio-shaped table rows for sample display and XLSX templates.
 * Column keys match columnKeys.ts (snake_case labels in Keco Studio).
 */

import { DEFAULT_CONFIG } from '../defaults';
import { stringifyRuleParams } from '../ruleParams';
import type { Rule, TrackDef } from '../types';
import {
  PROGRESSION_RULE_COLUMNS as RC,
  PROGRESSION_TRACK_COLUMNS as TC,
} from './columnKeys';

export type StudioTrackTableRow = {
  key: string;
  [TC.trackId]: string;
  [TC.label]: string;
  [TC.kind]: string;
  [TC.params]: string;
};

export type StudioRuleTableRow = {
  key: string;
  [RC.ruleId]: string;
  [RC.enabled]: string;
  [RC.whenType]: string;
  [RC.filter]: string;
  [RC.targetTrackId]: string;
  [RC.rewardFormula]: string;
  [RC.params]: string;
};

export function trackDefToStudioTableRow(track: TrackDef): StudioTrackTableRow {
  return {
    key: track.id,
    [TC.trackId]: track.id,
    [TC.label]: track.label,
    [TC.kind]: track.kind,
    [TC.params]: JSON.stringify(track.params),
  };
}

export function ruleToStudioTableRow(rule: Rule): StudioRuleTableRow {
  return {
    key: rule.id,
    [RC.ruleId]: rule.id,
    [RC.enabled]: rule.enabled ? 'true' : 'false',
    [RC.whenType]: rule.whenType,
    [RC.filter]: rule.filter ?? '',
    [RC.targetTrackId]: rule.targetTrackId,
    [RC.rewardFormula]: rule.rewardFormula,
    [RC.params]: stringifyRuleParams(rule.params),
  };
}

export function buildStudioTrackTableRows(tracks: TrackDef[]): StudioTrackTableRow[] {
  return tracks.map(trackDefToStudioTableRow);
}

export function buildStudioRuleTableRows(rules: Rule[]): StudioRuleTableRow[] {
  return rules.map(ruleToStudioTableRow);
}

/** Built-in sample rows shown before any Studio import. */
export const STUDIO_SAMPLE_TRACK_ROWS = buildStudioTrackTableRows(DEFAULT_CONFIG.tracks);
export const STUDIO_SAMPLE_RULE_ROWS = buildStudioRuleTableRows(DEFAULT_CONFIG.rules);

export function trackDefToSheetRow(track: TrackDef): (string | number)[] {
  const row = trackDefToStudioTableRow(track);
  return [row[TC.trackId], row[TC.label], row[TC.kind], row[TC.params]];
}

export function ruleToSheetRow(rule: Rule): (string | number)[] {
  const row = ruleToStudioTableRow(rule);
  return [
    row[RC.ruleId],
    row[RC.enabled],
    row[RC.whenType],
    row[RC.filter],
    row[RC.targetTrackId],
    row[RC.rewardFormula],
    row[RC.params],
  ];
}
