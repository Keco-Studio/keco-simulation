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

type SupabaseRequestError = {
  code?: string;
  message?: string;
};

function getRequestErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as SupabaseRequestError).message === 'string'
  ) {
    return (error as SupabaseRequestError).message!;
  }
  return 'Supabase request failed';
}

function throwRequestError(error: unknown): never {
  if (error instanceof Error) throw error;
  throw new Error(getRequestErrorMessage(error));
}

function isMissingResetSkillRpcError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const requestError = error as SupabaseRequestError;
  const message = requestError.message ?? '';
  return (
    requestError.code === 'PGRST202' ||
    requestError.code === '42883' ||
    (message.includes('sim_reset_skill') &&
      (message.includes('schema cache') || message.includes('Could not find the function')))
  );
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
  if (error) throwRequestError(error);
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

export async function resetSkill(
  supabase: SupabaseClient,
  skillId: string,
  userId?: string,
): Promise<UserSkillLevel> {
  const { data, error } = await supabase.rpc('sim_reset_skill', {
    p_skill_id: skillId,
  });
  if (error) {
    if (userId && isMissingResetSkillRpcError(error)) {
      return resetSkillWithTables(supabase, userId, skillId);
    }
    throwRequestError(error);
  }
  return mapSkillLevelRow(data as SkillLevelRow);
}

async function resetSkillWithTables(
  supabase: SupabaseClient,
  userId: string,
  skillId: string,
): Promise<UserSkillLevel> {
  const { data: existingData, error: existingError } = await supabase
    .from(SKILL_LEVELS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle();
  if (existingError) throwRequestError(existingError);
  if (!existingData) return { skillId, level: 0, spentSp: 0 };

  const existing = existingData as SkillLevelRow;
  const current = await loadUserProgression(supabase, userId);
  if (!current) {
    throw new Error('User progression row not found');
  }

  const { error: progressionError } = await supabase
    .from(PROGRESSION_TABLE)
    .update({
      skill_points: current.skillPoints + existing.spent_sp,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (progressionError) throwRequestError(progressionError);

  const { error: deleteError } = await supabase
    .from(SKILL_LEVELS_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .select('*')
    .maybeSingle();
  if (deleteError) throwRequestError(deleteError);

  return { skillId: existing.skill_id, level: 0, spentSp: 0 };
}

export async function listUserSkillLevels(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSkillLevel[]> {
  const { data, error } = await supabase
    .from(SKILL_LEVELS_TABLE)
    .select('*')
    .eq('user_id', userId);
  if (error) throwRequestError(error);
  return (data ?? []).map((row) => mapSkillLevelRow(row as SkillLevelRow));
}
