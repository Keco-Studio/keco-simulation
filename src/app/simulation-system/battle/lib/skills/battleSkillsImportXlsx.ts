/**
 * Battle skills sheet — parse Excel (.xlsx) into Skill-shaped objects (English keys) for importSkillItemsFromArray.
 */

import * as XLSX from 'xlsx';
import type { Element, ElementStrength, ReactionType, Skill } from '../../types';
import { ELEMENT_CONFIG, ELEMENT_STRENGTH_CONFIG, REACTION_CONFIG } from '../../types';
import {
  BATTLE_SKILLS_SHEET_HEADERS,
  BATTLE_SKILLS_SHEET_NAME,
  LEGACY_BATTLE_SKILLS_HEADER_MAP,
  LEGACY_BATTLE_SKILLS_SHEET_NAME,
  type BattleSkillsSheetHeader,
} from './battleSkillsSheetSpec';

const REACTION_PAIR_SEP = /[\u00B7\u30FB·]/;

const ELEMENT_NAME_TO_KEY = new Map<string, Element>();
for (const el of Object.keys(ELEMENT_CONFIG) as Element[]) {
  ELEMENT_NAME_TO_KEY.set(ELEMENT_CONFIG[el].name, el);
}

const REACTION_NAME_TO_KEY = new Map<string, ReactionType>();
for (const rt of Object.keys(REACTION_CONFIG) as ReactionType[]) {
  REACTION_NAME_TO_KEY.set(REACTION_CONFIG[rt].name, rt);
}

const STRENGTH_NAME_TO_KEY = new Map<string, ElementStrength>();
for (const st of Object.keys(ELEMENT_STRENGTH_CONFIG) as ElementStrength[]) {
  STRENGTH_NAME_TO_KEY.set(ELEMENT_STRENGTH_CONFIG[st].name, st);
}

