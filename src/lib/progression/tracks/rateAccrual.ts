import type { TrackStrategy, TrackDef, TrackState, RateAccrualParams } from '../types';

export const rateAccrualStrategy: TrackStrategy = {
  kind: 'rate_accrual',
  init: (def: TrackDef): TrackState => ({
    id: def.id,
    total: 0,
    level: 0,
    progressToNext: 0,
    unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const p = def.params as RateAccrualParams;
    let total = state.total + amount * p.ratePerUnit;
    if (p.cap !== null && total > p.cap) total = p.cap;
    const progressToNext = p.cap && p.cap > 0 ? Math.min(1, total / p.cap) : 0;
    return { ...state, total, progressToNext };
  },
};
