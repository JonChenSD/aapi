/** Opacity fade for mute / gallery / credits when intro continues (ms). */
export const CHROME_ENTRANCE_FADE_MS = 600;

/** Syne size shared by fellowship, mute, gallery, and matching intro copy. */
export const CHROME_TOP_LINK_SIZE =
  "text-[clamp(0.7rem,1.85vw,0.85rem)]";

/** Mute / gallery / fellowship line — shared Syne sizing at the top of the scene. */
export const CHROME_TOP_LINK = `intro-copy syne-mono ${CHROME_TOP_LINK_SIZE} uppercase tracking-[0.055em] text-white/58`;

/** Section labels (Artists / Curated by / Supported by): same Syne + size as mute / view as gallery. */
export const CHROME_LABEL = `syne-mono intro-copy ${CHROME_TOP_LINK_SIZE} uppercase tracking-[0.055em] text-white/58`;

export const CHROME_LABEL_STATIC = `pointer-events-none ${CHROME_LABEL}`;

export const CHROME_NAME =
  "font-doto text-[clamp(0.95rem,2.35vw,1.15rem)] font-medium uppercase tracking-[0.055em]";

export const CHROME_TOUCH =
  "touch-none overscroll-none [-webkit-touch-callout:none]";
