import { normalizeReferenceSelections } from '@studio/lib/utils/referenceValue';
import type { StudioCharacterRow } from '../types';

function cellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

function cellInt(value: unknown, fallback = 0): number {
  const raw = cellString(value);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeSkillReferenceKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function splitSkillReferenceText(value: string): string[] {
  return value
    .split(/[,，;\n\r]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveSkillReferenceText(
  value: string,
  skillIdByReferenceValue: Map<string, string>,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return skillIdByReferenceValue.get(normalizeSkillReferenceKey(trimmed)) ?? trimmed;
}

function pushSkillId(skillIds: string[], skillId: string | null): void {
  if (!skillId || skillIds.includes(skillId)) return;
  skillIds.push(skillId);
}

/** Map one Studio character asset row to simulation character config. */
export function mapStudioAssetToCharacter(
  asset: { id: string; name?: string | null; propertyValues: Record<string, unknown> },
  skillIdByAssetId: Map<string, string>,
  skillIdByReferenceValue: Map<string, string> = new Map(),
): StudioCharacterRow | null {
  const pv = asset.propertyValues;
  const characterId =
    cellString(pv.character_id) || cellString(pv.characterId) || asset.id.trim();
  if (!characterId) return null;

  const refs = normalizeReferenceSelections(pv.skill_ids ?? pv.skillIds);
  const skillIds: string[] = [];
  for (const ref of refs) {
    const fromAsset = skillIdByAssetId.get(ref.assetId);
    if (fromAsset) {
      pushSkillId(skillIds, fromAsset);
      continue;
    }
    const fromReferenceAsset = skillIdByReferenceValue.get(normalizeSkillReferenceKey(ref.assetId));
    if (fromReferenceAsset) {
      pushSkillId(skillIds, fromReferenceAsset);
      continue;
    }

    const splitAssetIds = splitSkillReferenceText(ref.assetId);
    if (splitAssetIds.length > 1) {
      for (const item of splitAssetIds) {
        pushSkillId(skillIds, resolveSkillReferenceText(item, skillIdByReferenceValue));
      }
      continue;
    }

    const display = ref.displayValue?.trim();
    if (display) {
      const fromDisplay = skillIdByReferenceValue.get(normalizeSkillReferenceKey(display));
      pushSkillId(skillIds, fromDisplay ?? display);
    }
  }

  return {
    assetId: asset.id,
    characterId,
    name: cellString(pv.name) || asset.name?.trim() || characterId,
    hp: cellInt(pv.hp, 100),
    atk: cellInt(pv.atk, 10),
    def: cellInt(pv.def, 5),
    spd: cellInt(pv.spd, 8),
    mp: cellInt(pv.mp, 50),
    skillIds,
  };
}

/** @deprecated Use mapStudioAssetToCharacter with raw property values. */
export function mapStudioRowToCharacter(
  assetId: string,
  values: Record<string, string>,
  skillIdByAssetId: Map<string, string>,
): StudioCharacterRow | null {
  const propertyValues: Record<string, unknown> = { ...values };
  return mapStudioAssetToCharacter(
    { id: assetId, name: values.name, propertyValues },
    skillIdByAssetId,
  );
}
