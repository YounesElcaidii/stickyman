import React from "react";
import { lerp, rand } from "../../lib/anim";

/**
 * One stable side-view cutaway of the window, left to right:
 *   Outside -> Outer pane -> Middle pane (with the hole) -> Scratch cover -> Cabin
 * Nothing in here moves position between scenes; only highlights, arrows and air are animated.
 */

export const C = {
  outside: "#7fb2ff",
  cabin: "#ff9f5a",
  cabinAir: "#e8762b",
  glass: "#8fdcff",
  ink: "#11131a",
  yellow: "#ffd23f",
};

// Geometry (video pixels)
export const G = {
  top: 450, // inner top of the window frame
  bottom: 1160, // inner bottom of the window frame
  outerX: 270,
  outerW: 60,
  middleX: 540,
  middleW: 40,
  scratchX: 700,
  scratchW: 18,
  scratchTop: 510,
  scratchBottom: 1090,
  wallL: 250,
  wallR: 760,
  holeY: 1020,
  holeH: 40,
  floorY: 1210,
};
const gapL = G.outerX + G.outerW; // 330
const gapR = G.middleX; // 540

const Label: React.FC<{
  x: number;
  y: number;
  lines: string[];
  bg?: string;
  fg?: string;
  leaderTo?: number; // y to draw a leader line down to
  glow?: number;
}> = ({ x, y, lines, bg = "white", fg = C.ink, leaderTo, glow = 0 }) => {
  const size = 40;
  const w = Math.max(...lines.map((l) => l.length)) * size * 0.62 + 44;
  const h = lines.length * size * 1.08 + 26;
  return (
    <g>
      {leaderTo !== undefined && (
        <>
          <line x1={x} y1={y + h / 2} x2={x} y2={leaderTo} stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
          <line x1={x} y1={y + h / 2} x2={x} y2={leaderTo} stroke="white" strokeWidth={5} strokeLinecap="round" />
          <circle cx={x} cy={leaderTo} r={9} fill="white" stroke={C.ink} strokeWidth={4} />
        </>
      )}
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={20}
        fill={glow > 0.5 ? C.yellow : bg}
        stroke={C.ink}
        strokeWidth={6}
      />
      {lines.map((l, i) => (
        <text
          key={i}
          x={x}
          y={y - h / 2 + 13 + size * 0.86 + i * size * 1.08}
          textAnchor="middle"
          fontFamily="Fredoka, sans-serif"
          fontWeight={700}
          fontSize={size}
          fill={fg}
        >
          {l}
        </text>
      ))}
    </g>
  );
};

