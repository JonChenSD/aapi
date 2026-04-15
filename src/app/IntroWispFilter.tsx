"use client";

import { useEffect, useRef } from "react";

/** Max slide of the noise field from pointer (before smoothing). */
const CURSOR_SHIFT = 72;
/** Exponential smoothing rate (1/s): lower = heavier, stickier water. */
const WATER_LAMBDA = 2.1;

/**
 * Pond-like displacement: slow wide turbulence + cursor pulls the noise
 * through feOffset with inertial easing (continuous rAF).
 */
export function IntroWispFilter() {
  const offsetRef = useRef<SVGFEOffsetElement | null>(null);

  useEffect(() => {
    const offset = offsetRef.current;
    if (!offset) return;

    let cx = window.innerWidth * 0.5;
    let cy = window.innerHeight * 0.5;

    const applySnap = () => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const dx = (cx / w - 0.5) * 2 * CURSOR_SHIFT;
      const dy = (cy / h - 0.5) * 2 * CURSOR_SHIFT;
      offset.setAttribute("dx", dx.toFixed(2));
      offset.setAttribute("dy", dy.toFixed(2));
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const onMove = (clientX: number, clientY: number) => {
      cx = clientX;
      cy = clientY;
    };

    const onMouse = (e: MouseEvent) => {
      onMove(e.clientX, e.clientY);
      if (reducedMotion) applySnap();
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
        if (reducedMotion) applySnap();
      }
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });

    if (reducedMotion) {
      applySnap();
      return () => {
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("touchmove", onTouch);
        window.removeEventListener("touchstart", onTouch);
      };
    }

    let smoothDx = 0;
    let smoothDy = 0;
    let last = performance.now();
    let rafId = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running || !offsetRef.current) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const targetDx = (cx / w - 0.5) * 2 * CURSOR_SHIFT;
      const targetDy = (cy / h - 0.5) * 2 * CURSOR_SHIFT;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const k = 1 - Math.exp(-WATER_LAMBDA * dt);
      smoothDx += (targetDx - smoothDx) * k;
      smoothDy += (targetDy - smoothDy) * k;
      offsetRef.current.setAttribute("dx", smoothDx.toFixed(2));
      offsetRef.current.setAttribute("dy", smoothDy.toFixed(2));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          id="aapi-intro-wisp"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0022 0.0055"
            numOctaves="2"
            seed="7"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              values="0.0018 0.0045;0.0028 0.0072;0.0021 0.0058;0.0018 0.0045"
              keyTimes="0;0.38;0.75;1"
              dur="34s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feOffset
            ref={offsetRef}
            in="noise"
            dx="0"
            dy="0"
            result="noiseShifted"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noiseShifted"
            scale="17"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rippled"
          />
          <feGaussianBlur in="rippled" stdDeviation="0.22" />
        </filter>
      </defs>
    </svg>
  );
}
