"use client";

import { useEffect, useRef } from "react";

// —— A line that follows. Nothing more.
const LENGTH = 44;           // how many points in the line
const FOLLOW = 0.14;         // how quickly the head follows the cursor
const DRAG = 0.92;           // each point lags the next by this much (tail trails)
const BREATH = 0.6;          // a gentle sideways sway (0 = still line)
const BREATH_SPEED = 0.002;
const STILL_AFTER = 40;      // frames without movement before we drift
const DRIFT = 0.002;         // when still, a slow turn around the cursor
const SMOOTH = 5;            // cursor smoothing (frame-rate independent)
const SPLINE_SAMPLES = 6;    // smooth curve between points
const STROKE = 2;
const HEAD_SIZE = 7;         // triangle size (px)
const TRAJECTORY_SMOOTH = 0.18;  // how quickly direction follows mouse movement
const RAINBOW_RADIUS = 26;   // circle radius (px) in rainbow mode
const RAINBOW_BLUR = "8px";
const WHITE_TRAIL_LENGTH = 36;   // secondary trail segment count
const WHITE_TRAIL_RADIUS = 10;   // thinner circles
const WHITE_TRAIL_BLUR = "4px";
const WHITE_TRAIL_WAVE_SPEED = 2.2;   // energy wave speed along trail
const WHITE_TRAIL_WAVE_SPREAD = 0.52; // phase per segment (higher = tighter band)
const SPECTRUM_SPEED = 0.025;  // hue drift per second (revolutions)
const WOBBLE_AMP = 1.5;        // perpendicular wobble (viewport %)
const WOBBLE_SPEED = 0.8;      // wobble frequency
const WOBBLE_PHASE = 0.35;     // phase shift per segment
const IDLE_GROWTH_FRAMES = 180;   // ~3s at 60fps for circles to reach max idle size
const IDLE_SIZE_FACTOR = 0.85;   // tail circles grow up to this much larger when idle
const REFINE_DECAY = 1.2;        // when moving, idleLevel decays per second (smooth return)
const REFINED_WOBBLE = 0.32;     // wobble multiplier when refined (moving); 1 when idle

type Point = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function driftToward(p: Point, toward: Point, t: number): void {
  p.x = lerp(p.x, toward.x, t);
  p.y = lerp(p.y, toward.y, t);
}

