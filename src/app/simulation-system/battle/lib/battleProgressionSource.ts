export type BattleProgressionSource = 'cloud';

export function isBattleProgressionEnabled(_source: BattleProgressionSource | undefined): boolean {
  return true;
}

export function isSimulatorProgression(_source: BattleProgressionSource | undefined): boolean {
  return false;
}

export function isCloudProgression(_source: BattleProgressionSource | undefined): boolean {
  return true;
}

export function sanitizeBattleProgressionSource(_raw: unknown): BattleProgressionSource {
  return 'cloud';
}
