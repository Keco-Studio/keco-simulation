import type { Contribution } from './types';

/** Resolve "prof_{skillId}" against contribution ctx → "prof_fireball". */
export function resolveTrackId(template: string, contribution: Contribution): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => {
    const v = contribution.ctx[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** True when the id still contains an unresolved placeholder. */
export function isTemplateId(id: string): boolean {
  return /\{[A-Za-z0-9_]+\}/.test(id);
}
