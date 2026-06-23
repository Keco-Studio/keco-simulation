import { describe, expect, it } from 'vitest';
import {
  isBattleProgressionEnabled,
  isCloudProgression,
  isSimulatorProgression,
  sanitizeBattleProgressionSource,
} from '../battleProgressionSource';

describe('battleProgressionSource', () => {
  it('always uses cloud progression', () => {
    expect(sanitizeBattleProgressionSource('simulator')).toBe('cloud');
    expect(sanitizeBattleProgressionSource('disabled')).toBe('cloud');
    expect(sanitizeBattleProgressionSource(undefined)).toBe('cloud');
  });

  it('cloud mode is always enabled', () => {
    expect(isBattleProgressionEnabled('cloud')).toBe(true);
    expect(isCloudProgression('cloud')).toBe(true);
    expect(isSimulatorProgression('cloud')).toBe(false);
  });
});