/** Catmull-Rom: point on the segment between p1 and p2, with t in [0,1]. */
function splinePoint(
  p0: Point, p1: Point, p2: Point, p3: Point,
  t: number
): Point {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export default function SquiggleCursor({
  mouse,
  attractors = [],
  variant = "line",
}: {
  mouse: { x: number; y: number };
  attractors?: Point[];
  variant?: "line" | "rainbow";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<Point[]>([]);
  const smoothRef = useRef<Point>({ x: mouse.x, y: mouse.y });
  const prevMouseRef = useRef<Point>({ x: mouse.x, y: mouse.y });
  const trajectoryRef = useRef<Point>({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const stillRef = useRef(0);
  const angleRef = useRef(0);
  const orbitOffsetRef = useRef<{ x: number; y: number } | null>(null); // frozen when drifting
  const idleLevelRef = useRef(0); // 0 = refined (moving), 1 = idle (grow + wobble); smooth transition
  const attractorsRef = useRef(attractors);
  attractorsRef.current = attractors;
  const mouseRef = useRef(mouse);
  mouseRef.current = mouse;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    if (lineRef.current.length !== LENGTH) {
      lineRef.current = Array.from({ length: LENGTH }, () => ({
        x: mouseRef.current.x,
        y: mouseRef.current.y,
      }));
    }

    let rafId: number;

    function tick(now: number) {
      const c = canvasRef.current;
      if (!c) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const dt = lastTimeRef.current > 0 ? Math.min((now - lastTimeRef.current) / 1000, 0.1) : 1 / 60;
      lastTimeRef.current = now;
      const stepScale = dt * 60;
      const simSteps = stepScale > 2 ? Math.min(stepScale, 1.2) : stepScale;
      const dtFollow = Math.min(dt, 1 / 30);

      const m = mouseRef.current;
      const line = lineRef.current;
      const smooth = smoothRef.current;

      // Mouse trajectory (direction of movement), smoothed
      const prev = prevMouseRef.current;
      const dx = m.x - prev.x, dy = m.y - prev.y;
      prevMouseRef.current = { x: m.x, y: m.y };
      const traj = trajectoryRef.current;
      traj.x = lerp(traj.x, dx, TRAJECTORY_SMOOTH);
      traj.y = lerp(traj.y, dy, TRAJECTORY_SMOOTH);

      // Where we want the head to be: cursor, gently smoothed
      const followT = 1 - Math.exp(-SMOOTH * dtFollow);
      smooth.x = lerp(smooth.x, m.x, followT);
      smooth.y = lerp(smooth.y, m.y, followT);

      // Optional: pull toward nearest attractor when close (soft falloff to avoid sudden grabs)
      const attractors = attractorsRef.current;
      let headTarget = { x: smooth.x, y: smooth.y };
      if (attractors.length > 0) {
        let best = attractors[0];
        let bestD = Math.hypot(m.x - best.x, m.y - best.y);
        for (const a of attractors) {
          const d = Math.hypot(m.x - a.x, m.y - a.y);
          if (d < bestD) { bestD = d; best = a; }
        }
        const outer = 18;
        const inner = 6;
        let pull = 0;
        if (bestD < outer) {
          const t = Math.max(0, Math.min(1, (outer - bestD) / (outer - inner)));
          pull = t * t * 0.28;
        }
        headTarget = {
          x: lerp(smooth.x, best.x, pull),
          y: lerp(smooth.y, best.y, pull),
        };
      }

      // When still long enough, drift slowly around the cursor
      const moved = Math.hypot(m.x - smooth.x, m.y - smooth.y);
      if (moved < 0.06) {
        stillRef.current += 1;
        if (stillRef.current > STILL_AFTER) {
          // Freeze orbit offset when we first enter drift so it doesn't shrink or jump
          if (orbitOffsetRef.current == null) {
            orbitOffsetRef.current = {
              x: headTarget.x - m.x,
              y: headTarget.y - m.y,
            };
          }
          angleRef.current += DRIFT * simSteps;
          const co = Math.cos(angleRef.current), si = Math.sin(angleRef.current);
          const o = orbitOffsetRef.current;
          headTarget = {
            x: m.x + o.x * co - o.y * si,
            y: m.y + o.x * si + o.y * co,
          };
        }
      } else {
        stillRef.current = 0;
        orbitOffsetRef.current = null; // clear when moving again so next drift gets fresh radius
      }

      // Idle level: rises when still (circle grow + wobble), decays slowly when moving (refined)
      const isIdle = moved < 0.06 && stillRef.current > STILL_AFTER;
      if (isIdle) {
        idleLevelRef.current = Math.min(1, idleLevelRef.current + 1 / IDLE_GROWTH_FRAMES);
      } else {
        idleLevelRef.current = lerp(idleLevelRef.current, 0, REFINE_DECAY * dt);
      }
      const idleLevel = idleLevelRef.current;

      // Follow the leader: each point drifts toward the one in front
      driftToward(line[0], headTarget, FOLLOW);
      for (let i = 1; i < LENGTH; i++) {
        driftToward(line[i], line[i - 1], 1 - Math.pow(DRAG, 1 + i * 0.08));
      }

      // Breath: a little sway perpendicular to the line
      const time = now * 0.001;
      const withBreath: Point[] = line.map((p, i) => {
        const next = line[Math.min(i + 1, LENGTH - 1)];
        const dx = next.x - p.x, dy = next.y - p.y;
        const len = Math.hypot(dx, dy) || 1e-6;
        const perpX = -dy / len, perpY = dx / len;
        const wave = Math.sin(time * BREATH_SPEED * 1000 + i * 0.4) * BREATH * (i / LENGTH);
        return {
          x: p.x + perpX * wave,
          y: p.y + perpY * wave,
        };
      });

      const w = c.width, h = c.height;
      const toPx = (v: number, x: boolean) => (v / 100) * (x ? w : h);
      const pts = withBreath;

      const ctx = c.getContext("2d");
      if (!ctx) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      ctx.clearRect(0, 0, w, h);

      if (variant === "rainbow") {
        const t = now * 0.001;
        const hueOffset = (t * SPECTRUM_SPEED * 360) % 360;
        // Wobble: full when idle (idleLevel 1), more refined (less wobble) when moving (idleLevel 0)
        const wobbleMult = REFINED_WOBBLE + (1 - REFINED_WOBBLE) * idleLevel;
        const wobbled: Point[] = pts.map((p, i) => {
          const next = pts[Math.min(i + 1, LENGTH - 1)];
          const dx = next.x - p.x, dy = next.y - p.y;
          const len = Math.hypot(dx, dy) || 1e-6;
          const perpX = -dy / len, perpY = dx / len;
          const wobbleScale = 0.35 + (i / LENGTH) * 1.35;  // head gentler, tail more wobble
          const wobble = Math.sin(t * WOBBLE_SPEED + i * WOBBLE_PHASE) * WOBBLE_AMP * wobbleScale * wobbleMult;
          return {
            x: p.x + perpX * wobble,
            y: p.y + perpY * wobble,
          };
        });

        // Secondary trail: white circles with moving energy wave along the line
        ctx.filter = WHITE_TRAIL_BLUR;
        const whiteCount = Math.min(WHITE_TRAIL_LENGTH, LENGTH);
        for (let i = 0; i < whiteCount; i++) {
          const px = toPx(wobbled[i].x, true);
          const py = toPx(wobbled[i].y, false);
          // Wave moving along trail: 0..1 pulse that travels over time
          const wave = (1 + Math.sin(i * WHITE_TRAIL_WAVE_SPREAD - t * WHITE_TRAIL_WAVE_SPEED)) / 2;
          const intensity = 0.12 + wave * 0.35;  // base + moving bright band
          const idleScale = 1 + (i / LENGTH) * idleLevel * IDLE_SIZE_FACTOR * 0.5;  // tail grows when idle, decays when moving
          const r = WHITE_TRAIL_RADIUS * (0.7 + wave * 0.5) * idleScale;
          const whiteGrad = ctx.createRadialGradient(px, py, 0, px, py, r);
          whiteGrad.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.5})`);
          whiteGrad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.2})`);
          whiteGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = whiteGrad;
          ctx.fill();
        }
        ctx.filter = "none";

        ctx.filter = RAINBOW_BLUR;
        for (let i = 0; i < LENGTH; i++) {
          const px = toPx(wobbled[i].x, true);
          const py = toPx(wobbled[i].y, false);
          const hue = ((i / (LENGTH - 1)) * 360 + hueOffset) % 360;
          // Idle: circles grow from tail; size animates back down when moving (idleLevel decays)
          const tailness = i / LENGTH;
          const radiusScale = 1 + tailness * idleLevel * IDLE_SIZE_FACTOR;
          const r = RAINBOW_RADIUS * radiusScale;
          const gradient = ctx.createRadialGradient(
            px, py, 0,
            px, py, r
          );
          gradient.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.16)`);
          gradient.addColorStop(0.4, `hsla(${hue}, 80%, 62%, 0.09)`);
          gradient.addColorStop(0.75, `hsla(${hue}, 75%, 60%, 0.03)`);
          gradient.addColorStop(1, "hsla(0, 0%, 100%, 0)");
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        ctx.filter = "none";
        // Head circle is rendered as HTML below for real-time cursor position
      } else {
        // Line mode: smooth curve + triangle head
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = STROKE;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(toPx(pts[0].x, true), toPx(pts[0].y, false));
        for (let i = 0; i < LENGTH - 1; i++) {
          const p0 = i > 0 ? pts[i - 1] : pts[0];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const p3 = i + 2 < LENGTH ? pts[i + 2] : pts[LENGTH - 1];
          for (let s = 1; s <= SPLINE_SAMPLES; s++) {
            const q = splinePoint(p0, p1, p2, p3, s / SPLINE_SAMPLES);
            ctx.lineTo(toPx(q.x, true), toPx(q.y, false));
          }
        }
        ctx.stroke();

        const hx = toPx(pts[0].x, true), hy = toPx(pts[0].y, false);
        const trajLen = Math.hypot(traj.x, traj.y);
        const angle = trajLen > 0.02
          ? Math.atan2(traj.y, traj.x)
          : Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x);
        const c = Math.cos(angle), s = Math.sin(angle);
        const tipX = HEAD_SIZE * c;
        const tipY = HEAD_SIZE * s;
        const base1x = -HEAD_SIZE * 0.7 * c - HEAD_SIZE * 0.6 * s;
        const base1y = -HEAD_SIZE * 0.7 * s + HEAD_SIZE * 0.6 * c;
        const base2x = -HEAD_SIZE * 0.7 * c + HEAD_SIZE * 0.6 * s;
        const base2y = -HEAD_SIZE * 0.7 * s - HEAD_SIZE * 0.6 * c;
        ctx.beginPath();
        ctx.moveTo(hx + tipX, hy + tipY);
        ctx.lineTo(hx + base1x, hy + base1y);
        ctx.lineTo(hx + base2x, hy + base2y);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [variant]);

  const cursorSize = HEAD_SIZE * 2.4;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 block h-full w-full"
        style={{ width: "100%", height: "100%" }}
        aria-hidden
      />
      {variant === "rainbow" && (
        <div
          className="pointer-events-none fixed z-50 rounded-full"
          style={{
            left: `${mouse.x}%`,
            top: `${mouse.y}%`,
            width: cursorSize,
            height: cursorSize,
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 60%, transparent 70%)",
            boxShadow: "0 0 12px 2px rgba(255,255,255,0.15)",
          }}
          aria-hidden
        />
      )}
    </>
  );
}
