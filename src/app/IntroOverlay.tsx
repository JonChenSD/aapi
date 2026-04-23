"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { withBasePath } from "@/lib/base-path";
import {
  CHROME_TOP_LINK_SIZE,
  CHROME_TOUCH,
} from "@/lib/chrome-ui";
import { IntroWispFilter } from "./IntroWispFilter";

const RECAP_VIDEO_SRC = withBasePath(
  `/videos/${encodeURIComponent("Prophecy Recap.mp4")}`,
);

/** Rounded rect corners while feathered (matches play overlay rounding). */
const RECAP_CORNER_PX = 20;

/** Hold before intro body + recap video begin their reveal animations (s). */
const INTRO_COPY_REVEAL_DELAY_S = 0.5;

/**
 * Reserve vertical space for fixed `ProphesyBrand` (fellowship + gap + shrunk logo)
 * so recap + body center in the visible band between brand and CTA, not raw 100dvh.
 */
const INTRO_BRAND_STACK_RESERVE =
  "pointer-events-none w-full shrink-0 h-[max(6rem,calc(env(safe-area-inset-top)+4.75rem))] md:h-[max(6.875rem,calc(env(safe-area-inset-top)+5.375rem))]";

/** Above `ProphesyBrand` (`z-[102]`) while intro is up. */
const RECAP_MODAL_Z = 110;
const RECAP_MODAL_FADE_MS = 220;

const DEFAULT_LINES = [
  "In a world renewing itself, who decides what is worth saving, and who is allowed to imagine the future?",
  "What becomes possible when the scarcity of time bends, and the future actually informs the past instead of history dictating what comes next?",
  "If the practice of collective joy is a form of activism, what manifestations of hope can emerge within it?",
];

type IntroOverlayProps = {
  onContinue: () => void;
  /** When true, fades out then calls onFadeComplete (pointer-events disabled so the scene below receives input). */
  exiting?: boolean;
  onFadeComplete?: () => void;
  /** Full-screen overlay opacity fade when exiting (ms). */
  exitFadeMs?: number;
  lines?: string[];
  /** If omitted, uses "touch to continue" on coarse pointer / no-hover devices, else "click to continue". */
  cta?: string;
  /**
   * When false, only the black field is shown (fellowship + logo are handled above).
   * Set true after the brand has moved to the top so body copy + CTA can animate in.
   */
  showIntroCopy?: boolean;
};

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function contextualContinueLabel(): "touch to continue" | "click to continue" {
  if (typeof window === "undefined") return "click to continue";
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches
    ? "touch to continue"
    : "click to continue";
}

