import { useEffect, useRef } from "react";
import { Lightbulb, ToggleLeft, Zap, Cable, Plug, Fan, Droplets, PlugZap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * HeroHelix — the shop's range rendered as a slow-turning double helix,
 * each "bead" a category of electrical goods instead of a base pair.
 *
 * No 3D/canvas library — the site has none, and this is a full replacement
 * of the old schematic-panel HeroPanel, so the geometry is done by hand:
 * every node's (angle, radius, y) is rotated + perspective-projected in JS
 * on each animation frame, then written straight to element styles (not
 * React state) so nothing re-renders 60x/second. The connecting strands
 * and their travelling energy pulses are plain SVG paths/circles, updated
 * the same way — a bigger version of the `<animateMotion>` trick the old
 * HeroPanel used, just driven manually for full control over the curve.
 *
 * Desktop: the helix leans gently toward the cursor (yaw + pitch).
 * Touch: drag to spin it; releasing hands control back to auto-rotation
 * exactly where you left it. Either way it keeps drifting on its own.
 * Every few seconds one product eases outward and a label names it, then
 * it settles back into the spiral.
 */

type Product = { label: string; blurb: string; Icon: LucideIcon };

// LED bulbs, switches, MCBs, wires, sockets, fans, pumps, extension boards —
// the everyday spread of an electrical-goods shop.
const PRODUCTS: Product[] = [
  { label: "LED Bulbs", blurb: "Bright, efficient lighting", Icon: Lightbulb },
  { label: "Switches", blurb: "Modular switches & plates", Icon: ToggleLeft },
  { label: "MCBs", blurb: "Circuit protection", Icon: Zap },
  { label: "Wires", blurb: "Copper wiring & cable", Icon: Cable },
  { label: "Sockets", blurb: "Plug points & outlets", Icon: Plug },
  { label: "Fans", blurb: "Ceiling & wall fans", Icon: Fan },
  { label: "Pumps", blurb: "Water pumps & motors", Icon: Droplets },
  { label: "Ext. Boards", blurb: "Power strips & boards", Icon: PlugZap },
];

// ---- Geometry (world units — arbitrary, tuned to the projection below) --
const RUNGS = 9; // product nodes per strand (18 total)
const TURNS = 2.4; // full twists from top to bottom
const RADIUS = 70;
const SPAN = 300; // vertical extent
const PROJ_D = 340; // perspective constant — bigger = flatter, gentler depth
const HALF_W = 150;
const HALF_H = 210;
const STRAND_SAMPLES = 60;

const POP_RADIAL = 32; // how far a spotlighted node steps outward
const POP_Z = 60; // and how far it pulls toward camera
const POP_SCALE = 0.34; // extra scale at full pop

const AUTO_SPIN = (Math.PI * 2) / 32000; // rad/ms — one lap every ~32s
const LERP = 0.06;
const MAX_PITCH = 0.32;
const MAX_YAW_BIAS = 0.26;
const DRAG_YAW_SENS = 0.0075;
const DRAG_PITCH_SENS = 0.006;
const MAX_DRAG_PITCH = 0.34;

const CYCLE_MS = 4400; // one product's turn in the spotlight
const POP_DURATION_MS = 2200; // how long of that turn it spends popped out

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// A faint organic bulge rather than a perfectly cylindrical spiral.
function ringRadius(t: number) {
  return RADIUS * (1 + 0.04 * Math.sin(t * Math.PI * 3));
}

type HelixNode = { id: string; angle: number; radius: number; y: number; product: Product };

function buildNodes(): HelixNode[] {
  const nodes: HelixNode[] = [];
  for (let i = 0; i < RUNGS; i++) {
    const t = i / (RUNGS - 1);
    const angle = t * TURNS * Math.PI * 2;
    const radius = ringRadius(t);
    const y = (t - 0.5) * SPAN;
    // Strand B is offset both in angle (opposite side) and in which
    // product it shows (+4 of 8), so paired-up nodes read as different
    // categories rather than mirrored duplicates.
    nodes.push({ id: `a${i}`, angle, radius, y, product: PRODUCTS[i % PRODUCTS.length] });
    nodes.push({ id: `b${i}`, angle: angle + Math.PI, radius, y, product: PRODUCTS[(i + 4) % PRODUCTS.length] });
  }
  return nodes;
}

const NODES = buildNodes();

type StrandPoint = { angle: number; radius: number; y: number };

function buildStrand(phase: number): StrandPoint[] {
  const pts: StrandPoint[] = [];
  for (let i = 0; i <= STRAND_SAMPLES; i++) {
    const t = i / STRAND_SAMPLES;
    pts.push({ angle: t * TURNS * Math.PI * 2 + phase, radius: ringRadius(t), y: (t - 0.5) * SPAN });
  }
  return pts;
}

const STRAND_A = buildStrand(0);
const STRAND_B = buildStrand(Math.PI);

type Projected = { lx: number; ly: number; scale: number; depth: number };

function project(
  angle: number,
  radius: number,
  y: number,
  rotationY: number,
  pitch: number,
  extraRadial = 0,
  extraZ = 0,
): Projected {
  const totalAngle = angle + rotationY;
  const r = radius + extraRadial;
  const x = r * Math.cos(totalAngle);
  const zRaw = r * Math.sin(totalAngle);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const yRot = y * cp - zRaw * sp;
  const zRot = y * sp + zRaw * cp + extraZ;
  const scale = PROJ_D / (PROJ_D - zRot);
  return { lx: x * scale, ly: yRot * scale, scale, depth: zRot };
}

function pathFromStrand(strand: StrandPoint[], rotationY: number, pitch: number): string {
  let d = "";
  for (let i = 0; i < strand.length; i++) {
    const p = strand[i];
    const { lx, ly } = project(p.angle, p.radius, p.y, rotationY, pitch);
    d += (i === 0 ? "M " : "L ") + lx.toFixed(1) + " " + ly.toFixed(1) + " ";
  }
  return d.trim();
}

function depthOpacity(scale: number) {
  return clamp(0.42 + (scale - 0.7) * 0.9, 0.42, 1);
}

// Static first-paint values — pure functions of fixed geometry, so server
// and client render identically and there's no post-hydration flash.
const INITIAL_STRAND_A_D = pathFromStrand(STRAND_A, 0, 0);
const INITIAL_STRAND_B_D = pathFromStrand(STRAND_B, 0, 0);
const INITIAL_PROJECTIONS = NODES.map((n) => project(n.angle, n.radius, n.y, 0, 0));
const INITIAL_RANK = new Map<number, number>();
INITIAL_PROJECTIONS.map((p, i) => ({ i, depth: p.depth }))
  .sort((a, b) => a.depth - b.depth)
  .forEach((o, rank) => INITIAL_RANK.set(o.i, rank));

// Four travelling beads of current — two per strand, staggered.
const PULSE_DEFS = [
  { strand: STRAND_A, speed: 0.14, phase: 0 },
  { strand: STRAND_A, speed: 0.14, phase: 0.5 },
  { strand: STRAND_B, speed: 0.12, phase: 0.22 },
  { strand: STRAND_B, speed: 0.12, phase: 0.72 },
];

export function HeroHelix() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strandARef = useRef<SVGPathElement | null>(null);
  const strandBRef = useRef<SVGPathElement | null>(null);
  const pulseRefs = useRef<(SVGCircleElement | null)[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    // Automatic spin/pulses/spotlight are motion the user didn't ask for,
    // so they're gated on this. Cursor-tilt and drag stay available either
    // way — that motion is user-initiated.
    let reduceMotion = reduceMotionQuery.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
    };
    reduceMotionQuery.addEventListener("change", handleMotionChange);

    if (reduceMotion) {
      pulseRefs.current.forEach((el) => el?.style.setProperty("opacity", "0"));
    }

    const rotationY = { current: 0 };
    const pitch = { current: 0 };
    const pitchTarget = { current: 0 };
    const yawBias = { current: 0 };
    const yawBiasTarget = { current: 0 };
    const dragYawOffset = { current: 0 };
    const dragPitchOffset = { current: 0 };
    const dragging = { current: false };
    const lastDrag = { current: { x: 0, y: 0 } };
    const lastPointer = { current: { x: 0, y: 0 } };
    const spotlightIndex = { current: 0 };
    const spotlightStart = { current: performance.now() };
    let lastTime = performance.now();
    let rafId = 0;

    function popAmount(index: number, now: number) {
      if (reduceMotion || index !== spotlightIndex.current) return 0;
      const elapsed = now - spotlightStart.current;
      if (elapsed >= POP_DURATION_MS) return 0;
      return Math.sin(Math.PI * clamp(elapsed / POP_DURATION_MS, 0, 1));
    }

    function onPointerMove(e: PointerEvent) {
      lastPointer.current.x = e.clientX;
      lastPointer.current.y = e.clientY;
    }
    function onPointerDown(e: PointerEvent) {
      dragging.current = true;
      lastDrag.current.x = e.clientX;
      lastDrag.current.y = e.clientY;
      container.setPointerCapture(e.pointerId);
    }
    function onPointerDragMove(e: PointerEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - lastDrag.current.x;
      const dy = e.clientY - lastDrag.current.y;
      lastDrag.current.x = e.clientX;
      lastDrag.current.y = e.clientY;
      dragYawOffset.current += dx * DRAG_YAW_SENS;
      dragPitchOffset.current = clamp(dragPitchOffset.current + dy * DRAG_PITCH_SENS, -MAX_DRAG_PITCH, MAX_DRAG_PITCH);
    }
    function onPointerUp() {
      dragging.current = false;
    }

    if (isCoarsePointer) {
      // pan-y: vertical page scroll still passes through; horizontal drag
      // is what we capture for rotation.
      container.style.touchAction = "pan-y";
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerDragMove);
      container.addEventListener("pointerup", onPointerUp);
      container.addEventListener("pointercancel", onPointerUp);
    } else {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    function frame(now: number) {
      const dt = now - lastTime;
      lastTime = now;

      if (!reduceMotion) {
        rotationY.current += AUTO_SPIN * dt;
        const elapsedCycle = now - spotlightStart.current;
        if (elapsedCycle > CYCLE_MS) {
          spotlightStart.current = now;
          spotlightIndex.current = (spotlightIndex.current + 1) % NODES.length;
        }
      }

      if (!isCoarsePointer) {
        const rect = container.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = clamp((lastPointer.current.x - cx) / (rect.width * 1.3 || 1), -1, 1);
        const ny = clamp((lastPointer.current.y - cy) / (rect.height * 1.3 || 1), -1, 1);
        yawBiasTarget.current = nx * MAX_YAW_BIAS;
        pitchTarget.current = -ny * MAX_PITCH;
      } else if (!dragging.current) {
        yawBiasTarget.current = 0;
      }

      pitch.current += (pitchTarget.current - pitch.current) * LERP;
      yawBias.current += (yawBiasTarget.current - yawBias.current) * LERP;

      const totalRotation = rotationY.current + dragYawOffset.current + yawBias.current;
      const totalPitch = clamp(pitch.current + dragPitchOffset.current, -MAX_DRAG_PITCH, MAX_DRAG_PITCH);

      const projections = NODES.map((n, i) => {
        const p = popAmount(i, now);
        const proj = project(n.angle, n.radius, n.y, totalRotation, totalPitch, p * POP_RADIAL, p * POP_Z);
        return { node: n, pop: p, ...proj };
      });

      [...projections]
        .sort((a, b) => a.depth - b.depth)
        .forEach((item, rank) => {
          const el = nodeRefs.current.get(item.node.id);
          if (!el) return;
          el.style.left = (((item.lx + HALF_W) / (HALF_W * 2)) * 100).toFixed(2) + "%";
          el.style.top = (((item.ly + HALF_H) / (HALF_H * 2)) * 100).toFixed(2) + "%";
          el.style.zIndex = String(rank);
          el.style.opacity = depthOpacity(item.scale).toFixed(3);
          el.style.setProperty("--depth-scale", item.scale.toFixed(3));
          el.style.setProperty("--pop", item.pop.toFixed(3));
        });

      if (!reduceMotion) {
        strandARef.current?.setAttribute("d", pathFromStrand(STRAND_A, totalRotation, totalPitch));
        strandBRef.current?.setAttribute("d", pathFromStrand(STRAND_B, totalRotation, totalPitch));

        const nowSec = now / 1000;
        PULSE_DEFS.forEach((def, i) => {
          const el = pulseRefs.current[i];
          if (!el) return;
          const t = (((nowSec * def.speed + def.phase) % 1) + 1) % 1;
          const idx = t * (def.strand.length - 1);
          const lo = Math.floor(idx);
          const hi = Math.min(def.strand.length - 1, lo + 1);
          const frac = idx - lo;
          const a = def.strand[lo];
          const b = def.strand[hi];
          const p = project(
            a.angle + (b.angle - a.angle) * frac,
            a.radius + (b.radius - a.radius) * frac,
            a.y + (b.y - a.y) * frac,
            totalRotation,
            totalPitch,
          );
          el.setAttribute("cx", p.lx.toFixed(1));
          el.setAttribute("cy", p.ly.toFixed(1));
          el.setAttribute("opacity", clamp(0.55 * p.scale, 0.25, 0.95).toFixed(2));
        });
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      reduceMotionQuery.removeEventListener("change", handleMotionChange);
      if (isCoarsePointer) {
        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerDragMove);
        container.removeEventListener("pointerup", onPointerUp);
        container.removeEventListener("pointercancel", onPointerUp);
      } else {
        window.removeEventListener("pointermove", onPointerMove);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="reveal-up relative mx-auto aspect-[5/7] w-full max-w-sm select-none md:max-w-md"
      style={{ animationDelay: "0.15s" }}
    >
      <div className="helix-ambient-glow pointer-events-none absolute inset-0" />

      <svg
        viewBox={`-${HALF_W} -${HALF_H} ${HALF_W * 2} ${HALF_H * 2}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="helix-strand-grad" x1="0" y1={-HALF_H} x2="0" y2={HALF_H} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a8dcff" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#3f8cff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7fd0ff" stopOpacity="0.85" />
          </linearGradient>
          <filter id="helix-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          ref={strandARef}
          d={INITIAL_STRAND_A_D}
          fill="none"
          stroke="url(#helix-strand-grad)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#helix-glow)"
        />
        <path
          ref={strandBRef}
          d={INITIAL_STRAND_B_D}
          fill="none"
          stroke="url(#helix-strand-grad)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#helix-glow)"
          opacity={0.85}
        />

        {PULSE_DEFS.map((_, i) => (
          <circle
            key={i}
            ref={(el) => {
              pulseRefs.current[i] = el;
            }}
            r={4.2}
            fill="#eaf6ff"
            filter="url(#helix-glow)"
          />
        ))}
      </svg>

      {NODES.map((n, i) => {
        const proj = INITIAL_PROJECTIONS[i];
        const Icon = n.product.Icon;
        return (
          <div
            key={n.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(n.id, el);
            }}
            className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 will-change-transform"
            style={{
              left: `${((proj.lx + HALF_W) / (HALF_W * 2)) * 100}%`,
              top: `${((proj.ly + HALF_H) / (HALF_H * 2)) * 100}%`,
              zIndex: INITIAL_RANK.get(i),
              opacity: depthOpacity(proj.scale),
            }}
          >
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brass/35 bg-gradient-to-br from-obsidian to-obsidian-deep text-brass-soft sm:h-12 sm:w-12 md:h-14 md:w-14"
              style={{
                transform: `scale(calc(var(--depth-scale, 1) * (1 + var(--pop, 0) * ${POP_SCALE})))`,
                boxShadow:
                  "0 0 16px -4px var(--color-brass), 0 0 calc(6px + var(--pop, 0) * 30px) rgb(94 197 255 / calc(0.12 + var(--pop, 0) * 0.55))",
              }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-0 w-max max-w-[9.5rem] -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-normal rounded-lg border border-brass/25 bg-obsidian-deep/95 px-2.5 py-1.5 text-center shadow-soft backdrop-blur-sm"
              style={{ opacity: "var(--pop, 0)" }}
            >
              <p className="font-display text-[10px] font-semibold tracking-wide text-brass-soft">{n.product.label}</p>
              <p className="mt-0.5 text-[9px] text-porcelain/70">{n.product.blurb}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