/** Arrow along an SVG path that draws itself on (progress 0..1); the head sits at the path's end. */
const FlowArrow: React.FC<{
  d: string;
  length: number;
  end: { x: number; y: number; angle: number };
  progress: number;
  color: string;
  width?: number;
  opacity?: number;
}> = ({ d, length, end, progress, color, width = 20, opacity = 1 }) => {
  if (progress <= 0) return null;
  const shown = length * Math.min(1, progress);
  const head = progress >= 0.98;
  return (
    <g opacity={opacity}>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={width + 10} strokeLinecap="round" strokeDasharray={`${shown} ${length + 50}`} />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${shown} ${length + 50}`} />
      {head && (
        <g transform={`translate(${end.x} ${end.y}) rotate(${end.angle})`}>
          <path d="M 34 0 L -14 -30 L -14 30 Z" fill={color} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

/** Straight arrow from (x,y) pointing `dir` with the tip exactly at x + dir*len. */
const PushArrow: React.FC<{ x: number; y: number; len: number; dir: 1 | -1; color: string; width: number }> = ({
  x,
  y,
  len,
  dir,
  color,
  width,
}) => {
  if (len < 12) return null;
  const tip = x + dir * len;
  const head = width * 1.5;
  return (
    <g>
      <line x1={x} y1={y} x2={tip - dir * head} y2={y} stroke={C.ink} strokeWidth={width + 10} strokeLinecap="round" />
      <path
        d={`M ${tip} ${y} L ${tip - dir * head * 1.2} ${y - head} L ${tip - dir * head * 1.2} ${y + head} Z`}
        fill={color}
        stroke={C.ink}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <line x1={x} y1={y} x2={tip - dir * head} y2={y} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </g>
  );
};

const dot = (seed: number, x0: number, x1: number, y0: number, y1: number, frame: number, amp: number) => ({
  x: lerp(x0 + 16, x1 - 16, rand(seed * 1.7)) + Math.sin(frame / (11 + rand(seed) * 6) + seed * 7) * amp,
  y: lerp(y0 + 16, y1 - 16, rand(seed * 3.1)) + Math.cos(frame / (10 + rand(seed + 1) * 7) + seed * 3) * amp,
});

export type CutawayProps = {
  frame: number;
  appear: number; // 0..1 labels fade in
  holeCallout: number; // 0..1 pop of the HOLE pointer
  middleGlow: number; // 0..1
  flow: number; // 0..1 arrow travelling cabin -> hole -> gap
  rise: number; // 0..1 second arrow spreading up inside the gap
  fill: number; // 0..1 gap filled with cabin air
  push: number; // 0..1 cabin pressure arrows on the inside of the outer pane
  outsideLow: number; // 0..1 weak outside pressure arrows + label
  outerGlow: number; // 0..1
  children?: React.ReactNode; // drawn in the cabin area (the stickman)
};

export const Cutaway: React.FC<CutawayProps> = ({
  frame,
  appear,
  holeCallout,
  middleGlow,
  flow,
  rise,
  fill,
  push,
  outsideLow,
  outerGlow,
  children,
}) => {
  const { top, bottom, outerX, outerW, middleX, middleW, scratchX, scratchW, scratchTop, scratchBottom, wallL, wallR, holeY, holeH, floorY } = G;

  const cabinDots = Array.from({ length: 46 }).map((_, i) => dot(i + 1, wallR, 1080, 420, floorY - 10, frame, 12));
  const backDots = Array.from({ length: 16 }).map((_, i) => dot(i + 200, middleX + middleW, wallR, top, bottom, frame, 7));
  const outsideDots = Array.from({ length: 6 }).map((_, i) => dot(i + 400, 0, wallL, 420, floorY, frame, 16));
  const gapDots = Array.from({ length: 30 }).map((_, i) => {
    const enter = (i / 30) * 0.85;
    const t = Math.max(0, Math.min(1, (fill - enter) / 0.15));
    if (t <= 0) return null;
    const target = dot(i + 600, gapL, gapR, top, bottom, frame, 7);
    const e = 1 - Math.pow(1 - t, 3);
    return { x: lerp(gapR - 20, target.x, e), y: lerp(holeY, target.y, e) };
  });

  // Flow path: from the cabin, under the scratch cover, through the hole, ending inside the gap.
  const flowPath = `M 850 1128 H 740 C 650 1128 660 ${holeY} 600 ${holeY} H 462`;
  const risePath = `M 500 ${holeY - 34} C 490 940 500 860 500 700`;
  const outerHot = outerGlow > 0.5;
  const middleHot = middleGlow > 0.5;
  const pulse = 0.75 + 0.25 * Math.sin(frame / 4);

  return (
    <g>
      <defs>
        <linearGradient id="cut-out" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1a3d" />
          <stop offset="1" stopColor="#1d3a75" />
        </linearGradient>
        <linearGradient id="cut-cabin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fdebd0" />
          <stop offset="1" stopColor="#f8dcae" />
        </linearGradient>
        <pattern id="cut-wall" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="36" height="36" fill="#8b95a7" />
          <rect width="18" height="36" fill="#7f899c" />
        </pattern>
      </defs>

      {/* outside (left) and cabin (right) */}
      <rect x={0} y={0} width={wallL + 40} height={1920} fill="url(#cut-out)" />
      <rect x={wallL + 40} y={0} width={1080 - wallL - 40} height={1920} fill="url(#cut-cabin)" />
      {/* cabin floor */}
      <rect x={wallR} y={floorY} width={1080 - wallR} height={1920 - floorY} fill="#3d4a66" />
      <rect x={wallR} y={floorY} width={1080 - wallR} height={14} fill="#2a3346" />

      {/* the gap between outer and middle pane: outside-dark until cabin air fills it */}
      <rect x={gapL} y={top} width={gapR - gapL} height={bottom - top} fill="#22335c" />
      <rect x={gapL} y={top} width={gapR - gapL} height={bottom - top} fill="#f8dcae" opacity={fill} />

      {/* fuselage wall above and below the window */}
      <rect x={wallL} y={0} width={wallR - wallL} height={top} fill="url(#cut-wall)" stroke={C.ink} strokeWidth={6} />
      <rect x={wallL} y={bottom} width={wallR - wallL} height={1920 - bottom} fill="url(#cut-wall)" stroke={C.ink} strokeWidth={6} />

      {/* air */}
      {outsideDots.map((p, i) => (
        <circle key={`o${i}`} cx={p.x} cy={p.y} r={10} fill={C.outside} opacity={0.6} />
      ))}
      {cabinDots.map((p, i) => (
        <circle key={`c${i}`} cx={p.x} cy={p.y} r={10} fill={C.cabinAir} opacity={0.6} />
      ))}
      {backDots.map((p, i) => (
        <circle key={`b${i}`} cx={p.x} cy={p.y} r={9} fill={C.cabinAir} opacity={0.6} />
      ))}
      {gapDots.map((p, i) => (p ? <circle key={`g${i}`} cx={p.x} cy={p.y} r={9} fill={C.cabinAir} opacity={0.75} /> : null))}

      {children}

      {/* outer pane */}
      {outerHot && (
        <rect x={outerX - 14} y={top - 6} width={outerW + 28} height={bottom - top + 12} rx={16} fill={C.yellow} opacity={0.55 * pulse} />
      )}
      <rect x={outerX} y={top} width={outerW} height={bottom - top} fill={C.glass} stroke={outerHot ? C.yellow : C.ink} strokeWidth={outerHot ? 9 : 6} />
      <rect x={outerX + 12} y={top + 20} width={10} height={bottom - top - 40} rx={5} fill="white" opacity={0.55} />

      {/* middle pane with the hole */}
      {middleHot && (
        <rect x={middleX - 12} y={top - 6} width={middleW + 24} height={bottom - top + 12} rx={14} fill={C.yellow} opacity={0.5 * pulse} />
      )}
      <rect x={middleX} y={top} width={middleW} height={holeY - holeH / 2 - top} fill={C.glass} stroke={middleHot ? C.yellow : C.ink} strokeWidth={middleHot ? 8 : 6} />
      <rect x={middleX} y={holeY + holeH / 2} width={middleW} height={bottom - holeY - holeH / 2} fill={C.glass} stroke={middleHot ? C.yellow : C.ink} strokeWidth={middleHot ? 8 : 6} />

      {/* scratch cover: thin, not sealed (air gets around it) */}
      <rect x={scratchX} y={scratchTop} width={scratchW} height={scratchBottom - scratchTop} rx={7} fill="#e6f7ff" stroke={C.ink} strokeWidth={5} />

      {/* cabin air through the hole; both arrows end inside the gap */}
      <FlowArrow d={flowPath} length={470} end={{ x: 462, y: holeY, angle: 180 }} progress={flow} color={C.cabin} opacity={push > 0.5 ? 0.45 : 1} />
      <FlowArrow d={risePath} length={300} end={{ x: 500, y: 700, angle: -90 }} progress={rise} color={C.cabin} width={16} opacity={push > 0.5 ? 0.45 : 1} />

      {/* cabin pressure pushing on the inside face of the outer pane (tips stop at the pane) */}
      {[560, 700, 840].map((y, i) => (
        <PushArrow key={`p${i}`} x={455} y={y} len={(455 - gapL - 6) * push} dir={-1} color="#ff5a4e" width={22} />
      ))}
      {/* weak outside pressure on the other face */}
      {[630, 770].map((y, i) => (
        <PushArrow key={`q${i}`} x={196} y={y} len={(outerX - 196 - 8) * outsideLow} dir={1} color={C.outside} width={10} />
      ))}

      {/* hole pointer */}
      {holeCallout > 0 && (
        <g transform={`translate(425 1100) scale(${holeCallout}) translate(-425 -1100)`}>
          <line x1={470} y1={1078} x2={524} y2={holeY + 12} stroke={C.ink} strokeWidth={16} strokeLinecap="round" />
          <line x1={470} y1={1078} x2={524} y2={holeY + 12} stroke={C.yellow} strokeWidth={8} strokeLinecap="round" />
          <path d={`M 536 ${holeY + 4} L 500 ${holeY + 8} L 520 ${holeY + 38} Z`} fill={C.yellow} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
          <rect x={352} y={1070} width={146} height={64} rx={20} fill={C.yellow} stroke={C.ink} strokeWidth={6} />
          <text x={425} y={1117} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={42} fill={C.ink}>
            HOLE
          </text>
        </g>
      )}

      {/* labels, left to right */}
      <g opacity={appear}>
        <Label x={300} y={150} lines={["OUTER", "PANE"]} leaderTo={top + 6} glow={outerGlow} />
        <Label x={709} y={150} lines={["SCRATCH", "COVER"]} leaderTo={scratchTop + 6} />
        <Label x={125} y={320} lines={["OUTSIDE"]} bg={C.outside} />
        <Label x={560} y={320} lines={["MIDDLE", "PANE"]} leaderTo={top + 6} glow={middleGlow} />
        <Label x={905} y={320} lines={["CABIN"]} bg={C.cabin} />
      </g>
      {outsideLow > 0.02 && (
        <g opacity={Math.min(1, outsideLow * 2)}>
          <Label x={125} y={930} lines={["LOWER", "PRESSURE"]} bg={C.ink} fg="white" />
        </g>
      )}
    </g>
  );
};