export default function IntroOverlay({
  onContinue,
  exiting = false,
  onFadeComplete,
  exitFadeMs = 1100,
  lines = DEFAULT_LINES,
  cta,
  showIntroCopy = true,
}: IntroOverlayProps) {
  const fadeLayerRef = useRef<HTMLDivElement>(null);
  const continueSurfaceRef = useRef<HTMLDivElement>(null);
  const recapVideoRef = useRef<HTMLVideoElement>(null);
  const recapModalVideoRef = useRef<HTMLVideoElement>(null);
  const recapModalCloseRef = useRef<HTMLButtonElement>(null);
  const recapModalPrevFocusRef = useRef<HTMLElement | null>(null);
  const [recapPlaying, setRecapPlaying] = useState(false);
  const [isDesktopMd, setIsDesktopMd] = useState(false);
  const [recapDesktopModalOpen, setRecapDesktopModalOpen] = useState(false);
  const [recapModalEntered, setRecapModalEntered] = useState(false);
  const [resolvedCta, setResolvedCta] = useState(() => {
    if (cta != null) return cta;
    if (typeof window !== "undefined") return contextualContinueLabel();
    return "click to continue";
  });

  useEffect(() => {
    if (cta != null) {
      setResolvedCta(cta);
      return;
    }
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const apply = () => setResolvedCta(contextualContinueLabel());
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [cta]);

  const closeRecapDesktopModal = useCallback(() => {
    const modalV = recapModalVideoRef.current;
    const inline = recapVideoRef.current;
    if (modalV && inline) {
      inline.currentTime = modalV.currentTime;
    }
    modalV?.pause();
    setRecapDesktopModalOpen(false);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      setIsDesktopMd(mq.matches);
      if (!mq.matches) closeRecapDesktopModal();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [closeRecapDesktopModal]);

  useEffect(() => {
    if (!recapDesktopModalOpen) {
      setRecapModalEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRecapModalEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [recapDesktopModalOpen]);

  useEffect(() => {
    if (!recapDesktopModalOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closeRecapDesktopModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recapDesktopModalOpen, closeRecapDesktopModal]);

  useEffect(() => {
    if (recapDesktopModalOpen) {
      recapModalPrevFocusRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => recapModalCloseRef.current?.focus());
    } else if (recapModalPrevFocusRef.current) {
      const el = recapModalPrevFocusRef.current;
      recapModalPrevFocusRef.current = null;
      queueMicrotask(() => el?.focus?.());
    }
  }, [recapDesktopModalOpen]);

  useEffect(() => {
    if (!recapDesktopModalOpen) return;
    const v = recapModalVideoRef.current;
    if (!v) return;
    v.muted = false;
    void v.play().catch(() => {});
  }, [recapDesktopModalOpen]);

  useEffect(() => {
    if (!recapDesktopModalOpen) return;
    const v = recapModalVideoRef.current;
    if (!v) return;
    const onPlay = () => setRecapPlaying(true);
    const onPause = () => setRecapPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    setRecapPlaying(!v.paused);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [recapDesktopModalOpen]);

  useEffect(() => {
    if (!exiting || !onFadeComplete) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onFadeComplete();
    };
    const el = fadeLayerRef.current;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "opacity") return;
      finish();
    };
    el?.addEventListener("transitionend", onEnd);
    const fallback = window.setTimeout(finish, exitFadeMs + 250);
    return () => {
      clearTimeout(fallback);
      el?.removeEventListener("transitionend", onEnd);
    };
  }, [exiting, onFadeComplete, exitFadeMs]);

  useEffect(() => {
    const v = recapVideoRef.current;
    const modalV = recapModalVideoRef.current;
    if (!v) return;

    if (!showIntroCopy || exiting) {
      v.pause();
      modalV?.pause();
      setRecapPlaying(false);
      setRecapDesktopModalOpen(false);
      return;
    }

    if (recapDesktopModalOpen) {
      v.pause();
      return;
    }

    const onPlay = () => setRecapPlaying(true);
    const onPause = () => setRecapPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    setRecapPlaying(!v.paused);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [showIntroCopy, exiting, recapDesktopModalOpen]);

  const recapSharp = recapPlaying && !recapDesktopModalOpen;

  const recapStageStyle = useMemo((): CSSProperties => {
    return {
      borderRadius: recapSharp ? 0 : RECAP_CORNER_PX,
      overflow: "hidden",
      transition: "border-radius 0.55s cubic-bezier(0.33, 1, 0.68, 1)",
    };
  }, [recapSharp]);

  const handleRecapStageClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleRecapPlayClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isDesktopMd) {
      setRecapDesktopModalOpen(true);
      return;
    }
    const v = recapVideoRef.current;
    if (!v) return;
    v.muted = false;
    void v.play().catch(() => {});
  };

  const handleContinueSurfaceKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (exiting) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onContinue();
    }
  };

  const bodyText = lines.join(" ");
  const bodyWords = splitWords(bodyText);
  const ctaWords = splitWords(resolvedCta);
  const staggerS = 0.065;
  const fadeDurationS = 0.75;
  const gapBeforeCtaS = 0.5;

  const mainWordCount = bodyWords.length;
  let globalWordIndex = 0;
  const lastCtaWordIndex = mainWordCount + ctaWords.length - 1;
  const ctaLanternDelayS =
    INTRO_COPY_REVEAL_DELAY_S +
    lastCtaWordIndex * staggerS +
    gapBeforeCtaS +
    fadeDurationS * 0.35;

  return (
    <div
      ref={fadeLayerRef}
      className={`intro-overlay fixed inset-0 z-100 flex min-h-dvh w-full touch-none flex-col bg-black transition-opacity ease-in-out ${exiting ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${exitFadeMs}ms` }}
    >
      {showIntroCopy ? (
        <>
        <div
          ref={continueSurfaceRef}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!exiting) onContinue();
          }}
          onKeyDown={handleContinueSurfaceKeyDown}
          className="intro-overlay flex min-h-dvh w-full flex-1 cursor-pointer flex-col items-center bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label={`${resolvedCta}. Start experience.`}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col items-center">
            <div className={INTRO_BRAND_STACK_RESERVE} aria-hidden />
            {/* Remaining viewport below brand reserve; recap + body centered here */}
            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 sm:px-10">
              <div
                className={`syne-mono intro-copy z-10 flex w-full max-w-[min(72rem,calc(100vw-2rem))] shrink-0 flex-col items-stretch ${CHROME_TOP_LINK_SIZE}`}
              >
                <div className="flex w-full flex-col items-center gap-7 sm:gap-9 md:flex-row md:items-center md:justify-center md:gap-10">
                  <div className="intro-copy-wisp relative isolate order-2 flex w-full min-w-0 max-w-[min(40rem,calc(100vw-3rem))] flex-col items-center">
                    <IntroWispFilter />
                    <p className="m-0 w-full hyphens-none text-center text-white/88">
                      {bodyWords.map((word, wi) => {
                        const i = globalWordIndex++;
                        return (
                          <span key={`${wi}-${word}`} className="inline">
                            <span
                              className="intro-overlay-word inline-block"
                              style={{
                                animationDelay: `${
                                  INTRO_COPY_REVEAL_DELAY_S + i * staggerS
                                }s`,
                                animationDuration: `${fadeDurationS}s`,
                              }}
                            >
                              {word}
                            </span>
                            {wi < bodyWords.length - 1 ? " " : null}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <div className="order-1 flex w-full shrink-0 justify-center md:w-auto md:max-w-none">
                    <div
                      className={`intro-recap-stage relative w-full cursor-default touch-auto bg-black/15 ${
                        recapSharp
                          ? "intro-recap-stage--sharp"
                          : "intro-recap-stage--feather"
                      }`}
                      style={recapStageStyle}
                      onClick={handleRecapStageClick}
                    >
                      <video
                        ref={recapVideoRef}
                        className="intro-recap-video"
                        aria-label="Prophecy recap video"
                        src={RECAP_VIDEO_SRC}
                        playsInline
                        preload="metadata"
                        controls={recapPlaying && !recapDesktopModalOpen}
                        controlsList="nodownload"
                      />
                      {!recapPlaying || recapDesktopModalOpen ? (
                        <button
                          type="button"
                          className={`intro-recap-play-veil absolute inset-0 z-10 flex cursor-pointer items-center justify-center border-0 bg-black/40 backdrop-blur-[3px] transition-colors hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/45 ${CHROME_TOUCH}`}
                          style={{ borderRadius: RECAP_CORNER_PX }}
                          aria-label="Play recap video with sound"
                          onClick={handleRecapPlayClick}
                        >
                          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/65 bg-white/12 text-white shadow-[0_6px_28px_rgba(0,0,0,0.45)] sm:h-16 sm:w-16">
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="ms-0.5"
                              aria-hidden
                            >
                              <path d="M8 5v14l11-7L8 5z" />
                            </svg>
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`syne-mono intro-copy z-10 w-full max-w-[min(72rem,calc(100vw-2rem))] shrink-0 px-6 sm:px-10 ${CHROME_TOP_LINK_SIZE}`}
            >
              <p className="m-0 w-full pt-6 text-center text-white/50 sm:pt-8 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] md:pb-[max(2.75rem,calc(env(safe-area-inset-bottom)+2rem))]">
                <span
                  className="intro-cta-lantern-host text-white/55"
                  style={
                    {
                      "--intro-cta-hum-delay": `${ctaLanternDelayS}s`,
                    } as CSSProperties
                  }
                >
                  {ctaWords.map((word, i) => (
                    <span key={`cta-${i}-${word}`} className="inline">
                      <span
                        className="intro-overlay-word inline-block"
                        style={{
                          animationDelay: `${
                            INTRO_COPY_REVEAL_DELAY_S +
                            (mainWordCount + i) * staggerS +
                            gapBeforeCtaS
                          }s`,
                          animationDuration: `${fadeDurationS}s`,
                        }}
                      >
                        {word}
                      </span>
                      {i < ctaWords.length - 1 ? " " : null}
                    </span>
                  ))}
                </span>
              </p>
            </div>
          </div>
        </div>
        {recapDesktopModalOpen && isDesktopMd ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Prophecy recap video"
            className="pointer-events-auto fixed inset-0"
            style={{
              zIndex: RECAP_MODAL_Z,
              opacity: recapModalEntered ? 1 : 0,
              transition: `opacity ${RECAP_MODAL_FADE_MS}ms ease-out`,
            }}
          >
            <button
              type="button"
              aria-label="Close recap video"
              onClick={closeRecapDesktopModal}
              className="absolute inset-0 z-0 cursor-default border-0 bg-black/55 p-0"
            />
            <div
              role="presentation"
              className="fixed inset-0 z-10 flex cursor-default items-center justify-center px-[4vw] py-[6vh]"
              onClick={closeRecapDesktopModal}
            >
              <div
                className="pointer-events-auto w-[min(92vw,80rem)] max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <video
                  ref={recapModalVideoRef}
                  className="block max-h-[min(85dvh,calc(100dvh-7rem))] w-full bg-black object-contain"
                  aria-label="Prophecy recap video"
                  src={RECAP_VIDEO_SRC}
                  playsInline
                  preload="metadata"
                  controls
                  controlsList="nodownload"
                />
              </div>
            </div>
            <div
              className="modal-close-slot pointer-events-none flex items-center justify-center"
              style={{ zIndex: RECAP_MODAL_Z + 2 }}
            >
              <button
                ref={recapModalCloseRef}
                type="button"
                onClick={closeRecapDesktopModal}
                className={`close-btn-circle pointer-events-auto flex items-center justify-center rounded-full border border-white/70 text-white/90 transition-[width,height] duration-200 ease-out ${CHROME_TOUCH}`}
                style={{
                  borderWidth: 1,
                  width: 24,
                  height: 24,
                }}
                aria-label="Close recap video"
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
        ) : null}
        </>
      ) : (
        <div className="flex-1" aria-hidden />
      )}
    </div>
  );
}
