import type { ProgressionConfig, RewardGrant } from '@/lib/progression/types';

export type ProgressionFloatReward = {
  text: string;
  variant: 'exp' | 'proficiency';
};

export type ProgressionRewardFxHandler = (rewards: ProgressionFloatReward[]) => void;

/** Aggregate grants from the same tick by track before showing float text. */
export function aggregateGrantsByTrack(grants: RewardGrant[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of grants) {
    const amt = Math.round(g.amount);
    if (amt === 0) continue;
    map.set(g.trackId, (map.get(g.trackId) ?? 0) + amt);
  }
  return map;
}

export function grantsToFloatRewards(
  grants: RewardGrant[],
  config: ProgressionConfig,
  skillNames: Record<string, string>
): ProgressionFloatReward[] {
  const aggregated = aggregateGrantsByTrack(grants);
  const out: ProgressionFloatReward[] = [];

  for (const [trackId, amount] of aggregated) {
    if (trackId.startsWith('prof_')) {
      const skillId = trackId.slice('prof_'.length);
      const name = skillNames[skillId] ?? skillId;
      const short = name.length > 6 ? `${name.slice(0, 5)}…` : name;
      out.push({ text: `${short} +${amount}`, variant: 'proficiency' });
      continue;
    }

    const def = config.tracks.find((t) => t.id === trackId);
    if (trackId === 'char_exp' || def?.kind === 'exp_level') {
      out.push({ text: `+${amount} EXP`, variant: 'exp' });
      continue;
    }

    if (def) {
      out.push({ text: `+${amount} ${def.label}`, variant: 'exp' });
    }
  }

  return out;
}
