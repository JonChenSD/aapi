"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { withBasePath } from "@/lib/base-path";
import { CHROME_TOP_LINK } from "@/lib/chrome-ui";

const LOGO_PATH = "/images/logos/3E34AE85-CFFF-4ACA-B4A4-F7F159D7F9F3.png";

/** Fellowship + logo: fade in + hold (center), move to top (large), then shrink at top. */
export const INTRO_BRAND_FADE_IN_MS = 1000;
export const INTRO_BRAND_HOLD_MS = 1000;
export const INTRO_BRAND_SHRINK_MS = 1000;

/** Move to top bar after center phase; keep in sync with `IntroOverlay` exit fade if desired. */
export const INTRO_BRAND_DOCK_TRANSITION_MS = 1100;

/** Time until glide to top (fade + hold only; shrink happens after dock). */
export const INTRO_BRAND_CENTER_PHASE_MS =
  INTRO_BRAND_FADE_IN_MS + INTRO_BRAND_HOLD_MS;

type EntrancePhase = "intro" | "fading" | "bridging" | "live";

type CenterSubPhase = "fadeIn" | "hold";

function raf2(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

/**
 * Prophesy mark + fellowship: fade in together, hold while centered, glide to the top bar
 * (logo still large), then shrink at the top when `introBeat` reaches 2.
 *
 * Motion uses a single measured `translateY` (px) so we never interpolate mixed `% top` + transform.
 * Fellowship ↔ logo spacing stays `gap-1.5` for the whole intro so it never snaps mid-sequence.
 */
export default function ProphesyBrand({
  entrancePhase,
  introBeat,
}: {
  entrancePhase: EntrancePhase;
  introBeat: number;
}) {
  const centered =
    entrancePhase === "intro" && introBeat === 0;

  const stackAboveIntro =
    entrancePhase === "intro" || entrancePhase === "fading";

  const [subPhase, setSubPhase] = useState<CenterSubPhase>("fadeIn");
  const [contentOpaque, setContentOpaque] = useState(false);
  const subTimersRef = useRef<number[]>([]);

  const columnRef = useRef<HTMLDivElement>(null);
  const dockProbeRef = useRef<HTMLSpanElement>(null);
  const dockAnimStartedRef = useRef(false);

  /** Top edge Y in viewport (px), `fixed; top:0; left:50%` + translateX(-50%). */
  const [translateYPx, setTranslateYPx] = useState(0);
  const [yMotionMs, setYMotionMs] = useState(0);

  const logoSrc = withBasePath(LOGO_PATH);

  const clearSubTimers = () => {
    for (const id of subTimersRef.current) {
      window.clearTimeout(id);
    }
    subTimersRef.current = [];
  };

  /* Center column: fade → hold (no shrink until docked). */
  useEffect(() => {
    if (!centered) {
      clearSubTimers();
      return;
    }
    clearSubTimers();
    setSubPhase("fadeIn");
    setContentOpaque(false);
    const tOpaque = window.setTimeout(() => setContentOpaque(true), 0);
    const tHold = window.setTimeout(() => {
      setSubPhase("hold");
    }, INTRO_BRAND_FADE_IN_MS);
    subTimersRef.current = [tOpaque, tHold];
    return clearSubTimers;
  }, [centered]);

  useEffect(() => {
    if (entrancePhase === "intro" && introBeat === 0) {
      dockAnimStartedRef.current = false;
    }
  }, [entrancePhase, introBeat]);

  const readDockTopPx = useCallback(() => {
    const probe = dockProbeRef.current;
    if (!probe) return 16;
    return probe.getBoundingClientRect().top;
  }, []);

  const readCenterTopPx = useCallback(() => {
    const col = columnRef.current;
    const h = col?.offsetHeight ?? 0;
    if (typeof window === "undefined") return 0;
    const vh = window.innerHeight;
    if (h <= 0) return Math.max(0, (vh - 1) / 2);
    return Math.max(0, (vh - h) / 2);
  }, []);

  const applyCenterY = useCallback(() => {
    setTranslateYPx(readCenterTopPx());
  }, [readCenterTopPx]);

  /* Keep vertically centered while intro beat 0 (content height changes during fade). */
  useLayoutEffect(() => {
    if (!(entrancePhase === "intro" && introBeat === 0)) return;
    applyCenterY();
  }, [entrancePhase, introBeat, applyCenterY, subPhase, contentOpaque]);

  useEffect(() => {
    if (!(entrancePhase === "intro" && introBeat === 0)) return;
    const col = columnRef.current;
    if (!col) return;
    const ro = new ResizeObserver(() => applyCenterY());
    ro.observe(col);
    const onResize = () => applyCenterY();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [entrancePhase, introBeat, applyCenterY]);

  /* One-shot dock glide: snap motion off → rAF → enable transition + dock Y. */
  useLayoutEffect(() => {
    if (entrancePhase !== "intro" || introBeat !== 1) return;
    if (dockAnimStartedRef.current) return;
    dockAnimStartedRef.current = true;

    const dockY = readDockTopPx();
    const centerY = readCenterTopPx();

    setYMotionMs(0);
    setTranslateYPx(centerY);
    raf2(() => {
      setYMotionMs(INTRO_BRAND_DOCK_TRANSITION_MS);
      setTranslateYPx(dockY);
    });
  }, [entrancePhase, introBeat, readDockTopPx, readCenterTopPx]);

  /* Past intro: pin to dock row without animating Y (avoids fighting ClientScene timers). */
  useLayoutEffect(() => {
    if (entrancePhase === "intro") return;
    setYMotionMs(0);
    setTranslateYPx(readDockTopPx());
  }, [entrancePhase, readDockTopPx]);

  const logoLarge =
    (centered && (subPhase === "fadeIn" || subPhase === "hold")) ||
    (entrancePhase === "intro" && introBeat === 1);

  return (
    <>
      <span
        ref={dockProbeRef}
        className="pointer-events-none fixed left-0 top-[max(1rem,env(safe-area-inset-top))] h-px w-px opacity-0"
        aria-hidden
      />
      <div
        className={`fixed left-1/2 flex w-[min(88vw,26rem)] max-w-[92vw] -translate-x-1/2 flex-col items-center pointer-events-none backface-hidden ${
          stackAboveIntro ? "z-[102]" : "z-55"
        }`}
        style={{
          top: 0,
          transform: `translateY(${translateYPx}px)`,
          transition:
            yMotionMs > 0
              ? `transform ${yMotionMs}ms cubic-bezier(0.33, 1, 0.68, 1)`
              : "none",
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName !== "transform") return;
          setYMotionMs(0);
        }}
      >
        <div
          ref={columnRef}
          className={`flex w-full flex-col items-center gap-1.5 transition-opacity ease-out ${
            centered && !contentOpaque ? "opacity-0" : "opacity-100"
          }`}
          style={{
            transitionDuration: `${INTRO_BRAND_FADE_IN_MS}ms`,
          }}
        >
          <p
            className={`m-0 w-full max-w-[min(22rem,90vw)] text-center leading-snug ${CHROME_TOP_LINK}`}
          >
            aapi emerging artist fellowship
          </p>
          <div
            className={`mx-auto shrink-0 ease-in-out ${
              logoLarge
                ? "w-full max-w-full"
                : "w-[min(11.5rem,44vw)] max-w-[52vw]"
            }`}
            style={{
              transitionProperty: "max-width, width",
              transitionDuration: `${INTRO_BRAND_SHRINK_MS}ms`,
              transitionTimingFunction: "ease-in-out",
            }}
          >
            <img
              src={logoSrc}
              alt="Prophesy"
              className={`h-auto w-full object-contain object-center transition-[max-height] ease-in-out ${
                logoLarge
                  ? "max-h-[min(38dvh,220px)]"
                  : "max-h-[min(3.5rem,12vw)]"
              }`}
              style={{
                transitionDuration: `${INTRO_BRAND_SHRINK_MS}ms`,
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}
