import type { Contribution } from './types';

/**
 * Resolve "prof_{skillId}" against contribution ctx → "prof_fireball".
 * Returns null when any referenced placeholder is missing/empty in ctx, so a
 * skill-agnostic contribution (no skillId) won't spawn a bogus "prof_" track.
 */
export function resolveTrackId(template: string, contribution: Contribution): string | null {
  let missing = false;
  const out = template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => {
    const v = contribution.ctx[key];
    if (v === undefined || v === null || v === '') {
      missing = true;
      return '';
    }
    return String(v);
  });
  return missing ? null : out;
}

/** True when the id still contains an unresolved placeholder. */
export function isTemplateId(id: string): boolean {
  return /\{[A-Za-z0-9_]+\}/.test(id);
}
