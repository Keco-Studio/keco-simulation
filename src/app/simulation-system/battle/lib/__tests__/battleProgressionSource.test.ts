import { describe, expect, it } from 'vitest';
import {
  isBattleProgressionEnabled,
  sanitizeBattleProgressionSource,
} from '../battleProgressionSource';

describe('battleProgressionSource', () => {
  it('sanitizes unknown values to simulator', () => {
    expect(sanitizeBattleProgressionSource('disabled')).toBe('disabled');
    expect(sanitizeBattleProgressionSource('other')).toBe('simulator');
    expect(sanitizeBattleProgressionSource(undefined)).toBe('simulator');
  });

  it('detects enabled state', () => {
    expect(isBattleProgressionEnabled('simulator')).toBe(true);
    expect(isBattleProgressionEnabled('disabled')).toBe(false);
    expect(isBattleProgressionEnabled(undefined)).toBe(true);
  });
});
