"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import ArtistCredits from "./ArtistCredits";
import SquiggleCursor from "./SquiggleCursor";

const SLOT_COUNT = 10;
const SLOT_SIZE_SCALE = 1.68;
const MIN_CENTER_DISTANCE = 18; // % viewport – keeps slots from overlapping too much
const BIG_SIZE_CHANCE = 1 / 8; // 1 in 8 spawns are 200% larger
const BIG_SIZE_SCALE = 2;

// Large world canvas; viewport stays fixed at INITIAL_PAN (no edge scroll — parallax only).
const WORLD_SIZE = 400; // world size in viewport-% units (e.g. 400 = 4 viewports)
const WORLD_MARGIN = 60; // extra margin so edge slots can be centered when focused
const DISPLAY_WORLD_SIZE = WORLD_SIZE + 2 * WORLD_MARGIN; // total world size in % space
/** Fixed view: center of world aligned to the 100×100 viewport window. */
const INITIAL_PAN = {
  x: DISPLAY_WORLD_SIZE / 2 - 50,
  y: DISPLAY_WORLD_SIZE / 2 - 50,
} as const;
/** Spawn / respawn random positions within this % of the visible viewport (world coords). */
const SPAWN_IN_VIEW_PERCENT = 88;
const WORLD_SLOT_COUNT = 8; // on-screen stack count; positions still spread across the world

function dist(cx1: number, cy1: number, cx2: number, cy2: number) {
  return Math.hypot(cx2 - cx1, cy2 - cy1);
}

/** World-coordinate rectangle (slot centers) that lies in the current viewport for a given pan. */
function worldSpawnBounds(
  panX: number,
  panY: number,
  viewSizePercent: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const inset = (100 - viewSizePercent) / 2;
  return {
    minX: panX + inset,
    maxX: panX + inset + viewSizePercent,
    minY: panY + inset,
    maxY: panY + inset + viewSizePercent,
  };
}

function generatePositionsWithMinDistance(): { cx: number; cy: number }[] {
  const positions: { cx: number; cy: number }[] = [];
  const maxAttempts = 80;
  for (let i = 0; i < SLOT_COUNT; i++) {
    let cx = 0;
    let cy = 0;
    let ok = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      cx = Math.random() * 100;
      cy = Math.random() * 100;
      ok = positions.every(
        (p) => dist(cx, cy, p.cx, p.cy) >= MIN_CENTER_DISTANCE
      );
      if (ok) break;
    }
    positions.push({ cx, cy });
  }
  return positions;
}

/** World positions: on the initial screen only (same band as respawns), with minimum spacing. */
function generateWorldPositions(): { cx: number; cy: number }[] {
  const positions: { cx: number; cy: number }[] = [];
  const { minX, maxX, minY, maxY } = worldSpawnBounds(
    INITIAL_PAN.x,
    INITIAL_PAN.y,
    SPAWN_IN_VIEW_PERCENT
  );
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const maxAttempts = 120;
  for (let i = 0; i < WORLD_SLOT_COUNT; i++) {
    let cx = minX + Math.random() * rangeX;
    let cy = minY + Math.random() * rangeY;
    let ok = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      cx = minX + Math.random() * rangeX;
      cy = minY + Math.random() * rangeY;
      ok = positions.every(
        (p) => dist(cx, cy, p.cx, p.cy) >= MIN_CENTER_DISTANCE
      );
      if (ok) break;
    }
    positions.push({ cx, cy });
  }
  return positions;
}

function getBaseSize(i: number): { width: number; height: number } {
  let width = (38 + (i * 11) % 20) * SLOT_SIZE_SCALE;
  let height = (36 + (i * 7) % 18) * SLOT_SIZE_SCALE;
  width = Math.min(110, width);
  height = Math.min(110, height);
  return { width, height };
}

