import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { resetSkill } from '../supabaseProgressionStorage';

describe('supabaseProgressionStorage', () => {
  it('resets a skill through the atomic reset RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        user_id: 'user-1',
        skill_id: 'fireball',
        level: 0,
        spent_sp: 0,
      },
      error: null,
    }));
    const supabase = { rpc } as unknown as SupabaseClient;

    const row = await resetSkill(supabase, 'fireball');

    expect(rpc).toHaveBeenCalledWith('sim_reset_skill', {
      p_skill_id: 'fireball',
    });
    expect(row).toEqual({
      skillId: 'fireball',
      level: 0,
      spentSp: 0,
    });
  });

  it('falls back to a table reset when the reset RPC is missing', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'Could not find the function public.sim_reset_skill(p_skill_id) in the schema cache',
      },
    }));
    const skillSelect = {
      eq: vi.fn(() => skillSelect),
      maybeSingle: vi.fn(async () => ({
        data: {
          user_id: 'user-1',
          skill_id: 'fireball',
          level: 2,
          spent_sp: 3,
        },
        error: null,
      })),
    };
    const progressionSelect = {
      eq: vi.fn(() => progressionSelect),
      maybeSingle: vi.fn(async () => ({
        data: {
          user_id: 'user-1',
          character_asset_id: 'char-1',
          character_library_id: 'characters',
          level: 4,
          exp: 250,
          skill_points: 1,
          updated_at: '2026-07-03T00:00:00.000Z',
        },
        error: null,
      })),
    };
    const progressionUpdate = {
      eq: vi.fn(() => progressionUpdate),
      select: vi.fn(() => progressionUpdate),
      single: vi.fn(async () => ({
        data: {
          user_id: 'user-1',
          character_asset_id: 'char-1',
          character_library_id: 'characters',
          level: 4,
          exp: 250,
          skill_points: 4,
          updated_at: '2026-07-03T00:01:00.000Z',
        },
        error: null,
      })),
    };
    const skillDelete = {
      eq: vi.fn(() => skillDelete),
      select: vi.fn(() => skillDelete),
      maybeSingle: vi.fn(async () => ({
        data: {
          user_id: 'user-1',
          skill_id: 'fireball',
          level: 2,
          spent_sp: 3,
        },
        error: null,
      })),
    };
    const from = vi.fn((table: string) => {
      if (table === 'sim_user_skill_levels') {
        return {
          select: vi.fn(() => skillSelect),
          delete: vi.fn(() => skillDelete),
        };
      }
      if (table === 'sim_user_progression') {
        return {
          select: vi.fn(() => progressionSelect),
          update: vi.fn(() => progressionUpdate),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    const supabase = { from, rpc } as unknown as SupabaseClient;

    const row = await resetSkill(supabase, 'fireball', 'user-1');

    expect(rpc).toHaveBeenCalledWith('sim_reset_skill', {
      p_skill_id: 'fireball',
    });
    expect(progressionUpdate.single).toHaveBeenCalledTimes(1);
    expect(skillDelete.maybeSingle).toHaveBeenCalledTimes(1);
    expect(row).toEqual({
      skillId: 'fireball',
      level: 0,
      spentSp: 0,
    });
  });
});
