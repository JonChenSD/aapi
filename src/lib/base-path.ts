/**
 * GitHub Pages project sites are served from `https://<user>.github.io/<repo>/`.
 * Set `NEXT_PUBLIC_BASE_PATH` at build time to `/<repo>` (leading slash, no trailing
 * slash). Leave unset for root hosting (`/`).
 */
const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();

export const BASE_PATH = raw.replace(/\/$/, "") || "";

/** Prefix absolute app paths (`/images/...`) when using a subpath. */
export function withBasePath(href: string): string {
  if (!BASE_PATH) return href;
  if (!href.startsWith("/")) return `${BASE_PATH}/${href}`;
  return `${BASE_PATH}${href}`;
}
