export const PROGRESSION_STUDIO_BINDING_KEY = 'keco-sim:progression-studio-binding:v1';
/** @deprecated Migrated into PROGRESSION_STUDIO_BINDING_KEY */
const LEGACY_CLOUD_BINDING_KEY = 'keco-sim:character-progression-studio-binding:v1';

export const PROGRESSION_CONFIG_UPDATED_EVENT = 'keco-progression-config-updated';

export interface ProgressionStudioBinding {
  projectId?: string;
  importedAt: number;
  /** Cloud character EXP / skill points (primary) */
  charactersLibraryId?: string;
  skillsLibraryId?: string;
  charLevelCurveLibraryId?: string;
  skillLevelCurveLibraryId?: string;
  cloudLabels?: {
    characters?: string;
    skills?: string;
    charLevelCurve?: string;
    skillLevelCurve?: string;
  };
  /** Legacy offline rule simulate */
  tracksLibraryId?: string;
  rulesLibraryId?: string;
  tracksLibraryLabel?: string;
  rulesLibraryLabel?: string;
}

export type CloudProgressionStudioBinding = Pick<
  ProgressionStudioBinding,
  | 'projectId'
  | 'importedAt'
  | 'charactersLibraryId'
  | 'skillsLibraryId'
  | 'charLevelCurveLibraryId'
  | 'skillLevelCurveLibraryId'
  | 'cloudLabels'
>;

function parseBindingRaw(raw: string): ProgressionStudioBinding | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressionStudioBinding>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      projectId: parsed.projectId,
      importedAt: parsed.importedAt ?? 0,
      charactersLibraryId: parsed.charactersLibraryId,
      skillsLibraryId: parsed.skillsLibraryId,
      charLevelCurveLibraryId: parsed.charLevelCurveLibraryId,
      skillLevelCurveLibraryId: parsed.skillLevelCurveLibraryId,
      cloudLabels: parsed.cloudLabels,
      tracksLibraryId: parsed.tracksLibraryId,
      rulesLibraryId: parsed.rulesLibraryId,
      tracksLibraryLabel: parsed.tracksLibraryLabel,
      rulesLibraryLabel: parsed.rulesLibraryLabel,
    };
  } catch {
    return null;
  }
}

function migrateLegacyCloudBinding(): ProgressionStudioBinding | null {
  if (typeof window === 'undefined') return null;
  try {
    const legacyRaw = localStorage.getItem(LEGACY_CLOUD_BINDING_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as Partial<ProgressionStudioBinding & { labels?: CloudProgressionStudioBinding['cloudLabels'] }>;
    if (
      !legacy.charactersLibraryId ||
      !legacy.skillsLibraryId ||
      !legacy.charLevelCurveLibraryId ||
      !legacy.skillLevelCurveLibraryId
    ) {
      return null;
    }
    const merged: ProgressionStudioBinding = {
      projectId: legacy.projectId,
      importedAt: legacy.importedAt ?? 0,
      charactersLibraryId: legacy.charactersLibraryId,
      skillsLibraryId: legacy.skillsLibraryId,
      charLevelCurveLibraryId: legacy.charLevelCurveLibraryId,
      skillLevelCurveLibraryId: legacy.skillLevelCurveLibraryId,
      cloudLabels: legacy.cloudLabels ?? legacy.labels,
    };
    const existing = localStorage.getItem(PROGRESSION_STUDIO_BINDING_KEY);
    const base = existing ? parseBindingRaw(existing) : null;
    writeProgressionStudioBinding({ ...base, ...merged, importedAt: merged.importedAt });
    localStorage.removeItem(LEGACY_CLOUD_BINDING_KEY);
    return { ...base, ...merged };
  } catch {
    return null;
  }
}

export function readProgressionStudioBinding(): ProgressionStudioBinding | null {
  if (typeof window === 'undefined') return null;
  try {
    migrateLegacyCloudBinding();
    const raw = localStorage.getItem(PROGRESSION_STUDIO_BINDING_KEY);
    if (!raw) return null;
    return parseBindingRaw(raw);
  } catch {
    return null;
  }
}

export function readCloudProgressionStudioBinding(): CloudProgressionStudioBinding | null {
  const binding = readProgressionStudioBinding();
  if (
    !binding?.charactersLibraryId ||
    !binding.skillsLibraryId ||
    !binding.charLevelCurveLibraryId ||
    !binding.skillLevelCurveLibraryId
  ) {
    return null;
  }
  return {
    projectId: binding.projectId,
    importedAt: binding.importedAt,
    charactersLibraryId: binding.charactersLibraryId,
    skillsLibraryId: binding.skillsLibraryId,
    charLevelCurveLibraryId: binding.charLevelCurveLibraryId,
    skillLevelCurveLibraryId: binding.skillLevelCurveLibraryId,
    cloudLabels: binding.cloudLabels,
  };
}

export function readLegacyRuleSimulateBinding(): Pick<
  ProgressionStudioBinding,
  'projectId' | 'tracksLibraryId' | 'rulesLibraryId' | 'tracksLibraryLabel' | 'rulesLibraryLabel' | 'importedAt'
> | null {
  const binding = readProgressionStudioBinding();
  if (!binding?.tracksLibraryId || !binding.rulesLibraryId) return null;
  return {
    projectId: binding.projectId,
    tracksLibraryId: binding.tracksLibraryId,
    rulesLibraryId: binding.rulesLibraryId,
    tracksLibraryLabel: binding.tracksLibraryLabel,
    rulesLibraryLabel: binding.rulesLibraryLabel,
    importedAt: binding.importedAt,
  };
}

export function writeProgressionStudioBinding(binding: ProgressionStudioBinding): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readProgressionStudioBinding();
    localStorage.setItem(
      PROGRESSION_STUDIO_BINDING_KEY,
      JSON.stringify({ ...existing, ...binding, importedAt: binding.importedAt ?? Date.now() }),
    );
  } catch {
    // ignore
  }
}

export function writeCloudProgressionStudioBinding(patch: CloudProgressionStudioBinding): void {
  const existing = readProgressionStudioBinding();
  writeProgressionStudioBinding({
    ...existing,
    ...patch,
    importedAt: patch.importedAt ?? Date.now(),
  });
}

export function clearProgressionStudioBinding(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROGRESSION_STUDIO_BINDING_KEY);
  } catch {
    // ignore
  }
}

export function notifyProgressionConfigUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROGRESSION_CONFIG_UPDATED_EVENT));
}

export function buildProgressionSimulatePath(binding?: Partial<ProgressionStudioBinding>): string {
  const base = '/simulation-system/battle';
  if (!binding?.tracksLibraryId || !binding?.rulesLibraryId) return base;
  const q = new URLSearchParams();
  if (binding.projectId) q.set('projectId', binding.projectId);
  q.set('tracksLibraryId', binding.tracksLibraryId);
  q.set('rulesLibraryId', binding.rulesLibraryId);
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseProgressionSimulateSearchParams(
  params: URLSearchParams,
): Partial<ProgressionStudioBinding> | null {
  const tracksLibraryId = params.get('tracksLibraryId')?.trim();
  const rulesLibraryId = params.get('rulesLibraryId')?.trim();
  if (!tracksLibraryId || !rulesLibraryId) return null;
  return {
    projectId: params.get('projectId')?.trim() || undefined,
    tracksLibraryId,
    rulesLibraryId,
  };
}