const SPECIAL_LABEL_TO_TYPE = new Map<string, 'heal' | 'atk_debuff' | 'def_debuff'>([
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

const TYPE_LABEL_TO_KEY = new Map<string, Skill['type']>([
  ['attack', 'attack'],
  ['heal', 'heal'],
  ['Attack', 'attack'],
  ['Heal', 'heal'],
  ['\u653b\u51fb', 'attack'],
  ['\u6cbb\u7597', 'heal'],
]);

function cellStr(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function canonicalBattleSkillHeader(raw: string): BattleSkillsSheetHeader | null {
  const h = raw.trim();
  if ((BATTLE_SKILLS_SHEET_HEADERS as readonly string[]).includes(h)) {
    return h as BattleSkillsSheetHeader;
  }
  return LEGACY_BATTLE_SKILLS_HEADER_MAP[h] ?? null;
}

function buildHeaderIndex(headerRow: unknown[]): Map<BattleSkillsSheetHeader, number> {
  const map = new Map<BattleSkillsSheetHeader, number>();
  headerRow.forEach((cell, i) => {
    const h = cellStr(cell);
    const canonical = canonicalBattleSkillHeader(h);
    if (canonical && !map.has(canonical)) map.set(canonical, i);
  });
  return map;
}

function rowToLabelMap(
  headerIndex: Map<BattleSkillsSheetHeader, number>,
  row: unknown[],
): Record<BattleSkillsSheetHeader, string> {
  const out = {} as Record<BattleSkillsSheetHeader, string>;
  for (const key of BATTLE_SKILLS_SHEET_HEADERS) {
    const idx = headerIndex.get(key);
    out[key] = idx === undefined ? '' : cellStr(row[idx]);
  }
  return out;
}

function isRowEmpty(row: Record<BattleSkillsSheetHeader, string>): boolean {
  return !row.id.trim() && !row.name.trim();
}

function mapType(label: string): string {
  const t = label.trim();
  return TYPE_LABEL_TO_KEY.get(t) ?? t;
}

function buildAttachElement(row: Record<BattleSkillsSheetHeader, string>): Skill['attachElement'] | undefined {
  const elLabel = row.attachElement.trim();
  if (!elLabel) return undefined;
  const element =
    elLabel.toLowerCase() === 'random' || elLabel === '\u968f\u673a'
      ? 'random'
      : ELEMENT_NAME_TO_KEY.get(elLabel);
  if (!element) return undefined;
  const stLabel = row.attachStrength.trim();
  const strength: ElementStrength =
    stLabel && STRENGTH_NAME_TO_KEY.has(stLabel) ? STRENGTH_NAME_TO_KEY.get(stLabel)! : 'weak';
  const durRaw = row.attachTurns.trim();
  const dur = durRaw ? Math.max(0, Math.floor(Number(durRaw))) : ELEMENT_STRENGTH_CONFIG[strength].duration;
  const duration = Number.isFinite(dur) && dur > 0 ? dur : ELEMENT_STRENGTH_CONFIG[strength].duration;
  return { element, strength, duration };
}

function buildDot(row: Record<BattleSkillsSheetHeader, string>): Skill['dot'] | undefined {
  const d = row.dotDamage.trim();
  const t = row.dotTurns.trim();
  if (!d && !t) return undefined;
  const damage = Number(d);
  const duration = Math.floor(Number(t));
  if (!Number.isFinite(damage) || damage < 0 || !Number.isFinite(duration) || duration <= 0) return undefined;
  return { damage, duration };
}

function buildCrowdControl(row: Record<BattleSkillsSheetHeader, string>): Skill['crowdControl'] | undefined {
  const f = row.freezeTurns.trim();
  if (!f) return undefined;
  const duration = Math.floor(Number(f));
  if (!Number.isFinite(duration) || duration <= 0) return undefined;
  return { type: 'freeze', duration };
}

function buildSpecialEffect(row: Record<BattleSkillsSheetHeader, string>): Skill['specialEffect'] | undefined {
  const lab = row.specialEffect.trim();
  if (!lab) return undefined;
  const type = SPECIAL_LABEL_TO_TYPE.get(lab);
  if (!type) return undefined;
  const value = Number(row.specialEffectValue.trim());
  if (!Number.isFinite(value) || value < 0) return undefined;
  const durRaw = row.specialEffectDuration.trim();
  const duration = durRaw ? Math.max(0, Math.floor(Number(durRaw))) : type === 'heal' ? 0 : 2;
  if (!Number.isFinite(duration)) return undefined;
  return { type, value, duration: Number.isFinite(duration) ? duration : 0 };
}

function buildReactionTrigger(
  row: Record<BattleSkillsSheetHeader, string>,
): Skill['reactionTrigger'] | undefined {
  const raw = row.reactionTriggers.trim();
  if (!raw) return undefined;
  const segments = raw.split(/[；;]/).map((s) => s.trim()).filter(Boolean);
  const out: NonNullable<Skill['reactionTrigger']> = [];
  for (const seg of segments) {
    const parts = seg.split(REACTION_PAIR_SEP).map((s) => s.trim());
    if (parts.length !== 2) continue;
    const [elName, reName] = parts;
    const element = ELEMENT_NAME_TO_KEY.get(elName);
    const reaction = REACTION_NAME_TO_KEY.get(reName);
    if (!element || !reaction) continue;
    out.push({ element, reaction });
  }
  return out.length > 0 ? out : undefined;
}

/** Map one sheet row to a plain object for importSkillItemsFromArray. */
export function excelLabelRowToSkillLikeObject(row: Record<BattleSkillsSheetHeader, string>): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: row.id.trim(),
    name: row.name.trim(),
    type: mapType(row.type),
    power: row.power.trim() === '' ? undefined : Number(row.power),
    mpCost: row.MP.trim() === '' ? undefined : Number(row.MP),
    maxCooldown: row.maxCooldown.trim() === '' ? undefined : Number(row.maxCooldown),
    cooldown: 0,
    description: row.description.trim() || '—',
  };

  const attach = buildAttachElement(row);
  if (attach) o.attachElement = attach;

  const dot = buildDot(row);
  if (dot) o.dot = dot;

  const cc = buildCrowdControl(row);
  if (cc) o.crowdControl = cc;

  const se = buildSpecialEffect(row);
  if (se) o.specialEffect = se;

  const rt = buildReactionTrigger(row);
  if (rt) o.reactionTrigger = rt;

  return o;
}

/**
 * Parse an .xlsx from this app (or any sheet whose headers match). Returns the same item array shape as JSON import.
 */
export function parseBattleSkillsXlsxToSkillItems(buffer: Uint8Array): unknown[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames.includes(BATTLE_SKILLS_SHEET_NAME)
    ? BATTLE_SKILLS_SHEET_NAME
    : wb.SheetNames.includes(LEGACY_BATTLE_SKILLS_SHEET_NAME)
      ? LEGACY_BATTLE_SKILLS_SHEET_NAME
      : wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('Workbook has no sheets');
  }
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];
  if (!aoa.length) {
    throw new Error('Sheet is empty');
  }
  const headerRow = aoa[0];
  const headerIndex = buildHeaderIndex(headerRow);
  for (const required of ['id', 'name'] as const) {
    if (!headerIndex.has(required)) {
      throw new Error(
        `Missing required column "${required}". Use Export from this page or match the current English (or legacy Chinese) headers.`,
      );
    }
  }

  const items: unknown[] = [];
  for (let r = 1; r < aoa.length; r += 1) {
    const rawRow = aoa[r] ?? [];
    const padded = [...rawRow];
    while (padded.length < headerRow.length) padded.push('');
    const labelRow = rowToLabelMap(headerIndex, padded);
    if (isRowEmpty(labelRow)) continue;
    items.push(excelLabelRowToSkillLikeObject(labelRow));
  }

  return items;
}
