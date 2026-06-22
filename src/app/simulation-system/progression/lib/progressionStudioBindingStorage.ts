export const PROGRESSION_STUDIO_BINDING_KEY = 'keco-sim:progression-studio-binding:v1';
export const PROGRESSION_CONFIG_UPDATED_EVENT = 'keco-progression-config-updated';

export interface ProgressionStudioBinding {
  projectId?: string;
  tracksLibraryId: string;
  rulesLibraryId: string;
  tracksLibraryLabel?: string;
  rulesLibraryLabel?: string;
  importedAt: number;
}

export function readProgressionStudioBinding(): ProgressionStudioBinding | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROGRESSION_STUDIO_BINDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProgressionStudioBinding>;
    if (!parsed.tracksLibraryId || !parsed.rulesLibraryId) return null;
    return {
      projectId: parsed.projectId,
      tracksLibraryId: parsed.tracksLibraryId,
      rulesLibraryId: parsed.rulesLibraryId,
      tracksLibraryLabel: parsed.tracksLibraryLabel,
      rulesLibraryLabel: parsed.rulesLibraryLabel,
      importedAt: parsed.importedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function writeProgressionStudioBinding(binding: ProgressionStudioBinding): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESSION_STUDIO_BINDING_KEY, JSON.stringify(binding));
  } catch {
    // ignore
  }
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
  const base = '/simulation-system/progression/simulate';
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
