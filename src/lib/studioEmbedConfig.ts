/**
 * Keco Studio origin for embedding project library UI inside keco-simulation (cross-origin iframe).
 * Set NEXT_PUBLIC_KECO_STUDIO_ORIGIN in .env.local (e.g. http://localhost:3000).
 */

export function getStudioOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_KECO_STUDIO_ORIGIN?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function isStudioEmbedConfigured(): boolean {
  return Boolean(getStudioOrigin());
}