/** New position for one slot when it respawns, keeping min distance from others (local 0-100) */
function getNewPositionForSlot(
  slots: Slot[],
  slotIndex: number,
  widthOverride?: number,
  heightOverride?: number
): { left: number; top: number } {
  const slot = slots[slotIndex];
  const width = widthOverride ?? slot.width;
  const height = heightOverride ?? slot.height;
  const others = slots.map((s, j) =>
    j === slotIndex ? null : { cx: s.left + s.width / 2, cy: s.top + s.height / 2 }
  ).filter(Boolean) as { cx: number; cy: number }[];
  const maxAttempts = 80;
  let cx = slot.left + slot.width / 2;
  let cy = slot.top + slot.height / 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tryCx = Math.random() * 100;
    const tryCy = Math.random() * 100;
    if (others.every((p) => dist(tryCx, tryCy, p.cx, p.cy) >= MIN_CENTER_DISTANCE)) {
      cx = tryCx;
      cy = tryCy;
      break;
    }
  }
  return { left: cx - width / 2, top: cy - height / 2 };
}

/** New world position for a slot (respawn when advancing). viewSize = % of viewport window around pan to pick from. */
function getNewPositionInView(
  slots: Slot[],
  slotIndex: number,
  panX: number,
  panY: number,
  widthOverride?: number,
  heightOverride?: number,
  viewSizePercent?: number
): { left: number; top: number } {
  const slot = slots[slotIndex];
  const width = widthOverride ?? slot.width;
  const height = heightOverride ?? slot.height;
  const viewSize = viewSizePercent ?? SPAWN_IN_VIEW_PERCENT;
  const viewMin = (100 - viewSize) / 2;
  const viewW = viewSize;
  const viewH = viewSize;
  const others = slots
    .filter((s, j) => j !== slotIndex)
    .map((s) => ({ cx: s.left + s.width / 2, cy: s.top + s.height / 2 }));
  const maxAttempts = 80;
  let cx = panX + viewMin + Math.random() * viewW;
  let cy = panY + viewMin + Math.random() * viewH;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tryCx = panX + viewMin + Math.random() * viewW;
    const tryCy = panY + viewMin + Math.random() * viewH;
    if (others.every((p) => dist(tryCx, tryCy, p.cx, p.cy) >= MIN_CENTER_DISTANCE)) {
      cx = tryCx;
      cy = tryCy;
      break;
    }
  }
  // Keep center within margin so this slot can always be centered when focused
  const minC = 50;
  const maxC = DISPLAY_WORLD_SIZE - 50;
  cx = Math.max(minC, Math.min(maxC, cx));
  cy = Math.max(minC, Math.min(maxC, cy));
  return { left: cx - width / 2, top: cy - height / 2 };
}

type Slot = {
  left: number;
  top: number;
  width: number;
  height: number;
  delay: number;
  durationScale: number;
  zIndex: number;
};

function buildSlots(positions: { cx: number; cy: number }[]): Slot[] {
  return positions.map(({ cx, cy }, i) => {
    const base = getBaseSize(i);
    const isBig = Math.random() < BIG_SIZE_CHANCE;
    const scale = isBig ? BIG_SIZE_SCALE : 1;
    let width = Math.min(110, base.width * scale);
    let height = Math.min(110, base.height * scale);
    const left = cx - width / 2;
    const top = cy - height / 2;
    const delay = (i * 2.1) % 11;
    const durationScale = 0.9 + (i * 0.04);
    const zIndex = 1 + (i * 3) % 7;
    return { left, top, width, height, delay, durationScale, zIndex };
  });
}

const DEFAULT_DEBUG = {
  duration: 12,
  blur: 40,
  maskFadeStart: 18,
  maskFadeEnd: 65,
  squiggleStyle: "rainbow" as "line" | "rainbow",
};

// Stagger initial indices so each slot gets a different image when possible
function getInitialIndices(imagesLength: number, count: number): number[] {
  if (!imagesLength) return Array(count).fill(0);
  return Array.from({ length: count }, (_, i) => i % imagesLength);
}

const PARALLAX_STRENGTH = 0.025;
const HOVER_MASK = { solid: 50, fade: 95 };
const NEAR_CIRCLE_THRESHOLD = 8; // viewport % – circle expands when cursor this close
/** Must stay above any accumulated slot.zIndex from respawns so the expanded image stacks on top. */
const FOCUSED_SLOT_Z = 1_000_000;
const CIRCLE_EXPAND_SCALE = 2.4;
const FOCUSED_MAX_WIDTH_PX = 1200;
const FOCUSED_MAX_HEIGHT_PX = 900;
const FOCUSED_PADDING_VW = 6;
const FOCUSED_PADDING_VH = 5;

