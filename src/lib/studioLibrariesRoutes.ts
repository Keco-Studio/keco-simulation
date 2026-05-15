/** Routes for the copied Keco Studio project / folder / library UI inside keco-simulation. */

export const STUDIO_LIBRARIES_HUB_PATH = '/simulation-system/battle/studio-libraries';

export function studioLibrariesHubUrl(projectId: string): string {
  return `${STUDIO_LIBRARIES_HUB_PATH}?projectId=${encodeURIComponent(projectId)}`;
}

export function studioLibrariesLibraryUrl(projectId: string, libraryId: string): string {
  return `${STUDIO_LIBRARIES_HUB_PATH}/library/${encodeURIComponent(libraryId)}?projectId=${encodeURIComponent(projectId)}`;
}

export function studioLibrariesFolderUrl(projectId: string, folderId: string): string {
  return `${STUDIO_LIBRARIES_HUB_PATH}/folder/${encodeURIComponent(folderId)}?projectId=${encodeURIComponent(projectId)}`;
}
