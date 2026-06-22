/** Studio library field keys for the progression tracks table (one row = TrackDef). */
export const PROGRESSION_TRACK_COLUMNS = {
  trackId: 'track_id',
  label: 'label',
  kind: 'kind',
  params: 'params',
} as const;

/** Studio library field keys for the progression rules table (one row = Rule). */
export const PROGRESSION_RULE_COLUMNS = {
  ruleId: 'rule_id',
  enabled: 'enabled',
  whenType: 'when_type',
  filter: 'filter',
  targetTrackId: 'target_track_id',
  rewardFormula: 'reward_formula',
  params: 'params',
} as const;
