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
  for (const asset of characterAssets) {
    const mapped = mapStudioAssetToCharacter(asset, skillIdByAssetId, skillIdByReferenceValue);
    if (mapped) characters[asset.id] = mapped;
  }

  return {
    characters,
    skills,
    charLevelCurve: parseCharLevelCurve(charCurveData.rows),
    skillLevelCurve: parseSkillLevelCurve(skillCurveData.rows),
  };
}