export default function ImageCycle({
  images,
  entrancePhase = "live",
  entranceImageFadeMs = 1200,
  onSpawnChord,
  syncToTempo = false,
  spawnChordDurationSeconds,
  imageCycleDurationSeconds,
  advanceScheduleRef,
  cursorSyncRef,
  audioDebug,
}: {
  images: string[];
  /** entering: black field + rainbow thread only; live: images fade in and debug squiggle returns */
  entrancePhase?: "entering" | "live";
  /** Opacity fade for the image world when entering → live (ms). */
  entranceImageFadeMs?: number;
  onSpawnChord?: () => void;
  syncToTempo?: boolean;
  spawnChordDurationSeconds?: number;
  imageCycleDurationSeconds?: number; // hold until next chord + fade over 6 arp counts
  advanceScheduleRef?: React.MutableRefObject<{ advanceNextSlot: (step: number) => void } | null>;
  cursorSyncRef?: React.MutableRefObject<{ x: number; y: number }>;
  audioDebug?: {
    arpMuted: boolean;
    setArpMuted: (v: boolean) => void;
    spawnChordsMuted: boolean;
    setSpawnChordsMuted: (v: boolean) => void;
    padMuted: boolean;
    setPadMuted: (v: boolean) => void;
  };
}) {
  const slotCount = WORLD_SLOT_COUNT;
  const [indices, setIndices] = useState<number[]>(() =>
    getInitialIndices(images.length, slotCount)
  );
  const [aspectRatios, setAspectRatios] = useState<number[]>(() =>
    Array(slotCount).fill(1)
  );
  const [debugOpen, setDebugOpen] = useState(false);
  const [debug, setDebug] = useState(DEFAULT_DEBUG);
  const [cursor, setCursor] = useState({ x: 50, y: 50 });
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);
  const focusedSlotIndexRef = useRef<number | null>(null);
  focusedSlotIndexRef.current = focusedSlotIndex;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const [slotAnimEpoch, setSlotAnimEpoch] = useState(0);
  const prevEntranceRef = useRef(entrancePhase);

  // Generate random world slot positions only on client (Math.random)
  useEffect(() => {
    setSlots(buildSlots(generateWorldPositions()));
  }, []);

  useEffect(() => {
    if (prevEntranceRef.current === "entering" && entrancePhase === "live") {
      setSlotAnimEpoch((e) => e + 1);
    }
    prevEntranceRef.current = entrancePhase;
  }, [entrancePhase]);

  useEffect(() => {
    const update = () =>
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (focusedSlotIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusedSlotIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedSlotIndex]);

  const setCursorFromClientCoords = useCallback((clientX: number, clientY: number) => {
    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;
    setCursor({ x, y });
    if (cursorSyncRef) cursorSyncRef.current = { x, y };
  }, [cursorSyncRef]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCursorFromClientCoords(e.clientX, e.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setCursorFromClientCoords(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setCursorFromClientCoords(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [setCursorFromClientCoords]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      // Do not preventDefault — iOS needs it for reliable tap→click on controls inside touch-action regions.
      setCursorFromClientCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setCursorFromClientCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const setSlotAspect = (slotIndex: number, w: number, h: number) => {
    if (h <= 0) return;
    setAspectRatios((prev) => {
      const next = [...prev];
      next[slotIndex] = w / h;
      return next;
    });
  };

  const lastAdvanceStepRef = useRef<number[]>([]);
  const advanceSlot = (slotIndex: number, opts?: { skipChord?: boolean }) => {
    if (focusedSlotIndexRef.current === slotIndex) return;
    if (!opts?.skipChord) onSpawnChord?.();
    setIndices((prev) => {
      const inUse = new Set(
        prev.filter((_, j) => j !== slotIndex)
      );
      const next = [...prev];
      let candidate = (prev[slotIndex] + 1) % images.length;
      for (let k = 0; k < images.length; k++) {
        if (!inUse.has(candidate)) {
          next[slotIndex] = candidate;
          return next;
        }
        candidate = (candidate + 1) % images.length;
      }
      next[slotIndex] = (prev[slotIndex] + 1) % images.length;
      return next;
    });
    setSlots((prev) => {
      const base = getBaseSize(slotIndex);
      const isBig = Math.random() < BIG_SIZE_CHANCE;
      const scale = isBig ? BIG_SIZE_SCALE : 1;
      const newWidth = Math.min(110, base.width * scale);
      const newHeight = Math.min(110, base.height * scale);
      const pos = getNewPositionInView(
        prev,
        slotIndex,
        INITIAL_PAN.x,
        INITIAL_PAN.y,
        newWidth,
        newHeight
      );
      const maxZ = Math.max(...prev.map((s) => s.zIndex));
        return prev.map((s, j) =>
          j === slotIndex
            ? {
                ...s,
                left: pos.left,
                top: pos.top,
                width: newWidth,
                height: newHeight,
                zIndex: maxZ + 1,
              }
            : s
        );
    });
  };
  const advanceSlotRef = useRef(advanceSlot);
  advanceSlotRef.current = advanceSlot;

  useEffect(() => {
    if (!syncToTempo || !advanceScheduleRef) return;
    if (lastAdvanceStepRef.current.length !== slotCount) {
      lastAdvanceStepRef.current = Array.from({ length: slotCount }, (_, i) => i);
    }
    advanceScheduleRef.current = {
      advanceNextSlot: (step: number) => {
        const orders = lastAdvanceStepRef.current;
        const focused = focusedSlotIndexRef.current;
        let pick = -1;
        let bestOrder = Infinity;
        for (let i = 0; i < slotCount; i++) {
          if (i === focused) continue;
          if (orders[i] < bestOrder) {
            bestOrder = orders[i];
            pick = i;
          }
        }
        if (pick < 0) return;
        advanceSlotRef.current(pick, { skipChord: true });
        lastAdvanceStepRef.current[pick] = step;
      },
    };
    return () => {
      advanceScheduleRef.current = null;
    };
  }, [syncToTempo, advanceScheduleRef, slotCount]);

  const styleVars = (durationScale: number) => {
      const baseDuration =
        syncToTempo && imageCycleDurationSeconds != null
          ? imageCycleDurationSeconds
          : syncToTempo && spawnChordDurationSeconds != null
            ? spawnChordDurationSeconds
            : debug.duration;
      return {
        "--mind-duration": `${baseDuration * durationScale}s`,
        "--mind-blur": `${debug.blur}px`,
      } as React.CSSProperties;
    };

  /** Top-centered close control (matches layout when a slot is focused). */
  const closeBtnCenter =
    windowSize.w > 0 && windowSize.h > 0
      ? {
          x: 50,
          y: (100 * (20 + 12 * CIRCLE_EXPAND_SCALE)) / windowSize.h,
        }
      : { x: 50, y: 6 };
  const distanceToClose = dist(cursor.x, cursor.y, closeBtnCenter.x, closeBtnCenter.y);
  const closeCircleExpanded =
    focusedSlotIndex !== null && distanceToClose < NEAR_CIRCLE_THRESHOLD;

  const squiggleAttractors = useMemo(() => {
    const out: { x: number; y: number }[] = slots.map((slot) => {
      const slotScreenCx = slot.left + slot.width / 2 - INITIAL_PAN.x;
      const slotScreenCy = slot.top + slot.height / 2 - INITIAL_PAN.y;
      return { x: slotScreenCx, y: slotScreenCy };
    });
    if (focusedSlotIndex !== null) out.push(closeBtnCenter);
    return out;
  }, [slots, focusedSlotIndex, closeBtnCenter.x, closeBtnCenter.y]);

  if (images.length === 0 || slots.length === 0) return null;

  const sceneEntering = entrancePhase === "entering";
  const squiggleVariant = sceneEntering ? "rainbow" : debug.squiggleStyle;
  const showChrome = !sceneEntering;

  // Parallax depth must be relative to current z spread — zIndex grows on each respawn (maxZ+1),
  // so raw zIndex/7 would drift upward forever.
  const parallaxZMin =
    slots.length > 0 ? Math.min(...slots.map((s) => s.zIndex)) : 0;
  const parallaxZMax =
    slots.length > 0 ? Math.max(...slots.map((s) => s.zIndex)) : 1;
  const parallaxZSpan = Math.max(parallaxZMax - parallaxZMin, 1);

  return (
    <>
      <div
        className={`fixed inset-0 z-10 overflow-hidden ${focusedSlotIndex !== null ? "z-50" : ""} cursor-none touch-manipulation`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={(e) => {
          if (
            focusedSlotIndex !== null &&
            !(e.target as HTMLElement).closest?.("[data-focused-slot]")
          ) {
            setFocusedSlotIndex(null);
          }
        }}
      >
        {/* World container: fixed framing; slots use parallax only */}
        <div
          className={`relative will-change-transform transition-opacity ease-out ${sceneEntering ? "opacity-0" : "opacity-100"}`}
          style={{
            width: `${DISPLAY_WORLD_SIZE}%`,
            height: `${DISPLAY_WORLD_SIZE}%`,
            transform: `translate(-${(INITIAL_PAN.x / DISPLAY_WORLD_SIZE) * 100}%, -${(INITIAL_PAN.y / DISPLAY_WORLD_SIZE) * 100}%)`,
            transitionDuration: `${entranceImageFadeMs}ms`,
          }}
        >
          <div
            className="relative h-full w-full transition-transform duration-1000 ease-out"
            style={{
              transform: "none",
            }}
          >
            <div className="group relative h-full w-full overflow-visible">
              {slots.map((slot, i) => {
                const src = images[indices[i] % images.length];
                const isFocused = focusedSlotIndex === i;
                const isHovered = hoveredSlotIndex === i;
                const slotCx = slot.left + slot.width / 2;
                const slotCy = slot.top + slot.height / 2;
                const slotScreenCx = slotCx - INITIAL_PAN.x;
                const slotScreenCy = slotCy - INITIAL_PAN.y;
                const distanceToCursor = dist(
                  cursor.x,
                  cursor.y,
                  slotScreenCx,
                  slotScreenCy
                );
                const isNear = !isFocused && distanceToCursor < NEAR_CIRCLE_THRESHOLD;
                const circleExpanded = isHovered || isNear;
                const circlePx = circleExpanded ? 24 * CIRCLE_EXPAND_SCALE : 24;
                const tapTargetPx = Math.max(44, circlePx);
                const R = aspectRatios[i] ?? 1;
                const slotAspect = slot.width / slot.height;
                // Slot on-screen aspect = slotAspect * (window width/height); ellipse matches image aspect R regardless of window size
                const viewAspect = windowSize.w > 0 && windowSize.h > 0 ? windowSize.w / windowSize.h : 1;
                const slotAspectScreen = slotAspect * viewAspect;
                const ellipseAspect = R / slotAspectScreen;
                const rx = ellipseAspect >= 1 ? 50 : 50 * ellipseAspect;
                const ry = ellipseAspect >= 1 ? 50 / ellipseAspect : 50;
                const maskGradientDefault = `radial-gradient(ellipse ${rx}% ${ry}% at 50% 50%, black ${debug.maskFadeStart}%, transparent ${debug.maskFadeEnd}%)`;
                const maskGradientHover = `radial-gradient(ellipse ${rx}% ${ry}% at 50% 50%, black ${HOVER_MASK.solid}%, transparent ${HOVER_MASK.fade}%)`;
                const depth =
                  (slot.zIndex - parallaxZMin) / parallaxZSpan;
                const dx = isFocused
                  ? 0
                  : (slotScreenCx - cursor.x) * PARALLAX_STRENGTH * depth;
                const dy = isFocused
                  ? 0
                  : (slotScreenCy - cursor.y) * PARALLAX_STRENGTH * depth;
                const slotOuterStyle: CSSProperties = isFocused
                  ? {
                      position: "fixed",
                      left: "50%",
                      top: "50%",
                      width: `min(${FOCUSED_MAX_WIDTH_PX}px, calc(100vw - ${FOCUSED_PADDING_VW * 2}vw))`,
                      height: `min(${FOCUSED_MAX_HEIGHT_PX}px, calc(100vh - ${FOCUSED_PADDING_VH * 2}vh))`,
                      zIndex: FOCUSED_SLOT_Z,
                      transform: "translate(-50%, -50%)",
                      transition:
                        "width 0.45s ease-out, height 0.45s ease-out, transform 0.35s ease-out",
                    }
                  : {
                      left: `${(slot.left / DISPLAY_WORLD_SIZE) * 100}%`,
                      top: `${(slot.top / DISPLAY_WORLD_SIZE) * 100}%`,
                      width: `${(slot.width / DISPLAY_WORLD_SIZE) * 100}%`,
                      height: `${(slot.height / DISPLAY_WORLD_SIZE) * 100}%`,
                      zIndex: slot.zIndex,
                      transform: `translate(${dx}vw, ${dy}vh)`,
                      transition:
                        "left 0.5s ease-out, top 0.5s ease-out, width 0.5s ease-out, height 0.5s ease-out, transform 300ms ease-out",
                    };
            return (
              <div
                key={i}
                className={`overflow-visible ease-out ${
                  isFocused
                    ? "focus-overlay pointer-events-auto fixed"
                    : "pointer-events-none absolute"
                }`}
                data-focused-slot={isFocused ? true : undefined}
                style={slotOuterStyle}
              >
                <div
                  className={`pointer-events-none absolute inset-0 ${isFocused ? "focus-layer-oval" : ""}`}
                  style={{
                    maskImage: maskGradientDefault,
                    WebkitMaskImage: maskGradientDefault,
                    maskSize: "100% 100%",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                  }}
                >
                  <div
                    key={`${slotAnimEpoch}-${i}-${indices[i]}`}
                    className="mind-cycle relative flex h-full w-full items-center justify-center overflow-visible"
                    style={{
                      ...styleVars(slot.durationScale),
                      animationDelay: `${slot.delay}s`,
                    }}
                    onAnimationEnd={() => {
                      if (!syncToTempo && focusedSlotIndexRef.current !== i)
                        advanceSlot(i);
                    }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain object-center"
                      draggable={false}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setSlotAspect(i, img.naturalWidth, img.naturalHeight);
                      }}
                    />
                    {!isFocused && (
                      <button
                        type="button"
                        className="pointer-events-auto absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation items-center justify-center rounded-full border-0 bg-transparent p-0 transition-[width,height] duration-700 ease-out [-webkit-tap-highlight-color:transparent]"
                        style={{
                          width: tapTargetPx,
                          height: tapTargetPx,
                        }}
                        onMouseEnter={() => setHoveredSlotIndex(i)}
                        onMouseLeave={() => setHoveredSlotIndex(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedSlotIndex(i);
                        }}
                        aria-label={`Focus image ${i + 1}`}
                      >
                        <span
                          className="shrink-0 rounded-full border border-white/70"
                          style={{
                            borderWidth: 1,
                            width: circlePx,
                            height: circlePx,
                          }}
                          aria-hidden
                        />
                      </button>
                    )}
                  </div>
                </div>
                {isFocused ? (
                  <div className="focus-layer-full pointer-events-none absolute inset-0 flex items-center justify-center opacity-0">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain object-center"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-out"
                    style={{
                      opacity: isHovered ? 1 : 0,
                      maskImage: maskGradientHover,
                      WebkitMaskImage: maskGradientHover,
                      maskSize: "100% 100%",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                    }}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain object-center"
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
      </div>

      <SquiggleCursor
        mouse={cursor}
        attractors={squiggleAttractors}
        variant={squiggleVariant}
      />

      {focusedSlotIndex !== null && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          aria-hidden
          tabIndex={-1}
        />
      )}

      {focusedSlotIndex !== null && (
        <div
          className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 flex -translate-x-1/2 items-center justify-center"
          style={{
            width: 24 * CIRCLE_EXPAND_SCALE,
            height: 24 * CIRCLE_EXPAND_SCALE,
          }}
        >
          <button
            type="button"
            onClick={() => setFocusedSlotIndex(null)}
            className="close-btn-circle flex items-center justify-center rounded-full border border-white/70 text-white/90 transition-[width,height] duration-200 ease-out"
            style={{
              borderWidth: 1,
              width: closeCircleExpanded ? 24 * CIRCLE_EXPAND_SCALE : 24,
              height: closeCircleExpanded ? 24 * CIRCLE_EXPAND_SCALE : 24,
            }}
            aria-label="Close focused image"
          >
            <span className="close-fill" aria-hidden />
            <svg
              className="close-icon relative z-10 transition-colors duration-200 ease-out"
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
      )}

      {showChrome && <ArtistCredits />}

      {showChrome && (
      <div className="fixed bottom-3 left-3 z-10 flex max-w-[min(100vw-1.5rem,16rem)] flex-col gap-4">
        <button
          type="button"
          onClick={() => setDebugOpen((o) => !o)}
          className="rounded bg-white/90 px-3 py-1.5 text-xs font-medium text-black shadow hover:bg-white"
        >
          {debugOpen ? "Hide debug" : "Debug"}
        </button>
        {debugOpen && (
          <div className="mt-2 w-64 rounded bg-black/80 p-3 text-white shadow-lg backdrop-blur">
            <div className="space-y-4 text-xs">
              <label className="block">
                <span className="mb-1 block">Duration</span>
                <input
                  type="range"
                  min={4}
                  max={30}
                  step={1}
                  value={debug.duration}
                  onChange={(e) =>
                    setDebug((d) => ({ ...d, duration: Number(e.target.value) }))
                  }
                  className="h-2 w-full accent-white/80"
                />
                <span className="mt-0.5 block text-right text-white/60">
                  {debug.duration}s
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block">Blur</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={2}
                  value={debug.blur}
                  onChange={(e) =>
                    setDebug((d) => ({ ...d, blur: Number(e.target.value) }))
                  }
                  className="h-2 w-full accent-white/80"
                />
                <span className="mt-0.5 block text-right text-white/60">
                  {debug.blur}px
                </span>
              </label>
              <div className="space-y-2">
                <span className="block">Mask feather (gradient)</span>
                <div
                  className="h-3 w-full rounded-full border border-white/20"
                  style={{
                    background: `linear-gradient(to right, #fff 0%, #fff ${debug.maskFadeStart}%, transparent ${debug.maskFadeEnd}%)`,
                  }}
                />
                <div className="relative flex gap-1">
                  <label className="flex-1">
                    <span className="sr-only">Solid until</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.min(50, debug.maskFadeEnd - 5)}
                      step={1}
                      value={debug.maskFadeStart}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setDebug((d) => ({
                          ...d,
                          maskFadeStart: v,
                          maskFadeEnd: Math.max(d.maskFadeEnd, v + 5),
                        }));
                      }}
                      className="h-2 w-full accent-white/80"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="sr-only">Transparent at</span>
                    <input
                      type="range"
                      min={Math.max(40, debug.maskFadeStart + 5)}
                      max={95}
                      step={1}
                      value={debug.maskFadeEnd}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setDebug((d) => ({
                          ...d,
                          maskFadeEnd: v,
                          maskFadeStart: Math.min(d.maskFadeStart, v - 5),
                        }));
                      }}
                      className="h-2 w-full accent-white/80"
                    />
                  </label>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Solid {debug.maskFadeStart}%</span>
                  <span>Fade {debug.maskFadeEnd}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="block">Cursor</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDebug((d) => ({ ...d, squiggleStyle: "line" }))}
                    className={`flex-1 rounded py-1.5 text-white/90 ${
                      debug.squiggleStyle === "line"
                        ? "bg-white/20 ring-1 ring-white/40"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebug((d) => ({ ...d, squiggleStyle: "rainbow" }))}
                    className={`flex-1 rounded py-1.5 text-white/90 ${
                      debug.squiggleStyle === "rainbow"
                        ? "bg-white/20 ring-1 ring-white/40"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    Rainbow
                  </button>
                </div>
              </div>
              {audioDebug && (
                <div className="space-y-2 border-t border-white/20 pt-3">
                  <span className="block text-white/80">Audio (toggle to compare)</span>
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="text-white/70">Arpeggio</span>
                    <input
                      type="checkbox"
                      checked={!audioDebug.arpMuted}
                      onChange={() => audioDebug.setArpMuted(!audioDebug.arpMuted)}
                      className="h-3.5 w-3.5 accent-white/80"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="text-white/70">Spawn chords</span>
                    <input
                      type="checkbox"
                      checked={!audioDebug.spawnChordsMuted}
                      onChange={() => audioDebug.setSpawnChordsMuted(!audioDebug.spawnChordsMuted)}
                      className="h-3.5 w-3.5 accent-white/80"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="text-white/70">Pad (water)</span>
                    <input
                      type="checkbox"
                      checked={!audioDebug.padMuted}
                      onChange={() => audioDebug.setPadMuted(!audioDebug.padMuted)}
                      className="h-3.5 w-3.5 accent-white/80"
                    />
                  </label>
                </div>
              )}
              <button
                type="button"
                onClick={() => setDebug(DEFAULT_DEBUG)}
                className="mt-2 w-full rounded border border-white/30 py-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </>
  );
}
