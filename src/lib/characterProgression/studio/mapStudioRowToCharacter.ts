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

/** Map one Studio character asset row to simulation character config. */
export function mapStudioAssetToCharacter(
  asset: { id: string; name?: string | null; propertyValues: Record<string, unknown> },
  skillIdByAssetId: Map<string, string>,
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
      skillIds.push(fromAsset);
      continue;
    }
    const display = ref.displayValue?.trim();
    if (display) skillIds.push(display);
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
