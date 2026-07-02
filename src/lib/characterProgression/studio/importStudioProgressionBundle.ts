import type { SupabaseClient } from '@supabase/supabase-js';
import type { Skill } from '@/app/simulation-system/battle/types';
import {
  buildDraftFromTableRow,
  detectIdColumnKey,
  planImportColumnMapping,
} from '@/app/simulation-system/battle/lib/localTableSkillSource/importSkillRowFromTable';
import { loadStudioLibraryTableData } from '@/app/simulation-system/battle/lib/localTableSkillSource/simTablePickerData';
import { draftToFlatRow } from '@/app/simulation-system/battle/lib/localTableSkillSource/battleSkillDrafts';
import { flatRowToSkill } from '@/app/simulation-system/battle/lib/skills/skillTableCodec';
import { cellValueToString } from '@/app/simulation-system/battle/lib/localTableSkillSource/cellDisplayValue';
import { getLibraryAssetsWithProperties } from '@studio/lib/services/libraryAssetsService';
import type { SimTableRow } from '@/lib/simLocalTables/types';
import type { CharLevelCurveRow, SkillLevelCurveRow, StudioProgressionBundle } from '../types';
import { mapStudioAssetToCharacter, normalizeSkillReferenceKey } from './mapStudioRowToCharacter';

export interface StudioLibraryBinding {
  projectId: string;
  charactersLibraryId: string;
  skillsLibraryId: string;
  charLevelCurveLibraryId: string;
  skillLevelCurveLibraryId: string;
}

