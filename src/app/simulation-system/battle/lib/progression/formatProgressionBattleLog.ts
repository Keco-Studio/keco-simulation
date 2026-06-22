import type { ProgressionConfig, RewardGrant, TrackState, ProficiencyParams } from '@/lib/progression/types';
import { aggregateGrantsByTrack } from './formatGrantFloatText';

function tierLabel(st: TrackState, tiers: ProficiencyParams['tiers']): string {
  const tier = tiers[st.level - 1];
  return tier?.label ?? `Lv${st.level}`;
}

/**
 * Human-readable lines for the battle log panel (interleaved with combat logs).
 */
export function buildProgressionGrantLogLines(
  grants: RewardGrant[],
  config: ProgressionConfig,
  trackStates: Record<string, TrackState>,
  skillNames: Record<string, string>
): string[] {
  if (grants.length === 0) return [];

  const aggregated = aggregateGrantsByTrack(grants);
  const lines: string[] = [];

  const profDef = config.tracks.find((t) => t.id === 'prof_{skillId}');
  const tiers =
    profDef?.kind === 'proficiency' ? (profDef.params as ProficiencyParams).tiers : [];

  for (const [trackId, gained] of aggregated) {
    const st = trackStates[trackId];
    if (!st || gained === 0) continue;

    if (trackId === 'char_exp' || config.tracks.find((t) => t.id === trackId)?.kind === 'exp_level') {
      const label =
        trackId === 'char_exp'
          ? '角色经验'
          : (config.tracks.find((t) => t.id === trackId)?.label ?? trackId);
      lines.push(
        `  [growth] +${gained} ${label} → Lv${st.level} (累计 ${Math.round(st.total)})`
      );
      continue;
    }

    if (trackId.startsWith('prof_')) {
      const skillId = trackId.slice('prof_'.length);
      const name = skillNames[skillId] ?? skillId;
      lines.push(
        `  [growth] +${gained} ${name} 熟练度 → ${tierLabel(st, tiers)} (累计 ${Math.round(st.total)})`
      );
      continue;
    }

    const def = config.tracks.find((t) => t.id === trackId);
    if (def) {
      lines.push(`  [growth] +${gained} ${def.label} (累计 ${Math.round(st.total)})`);
    }
  }

  return lines;
}

export const PROGRESSION_BATTLE_LOG_HEADER =
  '  [growth] 本场累积：角色经验（任务等级）· 技能熟练度';
