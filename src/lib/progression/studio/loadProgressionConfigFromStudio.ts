import type { SupabaseClient } from '@supabase/supabase-js';
import { loadStudioLibraryTableData } from '@/app/simulation-system/battle/lib/localTableSkillSource/simTablePickerData';
import {
  mapStudioRowsToProgressionConfigWithStats,
  simTableRowsToRuleProgressionRows,
  simTableRowsToTrackProgressionRows,
  type MapStudioConfigResult,
} from './mapStudioRowsToConfig';

export async function loadProgressionConfigFromStudio(
  supabase: SupabaseClient,
  tracksLibraryId: string,
  rulesLibraryId: string,
): Promise<MapStudioConfigResult> {
  const [tracksData, rulesData] = await Promise.all([
    loadStudioLibraryTableData(supabase, tracksLibraryId),
    loadStudioLibraryTableData(supabase, rulesLibraryId),
  ]);
  return mapStudioRowsToProgressionConfigWithStats(
    simTableRowsToTrackProgressionRows(tracksData.columns, tracksData.rows),
    simTableRowsToRuleProgressionRows(rulesData.columns, rulesData.rows),
  );
}
