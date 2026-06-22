import type { ProgressionConfig } from './types';
import type { BehaviorProfile } from './sources/syntheticSource';

export const DEFAULT_CONFIG: ProgressionConfig = {
  tracks: [
    {
      id: 'char_exp',
      kind: 'exp_level',
      label: 'Character EXP',
      params: { baseExp: 100, growthFactor: 1.08, model: 'logarithmic', maxLevel: 100 },
    },
    {
      id: 'prof_{skillId}',
      kind: 'proficiency',
      label: 'Skill proficiency',
      params: {
        tiers: [
          { threshold: 0, label: 'Unskilled' },
          { threshold: 100, label: 'Practiced' },
          { threshold: 500, label: 'Adept' },
          { threshold: 2000, label: 'Master' },
        ],
      },
    },
    {
      id: 'idle_reward',
      kind: 'rate_accrual',
      label: 'Idle rewards',
      params: { ratePerUnit: 0.5, cap: 50000 },
    },
    {
      id: 'playtime_milestone',
      kind: 'milestone',
      label: 'Playtime milestones',
      params: {
        milestones: [
          { at: 3600, reward: '1 hour reward' },
          { at: 86400, reward: '24 hour reward' },
        ],
      },
    },
    {
      // Showcases the custom track: curve-based leveling AND one-time unlocks
      // combined — something none of the four presets can do on their own.
      id: 'battle_mastery',
      kind: 'custom',
      label: 'Battle mastery (custom)',
      params: {
        accumulator: 'add',
        cap: null,
        levelMode: 'formula',
        levelFormula: 'floor(sqrt(total/10000))',
        unlocks: [
          { at: 100000, reward: 'Mastery badge (Bronze)' },
          { at: 1000000, reward: 'Mastery badge (Gold)' },
        ],
      },
    },
  ],
  rules: [
    {
      id: 'exp_from_damage',
      enabled: true,
      whenType: 'deal_damage',
      targetTrackId: 'char_exp',
      rewardFormula: 'amount * damageRatio + enemyLevel * levelBonus',
      params: { damageRatio: 0.1, levelBonus: 5, enemyLevel: 30 },
    },
    {
      id: 'exp_from_kill',
      enabled: true,
      whenType: 'kill_enemy',
      targetTrackId: 'char_exp',
      rewardFormula: 'amount * expPerKill + enemyLevel * killLevelBonus',
      params: { expPerKill: 0, killLevelBonus: 20, enemyLevel: 30 },
    },
    {
      id: 'prof_from_cast',
      enabled: true,
      whenType: 'cast_skill',
      targetTrackId: 'prof_{skillId}',
      rewardFormula: 'amount * castProficiencyRate',
      params: { castProficiencyRate: 10 },
    },
    {
      id: 'prof_from_damage',
      enabled: true,
      whenType: 'deal_damage',
      targetTrackId: 'prof_{skillId}',
      rewardFormula: 'amount * damageProficiencyRate',
      params: { damageProficiencyRate: 0.02 },
    },
    {
      id: 'idle_from_time',
      enabled: true,
      whenType: 'time_elapsed',
      targetTrackId: 'idle_reward',
      rewardFormula: 'amount',
    },
    {
      id: 'milestone_from_time',
      enabled: true,
      whenType: 'time_elapsed',
      targetTrackId: 'playtime_milestone',
      rewardFormula: 'amount',
    },
    {
      id: 'mastery_from_damage',
      enabled: true,
      whenType: 'deal_damage',
      targetTrackId: 'battle_mastery',
      rewardFormula: 'amount',
    },
  ],
};

export const DEFAULT_PROFILE: BehaviorProfile = {
  steps: 30,
  // Skill-agnostic backbone. Per-skill proficiency comes from `skills` below,
  // which the UI populates from the real battle skill table.
  perStep: [
    { type: 'deal_damage', amount: 5000, ctx: {} },
    { type: 'kill_enemy', amount: 8, ctx: {} },
    { type: 'time_elapsed', amount: 1800, ctx: {} },
  ],
  skills: [],
};
