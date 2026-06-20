import type {
  ProgressionConfig,
  Contribution,
  Snapshot,
  TrackState,
  TrackDef,
} from './types';
import { applyRules } from './ruleEngine';
import { TRACK_STRATEGIES, initTrackState } from './tracks';
import { isTemplateId } from './templateRoute';

function cloneState(s: TrackState): TrackState {
  return { ...s, unlockedRewards: [...s.unlockedRewards] };
}

export function simulate(
  config: ProgressionConfig,
  contributions: Contribution[]
): Snapshot[] {
  // Concrete (non-template) track defs become live state immediately.
  const concreteDefs = config.tracks.filter((d) => !isTemplateId(d.id));
  const templateDefs = config.tracks.filter((d) => isTemplateId(d.id));

  const states = new Map<string, TrackState>();
  const defById = new Map<string, TrackDef>();
  for (const def of concreteDefs) {
    states.set(def.id, initTrackState(def));
    defById.set(def.id, def);
  }

  // Match a resolved trackId back to the template def that spawned it.
  const matchTemplate = (trackId: string): TrackDef | undefined => {
    for (const tpl of templateDefs) {
      const prefix = tpl.id.split('{')[0];
      if (trackId.startsWith(prefix)) {
        return { ...tpl, id: trackId };
      }
    }
    return undefined;
  };

  const sorted = [...contributions].sort((a, b) => a.step - b.step);
  const snapshots: Snapshot[] = [];
  let currentStep: number | null = null;
  let grantsThisStep: Snapshot['grantsThisStep'] = [];

  const flush = (step: number) => {
    const tracks: Record<string, TrackState> = {};
    for (const [id, st] of states) tracks[id] = cloneState(st);
    snapshots.push({ step, tracks, grantsThisStep });
    grantsThisStep = [];
  };

  for (const c of sorted) {
    if (currentStep === null) currentStep = c.step;
    if (c.step !== currentStep) {
      flush(currentStep);
      currentStep = c.step;
    }
    const grants = applyRules(c, config.rules);
    for (const g of grants) {
      let def = defById.get(g.trackId);
      if (!def) {
        def = matchTemplate(g.trackId);
        if (!def) continue;
        defById.set(g.trackId, def);
        states.set(g.trackId, initTrackState(def));
      }
      const strategy = TRACK_STRATEGIES[def.kind];
      states.set(g.trackId, strategy.accrue(states.get(g.trackId)!, g.amount, def));
      grantsThisStep.push(g);
    }
  }
  if (currentStep !== null) flush(currentStep);
  return snapshots;
}
