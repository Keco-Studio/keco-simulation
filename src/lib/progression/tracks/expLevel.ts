import type { TrackStrategy, TrackDef, TrackState, ExpLevelParams } from '../types';

function expForLevel(level: number, p: ExpLevelParams): number {
  const n = level - 1;
  if (n <= 0) return 0;
  switch (p.model) {
    case 'linear':
      return p.baseExp * n;
    case 'sqrt':
      return Math.round(p.baseExp * Math.pow(n, 0.5) * p.growthFactor);
    case 'logarithmic':
      return Math.round(p.baseExp * Math.log2(n + 1) * p.growthFactor);
    case 'exponential':
      return Math.round(p.baseExp * Math.pow(p.growthFactor, n));
    default:
      return p.baseExp * n;
  }
}

export const expLevelStrategy: TrackStrategy = {
  kind: 'exp_level',
  init: (def: TrackDef): TrackState => ({
    id: def.id,
    total: 0,
    level: 1,
    progressToNext: 0,
    unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const p = def.params as ExpLevelParams;
    const total = state.total + amount;
    let level = 1;
    while (level < p.maxLevel && expForLevel(level + 1, p) <= total) level += 1;
    const curr = expForLevel(level, p);
    const next = expForLevel(level + 1, p);
    const progressToNext =
      level >= p.maxLevel || next <= curr
        ? 1
        : Math.min(1, Math.max(0, (total - curr) / (next - curr)));
    return { ...state, total, level, progressToNext };
  },
};
