export type TrackKind = 'exp_level' | 'proficiency' | 'milestone' | 'rate_accrual';

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
  rewardFormula: string;
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

export type TrackParams =
  | ExpLevelParams
  | ProficiencyParams
  | MilestoneParams
  | RateAccrualParams;

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
