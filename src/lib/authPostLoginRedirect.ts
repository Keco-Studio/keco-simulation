/** Default landing route after sign-in when no simulation path is available. */
export const SIMULATION_DEFAULT_POST_LOGIN_PATH =
  '/simulation-system/battle/studio-libraries';

function isSafeRelativePath(path: string): boolean {
  const trimmed = path.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('://');
}

function normalizePathForCompare(path: string): string {
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.delete('redirect');
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Where to send the user after a successful sign-in in keco-simulation.
 * Priority: explicit `?redirect=` → current `/simulation-system/*` URL → studio-libraries hub.
 */
export function resolvePostLoginRedirect(options: {
  explicitRedirect?: string | null;
  pathname?: string;
  search?: string;
}): string {
  const { explicitRedirect, pathname = '', search = '' } = options;

  if (explicitRedirect && isSafeRelativePath(explicitRedirect)) {
    return explicitRedirect.trim();
  }

  if (pathname.startsWith('/simulation-system')) {
    const raw = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(raw);
    params.delete('redirect');
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return SIMULATION_DEFAULT_POST_LOGIN_PATH;
}

/** Skip client navigation when the user is already on the resolved post-login URL. */
export function isAlreadyOnPostLoginPath(
  target: string,
  pathname: string,
  search: string,
): boolean {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const current = raw ? `${pathname}?${raw}` : pathname;
  return normalizePathForCompare(target) === normalizePathForCompare(current);
}