function cellInt(values: Record<string, unknown>, key: string, fallback = 0): number {
  const raw = cellValueToString(values[key]).trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function cellFloat(values: Record<string, unknown>, key: string): number | undefined {
  const raw = cellValueToString(values[key]).trim();
  if (!raw) return undefined;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

type StudioTableColumn = { key: string; label: string };
type StudioCharacterAsset = {
  id: string;
  name?: string | null;
  propertyValues: Record<string, unknown>;
};

function normalizeStudioColumnKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

const CURVE_COLUMN_ALIASES: Record<string, string> = {
  needexp: 'need_exp',
  need_exp: 'need_exp',
  required_exp: 'need_exp',
  requiredexp: 'need_exp',
  grantsp: 'grant_sp',
  grant_sp: 'grant_sp',
  skillid: 'skill_id',
  skill_id: 'skill_id',
  costsp: 'cost_sp',
  cost_sp: 'cost_sp',
  powerbonus: 'power_bonus',
  power_bonus: 'power_bonus',
  mpcostdelta: 'mp_cost_delta',
  mp_cost_delta: 'mp_cost_delta',
  cooldowndelta: 'cooldown_delta',
  cooldown_delta: 'cooldown_delta',
};

function semanticColumnKey(column: StudioTableColumn): string {
  const label = normalizeStudioColumnKey(column.label);
  const key = normalizeStudioColumnKey(column.key);
  if (label) return CURVE_COLUMN_ALIASES[label] ?? label;
  return CURVE_COLUMN_ALIASES[key] ?? key;
}

function remapRowsByColumns(
  columns: StudioTableColumn[],
  rows: SimTableRow[],
): SimTableRow[] {
  const fieldKeyToSemantic = new Map<string, string>();
  for (const column of columns) {
    const semantic = semanticColumnKey(column);
    if (semantic && semantic !== 'name') fieldKeyToSemantic.set(column.key, semantic);
  }

  return rows.map((row) => {
    const values: Record<string, unknown> = {};
    for (const [fieldKey, raw] of Object.entries(row.values)) {
      values[fieldKeyToSemantic.get(fieldKey) ?? fieldKey] = raw;
    }
    return { ...row, values };
  });
}

function hasMeaningfulStudioValue(value: unknown): boolean {
  return cellValueToString(value).trim().length > 0;
}

function hasImportableCharacterAsset(asset: StudioCharacterAsset): boolean {
  if (hasMeaningfulStudioValue(asset.name)) return true;
  return Object.values(asset.propertyValues).some(hasMeaningfulStudioValue);
}

function parseCharLevelCurve(rows: SimTableRow[]): CharLevelCurveRow[] {
  return rows
    .map((row) => ({
      level: cellInt(row.values, 'level'),
      needExp: cellInt(row.values, 'need_exp'),
      grantSp: cellInt(row.values, 'grant_sp'),
    }))
    .filter((r) => r.level >= 1)
    .sort((a, b) => a.level - b.level);
}

export function parseCharLevelCurveFromStudioTable(
  columns: StudioTableColumn[],
  rows: SimTableRow[],
): CharLevelCurveRow[] {
  return parseCharLevelCurve(remapRowsByColumns(columns, rows));
}

function parseSkillLevelCurve(rows: SimTableRow[]): SkillLevelCurveRow[] {
  return rows
    .map((row): SkillLevelCurveRow | null => {
      const skillId = cellValueToString(row.values.skill_id).trim();
      const level = cellInt(row.values, 'level');
      const costSp = cellInt(row.values, 'cost_sp');
      if (!skillId || level < 1 || costSp < 1) return null;
      return {
        skillId,
        level,
        costSp,
        powerBonus: cellFloat(row.values, 'power_bonus'),
        mpCostDelta: cellInt(row.values, 'mp_cost_delta', 0) || undefined,
        cooldownDelta: cellInt(row.values, 'cooldown_delta', 0) || undefined,
      };
    })
    .filter((r): r is SkillLevelCurveRow => r !== null);
}

export function parseSkillLevelCurveFromStudioTable(
  columns: StudioTableColumn[],
  rows: SimTableRow[],
): SkillLevelCurveRow[] {
  return parseSkillLevelCurve(remapRowsByColumns(columns, rows));
}

function importSkillsFromStudioTable(
  tableId: string,
  columns: { key: string; label: string }[],
  rows: SimTableRow[],
): { skills: Record<string, Skill>; skillIdByAssetId: Map<string, string> } {
  const skills: Record<string, Skill> = {};
  const skillIdByAssetId = new Map<string, string>();
  const { columnToField } = planImportColumnMapping(columns);
  const idColumnKey = detectIdColumnKey(columns);
  if (!idColumnKey) return { skills, skillIdByAssetId };

  for (const row of rows) {
    const skillIdValue = cellValueToString(row.values[idColumnKey]).trim();
    if (!skillIdValue) continue;
    const draft = buildDraftFromTableRow({
      tableId,
      row,
      columnToField,
      idColumnKey,
      skillIdValue,
    });
    const flat = draftToFlatRow(draft);
    const converted = flatRowToSkill(flat);
    if ('error' in converted) continue;
    skills[converted.skill.id] = converted.skill;
    skillIdByAssetId.set(row.id, converted.skill.id);
  }

  return { skills, skillIdByAssetId };
}

export function validateStudioProgressionBundle(bundle: StudioProgressionBundle): void {
  if (Object.keys(bundle.characters).length === 0) {
    throw new Error('Characters library is empty or has no valid character rows.');
  }
  if (Object.keys(bundle.skills).length === 0) {
    throw new Error('Skills library is empty or has no valid skill rows.');
  }
  if (bundle.charLevelCurve.length === 0) {
    throw new Error('Character level curve library is empty or has no valid level rows.');
  }
  if (bundle.skillLevelCurve.length === 0) {
    throw new Error('Skill level curve library is empty or has no valid upgrade rows.');
  }
}

export async function importStudioProgressionBundle(
  supabase: SupabaseClient,
  binding: StudioLibraryBinding,
): Promise<StudioProgressionBundle> {
  const [skillsData, charCurveData, skillCurveData, characterAssets] = await Promise.all([
    loadStudioLibraryTableData(supabase, binding.skillsLibraryId),
    loadStudioLibraryTableData(supabase, binding.charLevelCurveLibraryId),
    loadStudioLibraryTableData(supabase, binding.skillLevelCurveLibraryId),
    getLibraryAssetsWithProperties(supabase, binding.charactersLibraryId),
  ]);

  const importableCharacterAssets = (characterAssets as StudioCharacterAsset[]).filter(
    hasImportableCharacterAsset,
  );
  if (importableCharacterAssets.length === 0) {
    throw new Error('Characters library is empty or has no valid character rows.');
  }

  const skillsTableId = `studio:${binding.skillsLibraryId}`;
  const { skills, skillIdByAssetId } = importSkillsFromStudioTable(
    skillsTableId,
    skillsData.columns,
    skillsData.rows,
  );
  const skillIdByReferenceValue = new Map<string, string>();
  for (const skill of Object.values(skills)) {
    skillIdByReferenceValue.set(normalizeSkillReferenceKey(skill.id), skill.id);
    skillIdByReferenceValue.set(normalizeSkillReferenceKey(skill.name), skill.id);
  }

  const characters: StudioProgressionBundle['characters'] = {};
  for (const asset of importableCharacterAssets) {
    const mapped = mapStudioAssetToCharacter(asset, skillIdByAssetId, skillIdByReferenceValue);
    if (mapped) characters[asset.id] = mapped;
  }

  const bundle: StudioProgressionBundle = {
    characters,
    skills,
    charLevelCurve: parseCharLevelCurveFromStudioTable(
      charCurveData.columns,
      charCurveData.rows,
    ),
    skillLevelCurve: parseSkillLevelCurveFromStudioTable(
      skillCurveData.columns,
      skillCurveData.rows,
    ),
  };
  validateStudioProgressionBundle(bundle);
  return bundle;
}
