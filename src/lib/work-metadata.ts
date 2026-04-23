/**
 * Per-image metadata keyed by public URL path, e.g. "/images/DSC07209.jpg"
 * (`objectPosition` is optional; keys stay unprefixed — scene-data adds basePath when needed).
 * `artists` entries should match `Artist.id` from src/app/artists.ts.
 */
export type WorkMeta = {
  title: string;
  artists: string[];
  year?: number;
  medium?: string;
  /**
   * CSS `object-position` for scene slots + lightbox when the subject sits high
   * in the frame (e.g. `"center top"` or `"50% 28%"`).
   */
  objectPosition?: string;
};

export type WorkMetadataMap = Record<string, WorkMeta>;

export function getWorkMeta(
  imageSrc: string,
  map: WorkMetadataMap | undefined
): WorkMeta | undefined {
  if (!map) return undefined;
  return map[imageSrc];
}

export function workObjectPosition(
  imageSrc: string,
  map: WorkMetadataMap | undefined
): string | undefined {
  const m = getWorkMeta(imageSrc, map);
  const p = m?.objectPosition?.trim();
  return p || undefined;
}

/** Screen reader / visible label when metadata exists. */
export function workImageAlt(
  imageSrc: string,
  map: WorkMetadataMap | undefined,
  fallbackIndex: number,
  resolveArtist?: (id: string) => string | undefined
): string {
  const m = getWorkMeta(imageSrc, map);
  if (!m) return `Artwork ${fallbackIndex + 1}`;
  const names = m.artists.map((id) => resolveArtist?.(id) ?? id);
  const who = names.length ? ` — ${names.join(", ")}` : "";
  const yr = m.year != null ? ` (${m.year})` : "";
  return `${m.title}${who}${yr}`;
}
