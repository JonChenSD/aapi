"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ARTISTS,
  CURATOR,
  getCreditProfile,
  type Artist,
} from "./artists";
import ArtistReelBlock from "./ArtistReelBlock";
import {
  CHROME_LABEL,
  CHROME_LABEL_STATIC,
  CHROME_NAME,
  CHROME_TOUCH,
} from "@/lib/chrome-ui";
import { withBasePath } from "@/lib/base-path";
import { VIEWPORT_EDGE_LEFT } from "@/lib/viewport-insets";

const ARTIST_MODAL_FADE_MS = 220;

const PREBYS_URL = "https://www.prebysfdn.org/";
const VIET_VOICES_URL = "https://www.vietvoices.org/";

const LOGO_PREBYS = withBasePath("/images/logos/PrebysLogo.png");
const LOGO_VIET_VOICES = withBasePath("/images/logos/vietvoices.png");

function ArtistProfileText({ artist }: { artist: Artist }) {
  const hasReel = Boolean(artist.reelVideoSrc);

  return (
    <div
      id="artist-profile-description"
      className="syne-mono flex w-full min-w-0 flex-col gap-1.5 text-left text-[13px] leading-relaxed text-white/78 sm:gap-2 sm:text-sm"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-h-6 w-full min-w-0 items-center">
          <h2 className="font-doto mx-0 mb-0 mt-[26px] text-xl font-semibold uppercase leading-none tracking-widest text-white sm:text-2xl">
            {artist.name}
          </h2>
        </div>
        {artist.tagline ? (
          <p className="m-0 whitespace-pre-line text-[11px] leading-snug uppercase tracking-wide text-white/45 sm:text-xs">
            {artist.tagline}
          </p>
        ) : null}
      </div>
      {hasReel ? (
        <div className="my-4 w-full sm:my-5">
          <ArtistReelBlock
            reelVideoSrc={artist.reelVideoSrc}
            reelVideoPoster={artist.reelVideoPoster}
            reelVideoBox={artist.reelVideoBox ?? "portrait"}
          />
        </div>
      ) : null}
      {artist.sections.map((sec, i) => (
        <section
          key={i}
          className="m-0 flex min-w-0 flex-col gap-2 sm:gap-2.5"
        >
          {sec.title ? (
            <h3 className="font-doto m-0 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 sm:text-sm">
              {sec.title}
            </h3>
          ) : null}
          {sec.paragraphs.map((p, j) => (
            <p key={j} className="m-0 min-w-0">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

const nameButtonClass = `${CHROME_NAME} w-full border-0 bg-transparent pt-0 pb-1 text-left transition-colors [text-shadow:0_1px_4px_rgba(0,0,0,0.85),0_0_14px_rgba(0,0,0,0.45)]`;

function SceneSupporters() {
  const linkLogoClass = `inline-block rounded-sm opacity-88 transition-opacity duration-200 ease-out hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 ${CHROME_TOUCH}`;

  return (
    <div
      className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[60] box-border max-w-[min(100vw-2rem,18rem)] md:max-w-[18rem]"
      aria-labelledby="supported-by-heading"
    >
      <div
        className={`pointer-events-auto flex flex-col items-end gap-3 text-right ${CHROME_TOUCH}`}
      >
        <span id="supported-by-heading" className={CHROME_LABEL}>
          Supported by
        </span>
        <ul className="m-0 flex list-none flex-col items-end gap-3 p-0">
          <li>
            <a
              href={VIET_VOICES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkLogoClass}
            >
              <img
                src={LOGO_VIET_VOICES}
                alt="Viet Voices"
                width={280}
                height={112}
                className="h-[clamp(2.35rem,7vw,3.35rem)] w-auto max-w-[min(15rem,46vw)] object-contain object-right sm:h-[clamp(2.6rem,6.5vw,3.5rem)] sm:max-w-[min(17rem,40vw)]"
              />
            </a>
          </li>
          <li>
            <a
              href={PREBYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkLogoClass}
            >
              <img
                src={LOGO_PREBYS}
                alt="Prebys Foundation"
                width={240}
                height={64}
                className="h-[clamp(1.95rem,5.5vw,2.75rem)] w-auto max-w-[min(13.5rem,42vw)] object-contain object-right sm:h-[clamp(2.15rem,5vw,2.95rem)] sm:max-w-[min(15rem,38vw)]"
              />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

function SceneCreditsNav({
  artistsHeadingId,
  highlightId,
  interactive,
  compactMobile,
  onPickArtist,
  onPickCurator,
}: {
  artistsHeadingId?: string;
  highlightId: string | null;
  interactive: boolean;
  /** Tighter list in the fixed mobile modal dock for legibility. */
  compactMobile?: boolean;
  onPickArtist?: (artist: Artist) => void;
  onPickCurator?: () => void;
}) {
  const modalTight =
    "max-md:gap-y-2 max-md:[&_button]:py-1 max-md:[&_span.block]:py-0.5";

  return (
    <div
      className={`m-0 flex w-full flex-col items-start gap-y-2.5 p-0 text-left uppercase ${compactMobile ? modalTight : ""}`}
    >
      <div className="flex w-full flex-col gap-1">
        <span
          id={artistsHeadingId}
          className={
            artistsHeadingId ? CHROME_LABEL : CHROME_LABEL_STATIC
          }
        >
          Artists
        </span>
        <ul className="m-0 flex w-full list-none flex-col items-start gap-0 p-0">
          {ARTISTS.map((a) => {
            const active = highlightId === a.id;
            const tone = active ? "text-white" : "text-white/72";
            return (
              <li key={a.id} className="w-full">
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onPickArtist?.(a)}
                    className={`pointer-events-auto cursor-pointer ${CHROME_TOUCH} ${nameButtonClass} ${tone} hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50`}
                  >
                    {a.name}
                  </button>
                ) : (
                  <span
                    className={`${CHROME_NAME} block py-0.5 ${tone}`}
                  >
                    {a.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex w-full flex-col gap-1">
        <span
          id="curated-by-heading"
          className={`mb-0 pt-0 pb-0 ${
            artistsHeadingId ? CHROME_LABEL : CHROME_LABEL_STATIC
          }`}
        >
          Curated by
        </span>
        {interactive ? (
          <button
            type="button"
            onClick={() => onPickCurator?.()}
            className={`pointer-events-auto cursor-pointer ${CHROME_TOUCH} ${nameButtonClass} ${
              highlightId === CURATOR.id
                ? "text-white"
                : "text-white/72 hover:text-white"
            } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50`}
          >
            {CURATOR.name}
          </button>
        ) : (
          <span
            className={`${CHROME_NAME} block py-0.5 ${
              highlightId === CURATOR.id ? "text-white" : "text-white/72"
            }`}
          >
            {CURATOR.name}
          </span>
        )}
      </div>
    </div>
  );
}

/** Shared chrome for credits in the scene and in the modal sidebar. */
function CreditsChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 4.25L6 7.75l3.5-3.5" />
    </svg>
  );
}

function SceneCreditsStack({
  placement,
  artistsHeadingId,
  highlightId,
  interactive,
  onPickArtist,
  onPickCurator,
}: {
  placement: "scene" | "modal";
  artistsHeadingId?: string;
  highlightId: string | null;
  interactive: boolean;
  onPickArtist?: (artist: Artist) => void;
  onPickCurator?: () => void;
}) {
  const isModal = placement === "modal";
  const [mobileDockOpen, setMobileDockOpen] = useState(false);

  useEffect(() => {
    if (!isModal) return;
    setMobileDockOpen(false);
  }, [isModal, highlightId]);

  const nav = (
    <SceneCreditsNav
      artistsHeadingId={artistsHeadingId}
      highlightId={highlightId}
      interactive={interactive}
      compactMobile={isModal}
      onPickArtist={onPickArtist}
      onPickCurator={onPickCurator}
    />
  );

  const selectedLabel =
    highlightId != null
      ? (getCreditProfile(highlightId)?.name ?? "Profile")
      : "Profile";

  const chrome = "max-w-[min(100vw-1rem,26rem)] pr-2";

  /** Opaque dock on small screens so profile copy never shows through the fixed credits. */
  const modalMobileDock =
    "max-md:max-w-none max-md:bg-black max-md:px-2 max-md:pt-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] max-md:rounded-t-2xl max-md:shadow-[0_-10px_40px_rgba(0,0,0,0.92)]";

  /** Same viewport-anchored box for scene overlay and modal so credits don’t jump. */
  const positionClass =
    "fixed box-border max-md:top-auto max-md:bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] md:bottom-auto md:top-[calc(50%+0.9rem)] md:-translate-y-1/2";

  const mobileCollapsible =
    isModal && (
      <div className="font-doto md:hidden">
        <button
          type="button"
          id="artist-credits-summary"
          className={`pointer-events-auto flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent py-1.5 pr-1 text-left uppercase outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40 ${CHROME_TOUCH}`}
          aria-expanded={mobileDockOpen}
          aria-controls="artist-credits-panel"
          aria-label={
            mobileDockOpen
              ? "Collapse artists and curator list"
              : "Expand artists and curator list"
          }
          onClick={() => setMobileDockOpen((o) => !o)}
        >
          <span className="font-doto min-w-0 flex-1 truncate text-[clamp(0.95rem,2.35vw,1.15rem)] font-medium tracking-widest text-white">
            {selectedLabel}
          </span>
          <CreditsChevron open={mobileDockOpen} />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
            mobileDockOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div
            id="artist-credits-panel"
            className="min-h-0 overflow-hidden"
            inert={!mobileDockOpen}
          >
            <div className="pt-1">{nav}</div>
          </div>
        </div>
      </div>
    );

  return (
    <div
      aria-label={isModal ? undefined : "Artists and curator"}
      className={`${chrome} ${positionClass} ${
        isModal
          ? `pointer-events-auto z-100001 ${modalMobileDock}`
          : "pointer-events-none z-[60]"
      }`}
      style={{ left: VIEWPORT_EDGE_LEFT }}
    >
      {isModal ? (
        <>
          {mobileCollapsible}
          <div className="hidden md:block">{nav}</div>
        </>
      ) : (
        nav
      )}
    </div>
  );
}

export default function ArtistCredits() {
  const [open, setOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [modalEntered, setModalEntered] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(false);

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

  const openWithArtist = (artist: Artist) => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    setHighlightId(artist.id);
    setOpen(true);
  };

  const openWithCurator = () => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    setHighlightId(CURATOR.id);
    setOpen(true);
  };

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
    if (!open && prevOpenRef.current) {
      const el = prevFocusRef.current;
      prevFocusRef.current = null;
      queueMicrotask(() => el?.focus?.());
    }
    prevOpenRef.current = open;
  }, [open]);

  const selectedProfile = useMemo(
    () => (highlightId ? getCreditProfile(highlightId) : undefined),
    [highlightId]
  );
  const profileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = profileScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [highlightId]);

  const modalActive = open && highlightId && Boolean(selectedProfile);

  useEffect(() => {
    if (!modalActive) {
      setModalEntered(false);
      return;
    }
    setModalEntered(false);
    const id = window.requestAnimationFrame(() => {
      setModalEntered(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [modalActive, highlightId]);

  return (
    <>
      <SceneCreditsStack
        placement="scene"
        highlightId={null}
        interactive
        onPickArtist={openWithArtist}
        onPickCurator={openWithCurator}
      />
      <SceneSupporters />

      {open && highlightId && selectedProfile && (
        <div
          className="fixed inset-0 z-100000 ease-out"
          role="dialog"
          aria-modal="true"
          aria-labelledby="artists-credits-heading"
          aria-describedby="artist-profile-description"
          style={
            {
              opacity: modalEntered ? 1 : 0,
              transition: `opacity ${ARTIST_MODAL_FADE_MS}ms ease-out`,
            } as CSSProperties
          }
        >
          <button
            type="button"
            className={`absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm ${CHROME_TOUCH}`}
            aria-label="Close"
            onClick={close}
          />
          <div className="pointer-events-none fixed inset-0 z-100001 box-border flex h-full min-h-0 flex-col py-0 ps-[max(0.75rem,env(safe-area-inset-left,0px))] pe-[max(0.75rem,env(safe-area-inset-right,0px))] ">
            <div className="pointer-events-auto mx-auto flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden md:flex-row-reverse md:items-stretch">
              <div
                ref={profileScrollRef}
                className="artist-profile-scroll syne-mono box-border min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-contain border-b border-white/10 px-3 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] max-md:pb-[max(14rem,min(46vh,26rem),env(safe-area-inset-bottom,0px))] md:border-b-0 md:border-t-0 md:px-4 md:pb-[env(safe-area-inset-bottom,0px)]"
              >
                <div className="artist-profile-inner box-border flex w-full min-w-0 max-w-full flex-col items-stretch text-left">
                  <ArtistProfileText artist={selectedProfile} />
                </div>
              </div>
              <div
                className="hidden w-px shrink-0 self-stretch bg-white/10 md:block"
                aria-hidden
              />
              <div className="min-h-0 max-md:contents w-full shrink-0 md:w-48">
                <SceneCreditsStack
                  placement="modal"
                  artistsHeadingId="artists-credits-heading"
                  highlightId={highlightId}
                  interactive
                  onPickArtist={(a) => setHighlightId(a.id)}
                  onPickCurator={() => setHighlightId(CURATOR.id)}
                />
              </div>
            </div>
          </div>
          <div className="modal-close-slot pointer-events-none z-100002 flex items-center justify-center">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className={`close-btn-circle pointer-events-auto flex items-center justify-center rounded-full border border-white/70 text-white/90 transition-[width,height] duration-200 ease-out ${CHROME_TOUCH}`}
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
