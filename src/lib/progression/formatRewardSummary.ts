import type { ProgressionConfig, TrackState, ProficiencyParams } from './types';

/** Human-readable lines for battle result overlay / side panel. */
export function buildRewardSummaryLines(
  config: ProgressionConfig,
  trackStates: Record<string, TrackState>,
  skillNames: Record<string, string>
): string[] {
  const lines: string[] = [];

  const exp = trackStates['char_exp'];
  if (exp && exp.total > 0) {
    lines.push(`+${Math.round(exp.total)} EXP → Lv${exp.level}`);
  }

  const profIds = Object.keys(trackStates)
    .filter((id) => id.startsWith('prof_') && trackStates[id].total > 0)
    .sort((a, b) => trackStates[b].total - trackStates[a].total);

  const profDef = config.tracks.find((t) => t.id === 'prof_{skillId}');
  const tiers =
    profDef?.kind === 'proficiency' ? (profDef.params as ProficiencyParams).tiers : [];

  for (const id of profIds) {
    const st = trackStates[id];
    const skillId = id.slice('prof_'.length);
    const name = skillNames[skillId] ?? skillId;
    let tierLabel = `段位 ${st.level}`;
    const tier = tiers[st.level - 1];
    if (tier?.label) tierLabel = tier.label;
    lines.push(`${name} 熟练度 +${Math.round(st.total)} → ${tierLabel}`);
  }

  for (const def of config.tracks) {
    const st = trackStates[def.id];
    if (!st || st.unlockedRewards.length === 0) continue;
    for (const reward of st.unlockedRewards) {
      lines.push(`${def.label}: 解锁「${reward}」`);
    }
  }

  for (const def of config.tracks) {
    if (def.kind !== 'rate_accrual' && def.kind !== 'custom') continue;
    const st = trackStates[def.id];
    if (!st || st.total <= 0) continue;
    if (def.id === 'char_exp' || def.id.startsWith('prof_')) continue;
    lines.push(`${def.label}: +${Math.round(st.total)}`);
  }

  return lines;
}
