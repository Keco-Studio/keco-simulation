/**
 * Battle simulator skills built on-page from local table cell picks (table → column → value).
 */

import type { Skill } from '../../types';
import type { SkillFlatRow } from '../skills/skillTableCodec';
import { emptySkillFlatRow, flatRowToSkill, resolveSkillId } from '../skills/skillTableCodec';
import {
  BATTLE_SKILL_MAPPING_FIELDS,
  type BattleSkillColumnMappingKey,
} from './battleLocalTableSkillSource';

export const BATTLE_SKILL_DRAFTS_STORAGE_KEY = 'keco-battle-skill-drafts-v1';

export type LocalTableCellRef = {
  tableId: string;
  columnKey: string;
  value: string;
};

export type BattleSkillDraft = {
  draftId: string;
  fields: Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>>;
};

export type BattleSkillDraftsPersisted = {
  version: 1;
  drafts: BattleSkillDraft[];
};

export type SkillDraftValidationResult = {
  ok: boolean;
  skills: Skill[];
  draftErrors: { draftId: string; label: string; error: string }[];
};

export function createEmptyDraft(): BattleSkillDraft {
  return { draftId: crypto.randomUUID(), fields: {} };
}

export function loadBattleSkillDrafts(): BattleSkillDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BATTLE_SKILL_DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return [];
    const o = data as BattleSkillDraftsPersisted;
    if (!Array.isArray(o.drafts)) return [];
    return o.drafts
      .filter((d) => d && typeof d === 'object' && typeof d.draftId === 'string')
      .map((d) => ({
        draftId: d.draftId,
        fields: sanitizeFields(d.fields),
      }));
  } catch {
    return [];
  }
}

function sanitizeFields(
  fields: unknown,
): Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>> {
  if (!fields || typeof fields !== 'object') return {};
  const out: Partial<Record<BattleSkillColumnMappingKey, LocalTableCellRef>> = {};
  for (const f of BATTLE_SKILL_MAPPING_FIELDS) {
    const ref = (fields as Record<string, unknown>)[f.key];
    if (!ref || typeof ref !== 'object') continue;
    const r = ref as LocalTableCellRef;
    if (
      typeof r.tableId === 'string' &&
      typeof r.columnKey === 'string' &&
      typeof r.value === 'string' &&
      r.tableId &&
      r.columnKey
    ) {
      out[f.key] = { tableId: r.tableId, columnKey: r.columnKey, value: r.value };
    }
  }
  return out;
}

export function saveBattleSkillDrafts(drafts: BattleSkillDraft[]): void {
  if (typeof window === 'undefined') return;
  const payload: BattleSkillDraftsPersisted = { version: 1, drafts };
  localStorage.setItem(BATTLE_SKILL_DRAFTS_STORAGE_KEY, JSON.stringify(payload));
}

/** Resolved battle skill id (same rules as Validate & apply). */
export function resolvedDraftSkillId(draft: BattleSkillDraft): string | null {
  const raw = draft.fields.id?.value?.trim();
  if (!raw) return null;
  const resolved = resolveSkillId(raw);
  return 'error' in resolved ? null : resolved.id;
}

export function draftImportDisplayId(draft: BattleSkillDraft): string {
  return draft.fields.id?.value?.trim() || draft.fields.name?.value?.trim() || 'unknown';
}

export type DraftImportReject = {
  displayId: string;
  resolvedId: string;
  reason: string;
};

/** Skip drafts whose skill id is already in `existing` or earlier in `incoming`. */
export function partitionDraftsBySkillId(
  incoming: BattleSkillDraft[],
  existing: BattleSkillDraft[],
): { accepted: BattleSkillDraft[]; rejected: DraftImportReject[] } {
  const seen = new Set<string>();
  for (const d of existing) {
    const id = resolvedDraftSkillId(d);
    if (id) seen.add(id);
  }

  const accepted: BattleSkillDraft[] = [];
  const rejected: DraftImportReject[] = [];

  for (const draft of incoming) {
    const displayId = draftImportDisplayId(draft);
    const resolvedId = resolvedDraftSkillId(draft);
    if (!resolvedId) {
      accepted.push(draft);
      continue;
    }
    if (seen.has(resolvedId)) {
      rejected.push({
        displayId,
        resolvedId,
        reason: `Skill id "${resolvedId}" already exists.`,
      });
      continue;
    }
    seen.add(resolvedId);
    accepted.push(draft);
  }

  return { accepted, rejected };
}

