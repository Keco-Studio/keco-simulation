import type { TrackKind, TrackStrategy, TrackDef, TrackState } from '../types';
import { expLevelStrategy } from './expLevel';
import { proficiencyStrategy } from './proficiency';
import { milestoneStrategy } from './milestone';
import { rateAccrualStrategy } from './rateAccrual';

export const TRACK_STRATEGIES: Record<TrackKind, TrackStrategy> = {
  exp_level: expLevelStrategy,
  proficiency: proficiencyStrategy,
  milestone: milestoneStrategy,
  rate_accrual: rateAccrualStrategy,
};

export function initTrackState(def: TrackDef): TrackState {
  return TRACK_STRATEGIES[def.kind].init(def);
}
