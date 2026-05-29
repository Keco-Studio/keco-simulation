/**
 * Normalize table / sheet cell labels to battle element keys (English id or localized name).
 */

import type { Element, ElementStrength, ReactionType } from '../../types';
import { ELEMENT_CONFIG, ELEMENT_STRENGTH_CONFIG, REACTION_CONFIG } from '../../types';

const ELEMENT_KEYS: Element[] = ['fire', 'water', 'thunder', 'grass', 'ice'];

const ELEMENT_NAME_TO_KEY = new Map<string, Element>();
for (const el of ELEMENT_KEYS) {
  ELEMENT_NAME_TO_KEY.set(el, el);
  ELEMENT_NAME_TO_KEY.set(el.toLowerCase(), el);
  ELEMENT_NAME_TO_KEY.set(ELEMENT_CONFIG[el].name, el);
  ELEMENT_NAME_TO_KEY.set(ELEMENT_CONFIG[el].name.toLowerCase(), el);
}
/** Legacy sheet / Studio table labels */
ELEMENT_NAME_TO_KEY.set('\u706b', 'fire');
ELEMENT_NAME_TO_KEY.set('\u6c34', 'water');
ELEMENT_NAME_TO_KEY.set('\u96f7', 'thunder');
ELEMENT_NAME_TO_KEY.set('\u8349', 'grass');
ELEMENT_NAME_TO_KEY.set('\u51b0', 'ice');

const STRENGTH_NAME_TO_KEY = new Map<string, ElementStrength>();
for (const st of ['weak', 'medium', 'strong'] as ElementStrength[]) {
  STRENGTH_NAME_TO_KEY.set(st, st);
  STRENGTH_NAME_TO_KEY.set(st.toLowerCase(), st);
  STRENGTH_NAME_TO_KEY.set(ELEMENT_STRENGTH_CONFIG[st].name, st);
  STRENGTH_NAME_TO_KEY.set(ELEMENT_STRENGTH_CONFIG[st].name.toLowerCase(), st);
}
STRENGTH_NAME_TO_KEY.set('\u5f31', 'weak');
STRENGTH_NAME_TO_KEY.set('\u4e2d', 'medium');
STRENGTH_NAME_TO_KEY.set('\u5f3a', 'strong');

const REACTION_NAME_TO_KEY = new Map<string, ReactionType>();
for (const rt of Object.keys(REACTION_CONFIG) as ReactionType[]) {
  REACTION_NAME_TO_KEY.set(rt, rt);
  REACTION_NAME_TO_KEY.set(rt.toLowerCase(), rt);
  REACTION_NAME_TO_KEY.set(REACTION_CONFIG[rt].name, rt);
  REACTION_NAME_TO_KEY.set(REACTION_CONFIG[rt].name.toLowerCase(), rt);
}

const SPECIAL_LABEL_TO_TYPE = new Map<string, 'heal' | 'atk_debuff' | 'def_debuff'>([
  ['heal', 'heal'],
  ['atk_debuff', 'atk_debuff'],
  ['def_debuff', 'def_debuff'],
  ['Heal (coef × ATK)', 'heal'],
  ['ATK debuff (ratio)', 'atk_debuff'],
  ['DEF debuff (ratio)', 'def_debuff'],
  ['\u6cbb\u7597(\u7cfb\u6570\u00d7ATK)', 'heal'],
  ['\u964d\u653b(\u6bd4\u4f8b)', 'atk_debuff'],
  ['\u964d\u9632(\u6bd4\u4f8b)', 'def_debuff'],
  ['\u6cbb\u7597', 'heal'],
  ['\u964d\u653b', 'atk_debuff'],
  ['\u964d\u9632', 'def_debuff'],
]);

export function parseElementKey(raw: string): Element | 'random' | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === 'random' || t === '\u968f\u673a') return 'random';
  if (ELEMENT_KEYS.includes(lower as Element)) return lower as Element;
  return ELEMENT_NAME_TO_KEY.get(t) ?? ELEMENT_NAME_TO_KEY.get(lower) ?? null;
}

export function parseStrengthKey(raw: string): ElementStrength | null {
  const t = raw.trim();
  if (!t) return null;
  return STRENGTH_NAME_TO_KEY.get(t) ?? STRENGTH_NAME_TO_KEY.get(t.toLowerCase()) ?? null;
}

export function parseReactionKey(raw: string): ReactionType | null {
  const t = raw.trim();
  if (!t) return null;
  return REACTION_NAME_TO_KEY.get(t) ?? REACTION_NAME_TO_KEY.get(t.toLowerCase()) ?? null;
}

export function parseSpecialEffectType(raw: string): 'heal' | 'atk_debuff' | 'def_debuff' | null {
  const t = raw.trim();
  if (!t) return null;
  if (t === 'heal' || t === 'atk_debuff' || t === 'def_debuff') return t;
  return SPECIAL_LABEL_TO_TYPE.get(t) ?? null;
}
