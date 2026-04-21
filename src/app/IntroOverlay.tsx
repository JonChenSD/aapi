"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IntroWispFilter } from "./IntroWispFilter";

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
}: IntroOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!exiting || !onFadeComplete) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onFadeComplete();
    };
    const el = buttonRef.current;
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
    lastCtaWordIndex * staggerS + gapBeforeCtaS + fadeDurationS * 0.35;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        if (!exiting) onContinue();
      }}
      className={`intro-overlay fixed inset-0 z-100 flex min-h-dvh w-full touch-none flex-col items-center border-0 bg-black outline-none transition-opacity ease-in-out focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${exiting ? "pointer-events-none opacity-0" : "cursor-pointer opacity-100"}`}
      style={{ transitionDuration: `${exitFadeMs}ms` }}
      aria-label={`${resolvedCta}. Start experience.`}
    >
      {/* Flex spacers tune vertical position of intro block */}
      <div className="min-h-0 w-full shrink-0 basis-0 flex-[1.08]" aria-hidden />
      <div className="intro-copy intro-copy-wisp relative z-10 isolate syne-mono flex w-full max-w-[min(40rem,calc(100vw-3rem))] shrink-0 flex-col items-center gap-7 px-6 text-[clamp(0.92rem,2.4vw,1.0625rem)] text-white/88 sm:gap-9 sm:px-10">
        <IntroWispFilter />
        <p className="m-0 w-full hyphens-none text-center">
          {bodyWords.map((word, wi) => {
            const i = globalWordIndex++;
            return (
              <span key={`${wi}-${word}`} className="inline">
                <span
                  className="intro-overlay-word inline-block"
                  style={{
                    animationDelay: `${i * staggerS}s`,
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
        <p className="m-0 w-full text-center text-white/50">
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
                    animationDelay: `${(mainWordCount + i) * staggerS + gapBeforeCtaS}s`,
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
      <div className="min-h-0 w-full shrink-0 basis-0 flex-[0.86] pb-[max(1.5rem,env(safe-area-inset-bottom))]" aria-hidden />
    </button>
  );
}
