import type { SupabaseClient } from '@supabase/supabase-js';
import { accrueCharacterExp } from './merge';
import type { ApplyBattleExpResult, CharLevelCurveRow, UserProgression, UserSkillLevel } from './types';

const PROGRESSION_TABLE = 'sim_user_progression';
const SKILL_LEVELS_TABLE = 'sim_user_skill_levels';

type ProgressionRow = {
  user_id: string;
  character_asset_id: string | null;
  character_library_id: string | null;
  level: number;
  exp: number;
  skill_points: number;
  updated_at: string;
};

type SkillLevelRow = {
  user_id: string;
  skill_id: string;
  level: number;
  spent_sp: number;
};

function mapProgressionRow(row: ProgressionRow): UserProgression {
  return {
    userId: row.user_id,
    characterAssetId: row.character_asset_id,
    characterLibraryId: row.character_library_id,
    level: row.level,
    exp: row.exp,
    skillPoints: row.skill_points,
    updatedAt: row.updated_at,
  };
}

function mapSkillLevelRow(row: SkillLevelRow): UserSkillLevel {
  return {
    skillId: row.skill_id,
    level: row.level,
    spentSp: row.spent_sp,
  };
}

export async function loadUserProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgression | null> {
  const { data, error } = await supabase
    .from(PROGRESSION_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProgressionRow(data as ProgressionRow) : null;
}

export async function ensureUserProgression(
  supabase: SupabaseClient,
  userId: string,
  bind?: { characterAssetId: string; characterLibraryId: string },
): Promise<UserProgression> {
  const existing = await loadUserProgression(supabase, userId);
  if (existing) return existing;

  const insertRow: Record<string, unknown> = { user_id: userId };
  if (bind) {
    insertRow.character_asset_id = bind.characterAssetId;
    insertRow.character_library_id = bind.characterLibraryId;
  }

  const { data, error } = await supabase
    .from(PROGRESSION_TABLE)
    .insert(insertRow)
    .select('*')
    .single();
  if (error) throw error;
  return mapProgressionRow(data as ProgressionRow);
}

export async function bindCharacter(
  supabase: SupabaseClient,
  userId: string,
  characterAssetId: string,
  characterLibraryId: string,
): Promise<UserProgression> {
  await ensureUserProgression(supabase, userId);
  const { data, error } = await supabase
    .from(PROGRESSION_TABLE)
    .update({
      character_asset_id: characterAssetId,
      character_library_id: characterLibraryId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapProgressionRow(data as ProgressionRow);
}

export async function applyBattleExp(
  supabase: SupabaseClient,
  userId: string,
  gainedExp: number,
  curve: CharLevelCurveRow[],
  expectedUpdatedAt?: string,
  retry = true,
): Promise<ApplyBattleExpResult> {
  const current = await loadUserProgression(supabase, userId);
  if (!current) {
    throw new Error('User progression row not found');
  }

  const accrued = accrueCharacterExp(
    {
      level: current.level,
      exp: current.exp,
      skillPoints: current.skillPoints,
    },
    gainedExp,
    curve,
  );

  const lockAt = expectedUpdatedAt ?? current.updatedAt;
  const { data, error } = await supabase
    .from(PROGRESSION_TABLE)
    .update({
      level: accrued.progression.level,
      exp: accrued.progression.exp,
      skill_points: accrued.progression.skillPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('updated_at', lockAt)
    .select('*')
    .maybeSingle();

  if (error) throw error;

  if (!data && retry) {
    return applyBattleExp(supabase, userId, gainedExp, curve, undefined, false);
  }
  if (!data) {
    throw new Error('Progression update conflict; please retry');
  }

  const progression = mapProgressionRow(data as ProgressionRow);
  return {
    progression,
    leveledUp: accrued.leveledUp,
    levelsGained: accrued.levelsGained,
    spGranted: accrued.spGranted,
    expGained: gainedExp,
  };
}

export async function upgradeSkill(
  supabase: SupabaseClient,
  skillId: string,
  costSp: number,
): Promise<UserSkillLevel> {
  const { data, error } = await supabase.rpc('sim_upgrade_skill', {
    p_skill_id: skillId,
    p_cost_sp: costSp,
  });
  if (error) throw error;
  return mapSkillLevelRow(data as SkillLevelRow);
}

export async function listUserSkillLevels(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSkillLevel[]> {
  const { data, error } = await supabase
    .from(SKILL_LEVELS_TABLE)
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => mapSkillLevelRow(row as SkillLevelRow));
}
