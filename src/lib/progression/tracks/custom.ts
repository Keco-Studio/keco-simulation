import type { TrackStrategy, TrackDef, TrackState, CustomParams } from '../types';
import { evalNumber } from '../formulaAdapter';

export const customStrategy: TrackStrategy = {
  kind: 'custom',
  init: (def: TrackDef): TrackState => ({
    id: def.id,
    total: 0,
    level: 0,
    progressToNext: 0,
    unlockedRewards: [],
  }),
  accrue: (state: TrackState, amount: number, def: TrackDef): TrackState => {
    const p = def.params as CustomParams;

    // 1) accumulate
    let total: number;
    switch (p.accumulator) {
      case 'add_capped':
        total = state.total + amount;
        if (p.cap !== null && p.cap !== undefined && total > p.cap) total = p.cap;
        break;
      case 'max':
        total = Math.max(state.total, amount);
        break;
      case 'add':
      default:
        total = state.total + amount;
        break;
    }

    // 2) level mapping
    let level = 0;
    let progressToNext = 0;
    if (p.levelMode === 'formula' && p.levelFormula) {
      const raw = evalNumber(p.levelFormula, { total });
      level = Math.floor(raw);
      progressToNext = Math.min(1, Math.max(0, raw - Math.floor(raw)));
    } else if (p.levelMode === 'tiers' && p.tiers && p.tiers.length > 0) {
      const tiers = [...p.tiers].sort((a, b) => a.threshold - b.threshold);
      let idx = 0;
      for (let i = 0; i < tiers.length; i++) {
        if (total >= tiers[i].threshold) idx = i;
      }
      const next = tiers[idx + 1];
      const curr = tiers[idx];
      level = idx + 1;
      progressToNext = next
        ? Math.min(1, Math.max(0, (total - curr.threshold) / (next.threshold - curr.threshold)))
        : 1;
    } else {
      // 'none' — track raw total only; progress reflects cap if present
      progressToNext = p.cap && p.cap > 0 ? Math.min(1, total / p.cap) : 0;
    }

    // 3) one-time unlocks (independent of levelMode)
    const unlocked = [...state.unlockedRewards];
    if (p.unlocks && p.unlocks.length > 0) {
      for (const u of [...p.unlocks].sort((a, b) => a.at - b.at)) {
        if (total >= u.at && !unlocked.includes(u.reward)) unlocked.push(u.reward);
      }
    }

    return { ...state, total, level, progressToNext, unlockedRewards: unlocked };
  },
};
