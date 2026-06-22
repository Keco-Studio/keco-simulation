import type { TrackStrategy, TrackDef, TrackState, ProficiencyParams } from '../types';

export const proficiencyStrategy: TrackStrategy = {
  kind: 'proficiency',
  init: (def: TrackDef): TrackState => ({
    id: def.id,
    total: 0,
    level: 1,
    progressToNext: 0,
    unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const tiers = [...(def.params as ProficiencyParams).tiers].sort(
      (a, b) => a.threshold - b.threshold
    );
    const total = state.total + amount;
    let idx = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (total >= tiers[i].threshold) idx = i;
    }
    const next = tiers[idx + 1];
    const curr = tiers[idx];
    const progressToNext = next
      ? Math.min(1, Math.max(0, (total - curr.threshold) / (next.threshold - curr.threshold)))
      : 1;
    return { ...state, total, level: idx + 1, progressToNext };
  },
};
