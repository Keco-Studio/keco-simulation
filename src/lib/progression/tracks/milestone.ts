import type { TrackStrategy, TrackDef, TrackState, MilestoneParams } from '../types';

export const milestoneStrategy: TrackStrategy = {
  kind: 'milestone',
  init: (def: TrackDef): TrackState => ({
    id: def.id,
    total: 0,
    level: 0,
    progressToNext: 0,
    unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const milestones = [...(def.params as MilestoneParams).milestones].sort(
      (a, b) => a.at - b.at
    );
    const total = state.total + amount;
    const unlocked = [...state.unlockedRewards];
    let level = state.level;
    for (const m of milestones) {
      if (total >= m.at && !unlocked.includes(m.reward)) {
        unlocked.push(m.reward);
        level += 1;
      }
    }
    const nextMilestone = milestones.find((m) => total < m.at);
    const progressToNext = nextMilestone ? Math.min(1, total / nextMilestone.at) : 1;
    return { ...state, total, level, progressToNext, unlockedRewards: unlocked };
  },
};
