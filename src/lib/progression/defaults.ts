import type { ProgressionConfig } from './types';
import type { BehaviorProfile } from './sources/syntheticSource';

export const DEFAULT_CONFIG: ProgressionConfig = {
  tracks: [
    {
      id: 'char_exp',
      kind: 'exp_level',
      label: '角色经验',
      params: { baseExp: 100, growthFactor: 1.08, model: 'logarithmic', maxLevel: 100 },
    },
    {
      id: 'prof_{skillId}',
      kind: 'proficiency',
      label: '技能熟练度',
      params: {
        tiers: [
          { threshold: 0, label: '生疏' },
          { threshold: 100, label: '熟练' },
          { threshold: 500, label: '精通' },
          { threshold: 2000, label: '大师' },
        ],
      },
    },
    {
      id: 'idle_reward',
      kind: 'rate_accrual',
      label: '挂机产出',
      params: { ratePerUnit: 0.5, cap: 50000 },
    },
    {
      id: 'playtime_milestone',
      kind: 'milestone',
      label: '时长里程碑',
      params: {
        milestones: [
          { at: 3600, reward: '1小时奖励' },
          { at: 86400, reward: '24小时奖励' },
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
      rewardFormula: 'amount*0.1 + enemyLevel*5',
    },
    {
      id: 'exp_from_kill',
      enabled: true,
      whenType: 'kill_enemy',
      targetTrackId: 'char_exp',
      rewardFormula: 'enemyLevel*20',
    },
    {
      id: 'prof_from_cast',
      enabled: true,
      whenType: 'cast_skill',
      targetTrackId: 'prof_{skillId}',
      rewardFormula: '10',
    },
    {
      id: 'prof_from_damage',
      enabled: true,
      whenType: 'deal_damage',
      targetTrackId: 'prof_{skillId}',
      rewardFormula: 'amount*0.02',
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
  ],
};

export const DEFAULT_PROFILE: BehaviorProfile = {
  steps: 30,
  perStep: [
    { type: 'deal_damage', amount: 5000, ctx: { enemyLevel: 30, skillId: 'fireball' } },
    { type: 'kill_enemy', amount: 8, ctx: { enemyLevel: 30 } },
    { type: 'cast_skill', amount: 12, ctx: { skillId: 'fireball' } },
    { type: 'time_elapsed', amount: 1800, ctx: {} },
  ],
};
