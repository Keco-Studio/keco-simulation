import type {
  Contribution,
  ProgressionConfig,
  RewardGrant,
  TrackDef,
  TrackState,
} from './types';
import { applyRules } from './ruleEngine';
import { TRACK_STRATEGIES, initTrackState } from './tracks';
import { isTemplateId } from './templateRoute';

export interface TrackRuntimeContext {
  states: Map<string, TrackState>;
  defById: Map<string, TrackDef>;
  templateDefs: TrackDef[];
}

export function createTrackRuntime(config: ProgressionConfig): TrackRuntimeContext {
  const concreteDefs = config.tracks.filter((d) => !isTemplateId(d.id));
  const templateDefs = config.tracks.filter((d) => isTemplateId(d.id));
  const states = new Map<string, TrackState>();
  const defById = new Map<string, TrackDef>();
  for (const def of concreteDefs) {
    states.set(def.id, initTrackState(def));
    defById.set(def.id, def);
  }
  return { states, defById, templateDefs };
}

function matchTemplate(ctx: TrackRuntimeContext, trackId: string): TrackDef | undefined {
  for (const tpl of ctx.templateDefs) {
    const prefix = tpl.id.split('{')[0];
    if (trackId.startsWith(prefix)) {
      return { ...tpl, id: trackId };
    }
  }
  return undefined;
}

/** Apply a batch of contributions and return all grants produced. */
export function applyContributionBatch(
  ctx: TrackRuntimeContext,
  config: ProgressionConfig,
  contributions: Contribution[]
): RewardGrant[] {
  const grantsOut: RewardGrant[] = [];
  for (const c of contributions) {
    const grants = applyRules(c, config.rules);
    for (const g of grants) {
      let def = ctx.defById.get(g.trackId);
      if (!def) {
        def = matchTemplate(ctx, g.trackId);
        if (!def) continue;
        ctx.defById.set(g.trackId, def);
        ctx.states.set(g.trackId, initTrackState(def));
      }
      const strategy = TRACK_STRATEGIES[def.kind];
      ctx.states.set(g.trackId, strategy.accrue(ctx.states.get(g.trackId)!, g.amount, def));
      grantsOut.push(g);
    }
  }
  return grantsOut;
}

export function trackStatesToRecord(ctx: TrackRuntimeContext): Record<string, TrackState> {
  const out: Record<string, TrackState> = {};
  for (const [id, st] of ctx.states) {
    out[id] = { ...st, unlockedRewards: [...st.unlockedRewards] };
  }
  return out;
}