export function draftToFlatRow(draft: BattleSkillDraft): SkillFlatRow {
  const base = emptySkillFlatRow();
  const pick = (key: BattleSkillColumnMappingKey): string => draft.fields[key]?.value?.trim() ?? '';
  const rawId = pick('id');
  const idResolved = rawId ? resolveSkillId(rawId) : { error: 'Skill id cannot be empty' as const };
  return {
    ...base,
    id: 'id' in idResolved ? idResolved.id : rawId,
    name: pick('name'),
    type: pick('type') || base.type,
    power: pick('power') || base.power,
    mpCost: pick('mpCost') || base.mpCost,
    maxCooldown: pick('maxCooldown') || base.maxCooldown,
    description: pick('description'),
    attachElement: pick('attachElement'),
    attachStrength: pick('attachStrength') || base.attachStrength,
    attachDuration: pick('attachDuration'),
    dotDamage: pick('dotDamage'),
    dotDuration: pick('dotDuration'),
    freezeDuration: pick('freezeDuration') || base.freezeDuration,
    specialType: pick('specialType'),
    specialValue: pick('specialValue'),
    specialDuration: pick('specialDuration'),
    reactionTriggers: pick('reactionTriggersJson')
      ? parseReactionTriggersJson(pick('reactionTriggersJson'))
      : [],
  };
}

function parseReactionTriggersJson(raw: string): SkillFlatRow['reactionTriggers'] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const data = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(data)) return [];
    const out: SkillFlatRow['reactionTriggers'] = [];
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;
      const el = String((item as { element?: unknown }).element ?? '').trim();
      const re = String((item as { reaction?: unknown }).reaction ?? '').trim();
      if (el && re) out.push({ element: el, reaction: re });
    }
    return out;
  } catch {
    return [];
  }
}

export function validateSkillDrafts(drafts: BattleSkillDraft[]): SkillDraftValidationResult {
  const skills: Skill[] = [];
  const draftErrors: { draftId: string; label: string; error: string }[] = [];
  const seenIds = new Set<string>();

  if (drafts.length === 0) {
    return {
      ok: false,
      skills: [],
      draftErrors: [{ draftId: '', label: '', error: 'Add at least one skill.' }],
    };
  }

  drafts.forEach((draft, index) => {
    const label = draft.fields.name?.value?.trim() || draft.fields.id?.value?.trim() || `Skill ${index + 1}`;
    const missingRequired = BATTLE_SKILL_MAPPING_FIELDS.filter(
      (f) => f.required && !draft.fields[f.key]?.value?.trim(),
    );
    if (missingRequired.length > 0) {
      draftErrors.push({
        draftId: draft.draftId,
        label,
        error: `Missing: ${missingRequired.map((f) => f.label).join(', ')}`,
      });
      return;
    }

    const flat = draftToFlatRow(draft);
    const converted = flatRowToSkill(flat);
    if ('error' in converted) {
      draftErrors.push({ draftId: draft.draftId, label, error: converted.error });
      return;
    }
    if (seenIds.has(converted.skill.id)) {
      draftErrors.push({
        draftId: draft.draftId,
        label,
        error: `Duplicate skill id "${converted.skill.id}".`,
      });
      return;
    }
    seenIds.add(converted.skill.id);
    skills.push(converted.skill);
  });

  return {
    ok: draftErrors.length === 0 && skills.length > 0,
    skills,
    draftErrors,
  };
}
