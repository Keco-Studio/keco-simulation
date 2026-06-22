import { describe, it, expect } from 'vitest';
import { customStrategy } from '../tracks/custom';
import { initTrackState } from '../tracks';
import type { TrackDef } from '../types';

function def(params: Record<string, unknown>): TrackDef {
  return { id: 'custom', kind: 'custom', label: 'Custom', params: params as TrackDef['params'] };
}

describe('custom track — accumulator', () => {
  it('add accumulates', () => {
    const d = def({ accumulator: 'add', levelMode: 'none' });
    let s = customStrategy.accrue(initTrackState(d), 100, d);
    s = customStrategy.accrue(s, 50, d);
    expect(s.total).toBe(150);
  });
  it('add_capped respects cap', () => {
    const d = def({ accumulator: 'add_capped', cap: 120, levelMode: 'none' });
    let s = customStrategy.accrue(initTrackState(d), 100, d);
    s = customStrategy.accrue(s, 100, d);
    expect(s.total).toBe(120);
  });
  it('max keeps the largest single grant', () => {
    const d = def({ accumulator: 'max', levelMode: 'none' });
    let s = customStrategy.accrue(initTrackState(d), 300, d);
    s = customStrategy.accrue(s, 150, d);
    expect(s.total).toBe(300);
    s = customStrategy.accrue(s, 500, d);
    expect(s.total).toBe(500);
  });
});

describe('custom track — levelMode', () => {
  it('formula derives level from total', () => {
    const d = def({ accumulator: 'add', levelMode: 'formula', levelFormula: 'floor(sqrt(total/100))' });
    const s = customStrategy.accrue(initTrackState(d), 900, d);
    expect(s.level).toBe(3); // sqrt(9)=3
  });
  it('tiers derive stage from total', () => {
    const d = def({
      accumulator: 'add',
      levelMode: 'tiers',
      tiers: [{ threshold: 0, label: 'a' }, { threshold: 100, label: 'b' }, { threshold: 500, label: 'c' }],
    });
    const s = customStrategy.accrue(initTrackState(d), 250, d);
    expect(s.level).toBe(2);
  });
});

describe('custom track — unlocks combine with leveling', () => {
  it('grants one-time unlocks alongside formula leveling', () => {
    const d = def({
      accumulator: 'add',
      levelMode: 'formula',
      levelFormula: 'floor(total/1000)',
      unlocks: [{ at: 1000, reward: 'r1' }, { at: 5000, reward: 'r2' }],
    });
    let s = customStrategy.accrue(initTrackState(d), 1200, d);
    expect(s.level).toBe(1);
    expect(s.unlockedRewards).toEqual(['r1']);
    s = customStrategy.accrue(s, 4000, d);
    expect(s.level).toBe(5);
    expect(s.unlockedRewards).toEqual(['r1', 'r2']);
    s = customStrategy.accrue(s, 1, d);
    expect(s.unlockedRewards).toEqual(['r1', 'r2']); // no dup
  });
});
