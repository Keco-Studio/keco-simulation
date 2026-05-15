/**
 * Skill sheet row ↔ Skill conversion (defaults for optional fields).
 */

import type { Element, ElementStrength, ReactionType, Skill, SkillType } from '../../types';
import { ELEMENT_STRENGTH_CONFIG } from '../../types';

const ELEMENTS: Element[] = ['fire', 'water', 'thunder', 'grass', 'ice'];
const REACTIONS: ReactionType[] = [
  'vaporize',
  'melt',
  'electrify',
  'overload',
  'burn',
  'freeze',
  'quicken',
];

function parseNum(s: string, fallback: number): number {
  const n = Number(String(s).trim());
  return Number.isFinite(n) ? n : fallback;
}

function parseIntNonNeg(s: string, fallback: number): number {
  const n = Math.floor(Number(String(s).trim()));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function isElement(s: string): s is Element {
  return ELEMENTS.includes(s as Element);
}

function isStrength(s: string): s is ElementStrength {
  return s === 'weak' || s === 'medium' || s === 'strong';
}

function isSkillType(s: string): s is SkillType {
  return s === 'attack' || s === 'heal';
}

function isReactionType(s: string): s is ReactionType {
  return (REACTIONS as readonly string[]).includes(s);
}

/** One reaction-trigger pair row (element + reaction); persisted only when both are valid. */
export interface ReactionTriggerPairRow {
  element: string;
  reaction: string;
}

/** Flat row for table editing (strings for controlled inputs). */
export interface SkillFlatRow {
  id: string;
  name: string;
  type: string;
  power: string;
  mpCost: string;
  maxCooldown: string;
  description: string;
  /** Empty = no attach; random or element key */
  attachElement: string;
  attachStrength: string;
  attachDuration: string;
  dotDamage: string;
  dotDuration: string;
  freezeDuration: string;
  specialType: string;
  specialValue: string;
  specialDuration: string;
  /** Optional display-only reaction lines for skill cards (no raw JSON). */
  reactionTriggers: ReactionTriggerPairRow[];
}

export function emptySkillFlatRow(): SkillFlatRow {
  return {
    id: '',
    name: '',
    type: 'attack',
    power: '1',
    mpCost: '0',
    maxCooldown: '0',
    description: '',
    attachElement: '',
    attachStrength: 'weak',
    attachDuration: '',
    dotDamage: '',
    dotDuration: '',
    freezeDuration: '0',
    specialType: '',
    specialValue: '',
    specialDuration: '',
    reactionTriggers: [],
  };
}

export function skillToFlatRow(skill: Skill): SkillFlatRow {
  const attach = skill.attachElement;
  const dot = skill.dot;
  const cc = skill.crowdControl;
  const se = skill.specialEffect;

  return {
    id: skill.id,
    name: skill.name,
    type: skill.type,
    power: String(skill.power),
    mpCost: String(skill.mpCost),
    maxCooldown: String(skill.maxCooldown),
    description: skill.description ?? '',
    attachElement: attach ? attach.element : '',
    attachStrength: attach?.strength ?? 'weak',
    attachDuration: attach ? String(attach.duration) : '',
    dotDamage: dot ? String(dot.damage) : '',
    dotDuration: dot ? String(dot.duration) : '',
    freezeDuration: cc?.type === 'freeze' ? String(cc.duration) : '0',
    specialType: se?.type ?? '',
    specialValue: se ? String(se.value) : '',
    specialDuration: se ? String(se.duration) : '',
    reactionTriggers:
      skill.reactionTrigger?.map((x) => ({ element: x.element, reaction: x.reaction })) ?? [],
  };
}

/**
 * Convert one flat row to a Skill; on validation failure returns `{ error }`.
 * id and name are required; id must be alphanumeric + underscore.
 */
export function flatRowToSkill(row: SkillFlatRow): { skill: Skill } | { error: string } {
  const id = row.id.trim();
  const name = row.name.trim();
  if (!id) return { error: 'Skill id cannot be empty' };
  if (!/^[a-zA-Z0-9_]+$/.test(id)) return { error: `Skill id must be letters, digits, or underscore: ${id}` };
  if (!name) return { error: `Display name cannot be empty for skill "${id}"` };

  const type: SkillType = isSkillType(row.type.trim()) ? (row.type.trim() as SkillType) : 'attack';
  const power = parseNum(row.power, 1);
  const mpCost = parseIntNonNeg(row.mpCost, 0);
  const maxCooldown = parseIntNonNeg(row.maxCooldown, 0);

  const skill: Skill = {
    id,
    name,
    type,
    power: power < 0 ? 0 : power,
    mpCost,
    cooldown: 0,
    maxCooldown,
    description: row.description.trim() || '—',
  };

  const attachEl = row.attachElement.trim();
  if (attachEl && (attachEl === 'random' || isElement(attachEl))) {
    const strengthRaw = row.attachStrength.trim();
    const strength: ElementStrength = isStrength(strengthRaw) ? strengthRaw : 'weak';
    const defaultDur = ELEMENT_STRENGTH_CONFIG[strength].duration;
    const duration = row.attachDuration.trim()
      ? parseIntNonNeg(row.attachDuration, defaultDur)
      : defaultDur;
    skill.attachElement = {
      element: attachEl === 'random' ? 'random' : attachEl,
      strength,
      duration: duration > 0 ? duration : defaultDur,
    };
  }

  const dotD = row.dotDamage.trim();
  const dotT = row.dotDuration.trim();
  if (dotD || dotT) {
    const damage = parseNum(dotD, 0);
    const duration = parseIntNonNeg(dotT, 0);
    if (duration > 0 && damage >= 0) {
      skill.dot = { damage, duration };
    }
  }

  const freeze = parseIntNonNeg(row.freezeDuration, 0);
  if (freeze > 0) {
    skill.crowdControl = { type: 'freeze', duration: freeze };
  }

  const st = row.specialType.trim();
  if (st === 'heal' || st === 'atk_debuff' || st === 'def_debuff') {
    const value = parseNum(row.specialValue, 0);
    const duration = parseIntNonNeg(row.specialDuration, st === 'heal' ? 0 : 2);
    skill.specialEffect = {
      type: st,
      value: value < 0 ? 0 : value,
      duration,
    };
  }

  const triggers: { element: Element; reaction: ReactionType }[] = [];
  for (const p of row.reactionTriggers) {
    const el = p.element.trim();
    const re = p.reaction.trim();
    if (!el || !re) continue;
    if (!isElement(el) || !isReactionType(re)) continue;
    triggers.push({ element: el, reaction: re });
  }
  if (triggers.length > 0) {
    skill.reactionTrigger = triggers;
  }

  return { skill };
}

/**
 * Collect skills from table rows: skip empty rows, invalid rows, duplicate ids (first wins).
 */
export function collectValidSkillsFromRows(rows: SkillFlatRow[]): Skill[] {
  const skills: Skill[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id.trim() && !row.name.trim()) continue;
    const r = flatRowToSkill(row);
    if ('error' in r) continue;
    if (seen.has(r.skill.id)) continue;
    seen.add(r.skill.id);
    skills.push(r.skill);
  }
  return skills;
}

export function skillsToFlatRows(skills: Skill[]): SkillFlatRow[] {
  return skills.map(skillToFlatRow);
}
