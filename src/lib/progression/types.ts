export type TrackKind =
  | 'exp_level'
  | 'proficiency'
  | 'milestone'
  | 'rate_accrual'
  | 'custom';

export interface Contribution {
  type: string;
  amount: number;
  ctx: Record<string, number | string>;
  step: number;
}

export interface Rule {
  id: string;
  enabled: boolean;
  whenType: string;
  filter?: string;
  targetTrackId: string;
  /** mathjs formula; may reference `amount`, contribution ctx vars, and `params` keys. */
  rewardFormula: string;
  /** Designer-tuned constants injected into formula/filter scope (e.g. damageRatio, expPerKill). */
  params?: Record<string, number>;
}

export interface ExpLevelParams {
  baseExp: number;
  growthFactor: number;
  model: 'logarithmic' | 'sqrt' | 'linear' | 'exponential';
  maxLevel: number;
}
export interface ProficiencyTier {
  threshold: number;
  label: string;
}
export interface ProficiencyParams {
  tiers: ProficiencyTier[];
}
export interface MilestoneDef {
  at: number;
  reward: string;
}
export interface MilestoneParams {
  milestones: MilestoneDef[];
}
export interface RateAccrualParams {
  ratePerUnit: number;
  cap: number | null;
}

/**
 * Fully data/formula-driven track. Composes three independent axes so designers
 * can express arbitrary feedback modes without writing code:
 *  - accumulator: how the running total changes per grant
 *  - levelMode: how the total maps to a perceivable level/stage
 *  - unlocks: optional one-time rewards at arbitrary totals (combinable with any levelMode)
 */
export interface CustomParams {
  accumulator: 'add' | 'add_capped' | 'max';
  cap?: number | null;
  levelMode: 'none' | 'formula' | 'tiers';
  /** Used when levelMode === 'formula'. Scope variable: total. e.g. "floor(sqrt(total/100))". */
  levelFormula?: string;
  /** Used when levelMode === 'tiers'. */
  tiers?: ProficiencyTier[];
  /** One-time rewards granted when total first crosses `at`. Works with any levelMode. */
  unlocks?: MilestoneDef[];
}

export type TrackParams =
  | ExpLevelParams
  | ProficiencyParams
  | MilestoneParams
  | RateAccrualParams
  | CustomParams;

export interface TrackDef {
  id: string;
  kind: TrackKind;
  label: string;
  params: TrackParams;
}

export interface TrackState {
  id: string;
  total: number;
  level: number;
  progressToNext: number;
  unlockedRewards: string[];
}

export interface RewardGrant {
  trackId: string;
  amount: number;
  ruleId: string;
}

export interface ProgressionConfig {
  tracks: TrackDef[];
  rules: Rule[];
}

export interface Snapshot {
  step: number;
  tracks: Record<string, TrackState>;
  grantsThisStep: RewardGrant[];
}

export interface TrackStrategy {
  kind: TrackKind;
  init(def: TrackDef): TrackState;
  accrue(state: TrackState, amount: number, def: TrackDef): TrackState;
}
