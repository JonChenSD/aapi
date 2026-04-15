"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARTISTS, getArtistById, type Artist } from "./artists";

function ArtistProfileText({ artist }: { artist: Artist }) {
  return (
    <div
      id="artist-profile-description"
      className="syne-mono max-w-prose text-left text-[13px] leading-relaxed text-white/78 sm:text-sm"
    >
      <h2 className="font-doto mb-1 text-xl font-semibold uppercase tracking-widest text-white sm:text-2xl">
        {artist.name}
      </h2>
      {artist.tagline ? (
        <p className="mb-6 text-[11px] uppercase tracking-wide text-white/45 sm:text-xs">
          {artist.tagline}
        </p>
      ) : (
        <div className="mb-6" />
      )}
      {artist.sections.map((sec, i) => (
        <section key={i} className={i > 0 ? "mt-8" : ""}>
          {sec.title ? (
            <h3 className="font-doto mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 sm:text-sm">
              {sec.title}
            </h3>
          ) : null}
          {sec.paragraphs.map((p, j) => (
            <p key={j} className={j > 0 ? "mt-4" : ""}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function ArtistsBlock({
  headingId,
  highlightId,
  interactive,
  onPick,
}: {
  /** Optional id for the “Artists” label (e.g. dialog aria-labelledby). */
  headingId?: string;
  /** When set, that row reads as selected (modal). */
  highlightId: string | null;
  interactive: boolean;
  onPick?: (artist: Artist) => void;
}) {
  return (
    <div className="font-doto flex flex-col items-start gap-2 text-left uppercase">
      <span
        id={headingId}
        className={
          headingId
            ? "text-[11px] tracking-[0.2em] text-white/40"
            : "pointer-events-none text-[11px] tracking-[0.2em] text-white/40"
        }
      >
        Artists
      </span>
      <ul className="m-0 flex w-full list-none flex-col items-start gap-1.5 p-0">
        {ARTISTS.map((a) => {
          const active = highlightId === a.id;
          const tone = active ? "text-white" : "text-white/55";
          const base =
            "w-full border-0 bg-transparent py-0.5 text-left text-[15px] font-medium uppercase tracking-[0.12em] transition-colors";
          return (
            <li key={a.id} className="w-full">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onPick?.(a)}
                  className={`pointer-events-auto cursor-pointer ${base} ${tone} hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50`}
                >
                  {a.name}
                </button>
              ) : (
                <span
                  className={`block py-0.5 text-[15px] font-medium uppercase tracking-[0.12em] ${tone}`}
                >
                  {a.name}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ArtistCredits() {
  const [open, setOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHighlightId(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const openWith = (artist: Artist) => {
    setHighlightId(artist.id);
    setOpen(true);
  };

  const selectedArtist = useMemo(
    () => (highlightId ? getArtistById(highlightId) : undefined),
    [highlightId]
  );
  const profileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = profileScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [highlightId]);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-y-0 left-0 z-35 flex max-w-[min(100vw-2rem,28rem)] items-center pl-8 pr-6 sm:pl-12"
        aria-label="Artists"
      >
        <ArtistsBlock
          highlightId={null}
          interactive
          onPick={openWith}
        />
      </div>

      {open && highlightId && selectedArtist && (
        <div
          className="fixed inset-0 z-100"
          role="dialog"
          aria-modal="true"
          aria-labelledby="artists-credits-heading"
          aria-describedby="artist-profile-description"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm"
            aria-label="Close"
            onClick={close}
          />
          <div className="pointer-events-none fixed inset-0 z-101 flex items-center justify-center px-6 pb-12 pt-16 sm:px-10 sm:pb-14 sm:pt-20">
            <div className="pointer-events-auto flex h-[min(88dvh,920px)] max-h-[min(88dvh,920px)] w-full max-w-6xl min-h-0 flex-col overflow-hidden sm:flex-row sm:items-stretch">
              <div className="flex w-full shrink-0 items-start justify-start border-b border-white/10 pb-4 sm:w-[11.5rem] sm:max-w-[38vw] sm:items-center sm:self-stretch sm:border-b-0 sm:pb-0 md:w-48">
                <ArtistsBlock
                  headingId="artists-credits-heading"
                  highlightId={highlightId}
                  interactive
                  onPick={(a) => setHighlightId(a.id)}
                />
              </div>
              <div
                className="hidden w-px shrink-0 self-stretch bg-white/10 sm:block"
                aria-hidden
              />
              <div
                ref={profileScrollRef}
                className="artist-profile-scroll syne-mono min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/10 py-4 pr-1 sm:border-t-0 sm:py-2 sm:pl-8 sm:pr-2 md:pl-10 lg:pl-12"
              >
                <ArtistProfileText artist={selectedArtist} />
              </div>
            </div>
          </div>
          <div className="pointer-events-none fixed right-6 top-6 z-102 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="close-btn-circle pointer-events-auto flex items-center justify-center rounded-full border border-white/70 text-white/90 transition-[width,height] duration-200 ease-out"
              style={{
                borderWidth: 1,
                width: 24,
                height: 24,
              }}
              aria-label="Close"
            >
              <span className="close-fill" aria-hidden />
              <svg
                className="close-icon relative z-10"
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.25}
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
