export type BattleProgressionSource = 'simulator' | 'disabled';

export function isBattleProgressionEnabled(source: BattleProgressionSource | undefined): boolean {
  return source !== 'disabled';
}

export function sanitizeBattleProgressionSource(raw: unknown): BattleProgressionSource {
  return raw === 'disabled' ? 'disabled' : 'simulator';
}
