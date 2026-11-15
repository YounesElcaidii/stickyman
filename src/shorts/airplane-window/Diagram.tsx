import React from "react";
import { lerp, rand } from "../../lib/anim";

/** Blueprint-style diagrams of the three-pane window. */

export const Blueprint: React.FC = () => (
  <g>
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="#13244a" />
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1f3a6e" strokeWidth={2} />
      </pattern>
      <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
        <stop offset="0.6" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.45} />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#grid)" />
    <rect width={1080} height={1920} fill="url(#vignette)" />
  </g>
);

export const Tag: React.FC<{
  x: number;
  y: number;
  text: string;
  color?: string;
  textColor?: string;
  size?: number;
  scale?: number;
}> = ({ x, y, text, color = "#ffd23f", textColor = "#13244a", size = 44, scale = 1 }) => {
  const w = text.length * size * 0.6 + size * 1.2;
  const h = size * 1.6;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={Math.min(1, scale * 1.5)}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color} stroke="#0b1530" strokeWidth={5} />
      <text
        x={0}
        y={size * 0.36}
        textAnchor="middle"
        fontFamily="Fredoka, sans-serif"
        fontWeight={700}
        fontSize={size}
        fill={textColor}
      >
        {text}
      </text>
    </g>
  );
};

const paneShape = (w: number, h: number) => {
  const r = w * 0.46;
  return `M ${-w / 2 + r} ${-h / 2} H ${w / 2 - r} A ${r} ${r} 0 0 1 ${w / 2} ${-h / 2 + r} V ${h / 2 - r} A ${r} ${r} 0 0 1 ${w / 2 - r} ${h / 2} H ${-w / 2 + r} A ${r} ${r} 0 0 1 ${-w / 2} ${h / 2 - r} V ${-h / 2 + r} A ${r} ${r} 0 0 1 ${-w / 2 + r} ${-h / 2} Z`;
};

export type PaneId = "outer" | "middle" | "inner";

/**
 * Three panes in 3/4 perspective. `spread` 0 = stacked, 1 = exploded.
 * `focus` dims the other panes.
 */
export const ExplodedPanes: React.FC<{
  spread: number;
  focus?: PaneId | null;
  holeGlow?: number;
  frame: number;
}> = ({ spread, focus = null, holeGlow = 0, frame }) => {
  const panes: { id: PaneId; dx: number; dy: number; fill: string; stroke: string; sw: number }[] = [
    { id: "outer", dx: -270, dy: -170, fill: "#7fd3ff", stroke: "#d8f3ff", sw: 12 },
    { id: "middle", dx: 0, dy: 0, fill: "#7fd3ff", stroke: "#d8f3ff", sw: 10 },
    { id: "inner", dx: 270, dy: 170, fill: "#c4ecff", stroke: "#ffffff", sw: 6 },
  ];
  const cx = 540;
  const cy = 700;
  const W = 420;
  const H = 560;
  return (
    <g>
      {panes.map((p) => {
        const x = cx + p.dx * spread;
        const y = cy + p.dy * spread;
        const dim = focus && focus !== p.id ? 0.25 : 1;
        return (
          <g key={p.id} transform={`translate(${x} ${y}) skewY(-18) scale(0.68 1)`} opacity={dim}>
            {/* thickness edge */}
            <path d={paneShape(W, H)} transform="translate(-18 6)" fill="#0d4a73" opacity={0.9} />
            <path d={paneShape(W, H)} fill={p.fill} fillOpacity={0.4} stroke={p.stroke} strokeWidth={p.sw} />
            <path d={`M ${-W * 0.3} ${-H * 0.3} L ${-W * 0.05} ${-H * 0.36} L ${-W * 0.32} ${H * 0.05} Z`} fill="white" opacity={0.25} />
            {p.id === "middle" && (
              <g>
                {holeGlow > 0 && (
                  <circle cx={0} cy={H * 0.36} r={30 + 10 * Math.sin(frame / 3)} fill="#ffd23f" opacity={0.35 * holeGlow} />
                )}
                <circle cx={0} cy={H * 0.36} r={13} fill="#13244a" stroke="#ffd23f" strokeWidth={holeGlow > 0 ? 6 : 0} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

/** Anchor points for labelling the exploded panes. */
export const PANE_POS: Record<PaneId, { x: number; y: number }> = {
  outer: { x: 540 - 270, y: 700 - 170 },
  middle: { x: 540, y: 700 },
  inner: { x: 540 + 270, y: 700 + 170 },
};
export const MIDDLE_HOLE = { x: 540, y: 700 + 560 * 0.36 };

// ---------------------------------------------------------------------------
// Cross-section (side view) used for the pressure explanation.

export const XS = {
  outerX: 230,
  outerW: 44,
  middleX: 470,
  middleW: 30,
  innerX: 690,
  innerW: 14,
  top: 420,
  bottom: 1080,
  holeY: 960,
  holeH: 34,
};

type Particle = { x: number; y: number };

const wiggle = (seed: number, frame: number, amp: number) => ({
  x: Math.sin(frame / (9 + rand(seed) * 6) + seed * 7) * amp,
  y: Math.cos(frame / (8 + rand(seed + 1) * 7) + seed * 3) * amp,
});

const box = (seed: number, x0: number, x1: number, y0: number, y1: number, frame: number, amp = 14): Particle => {
  const w = wiggle(seed, frame, amp);
  return {
    x: lerp(x0 + 14, x1 - 14, rand(seed * 1.7)) + w.x,
    y: lerp(y0 + 14, y1 - 14, rand(seed * 3.1)) + w.y,
  };
};

const Arrow: React.FC<{ x: number; y: number; len: number; dir: 1 | -1; color: string; thick?: number }> = ({
  x,
  y,
  len,
  dir,
  color,
  thick = 18,
}) => {
  if (len < 4) return null;
  const hx = x + dir * len;
  const head = Math.min(44, len * 0.6);
  return (
    <g>
      <line x1={x} y1={y} x2={hx - dir * head * 0.6} y2={y} stroke={color} strokeWidth={thick} strokeLinecap="round" />
      <path d={`M ${hx} ${y} L ${hx - dir * head} ${y - head * 0.7} L ${hx - dir * head} ${y + head * 0.7} Z`} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={6} />
    </g>
  );
};

/**
 * Side-view cross-section: outside (left) | outer pane | gap | middle pane (hole) | gap | inner pane | cabin (right).
 * fill: 0..1 how much cabin air has flowed into the outer gap.
 * load: 0..1 strength of the pressure arrows on the outer pane.
 */
export const CrossSection: React.FC<{
  frame: number;
  fill: number;
  load: number;
  balance?: number;
  highlight?: PaneId | null;
  backup?: number;
  crack?: number;
  labels?: boolean;
}> = ({ frame, fill, load, balance = 0, highlight = null, backup = 0, crack = 0, labels = true }) => {
  const { outerX, outerW, middleX, middleW, innerX, innerW, top, bottom, holeY, holeH } = XS;
  const bow = 26 * load;
  const cabinParticles = Array.from({ length: 64 }).map((_, i) => box(i + 1, innerX + innerW + 10, 1070, top - 40, bottom + 40, frame));
  const innerGap = Array.from({ length: 12 }).map((_, i) => box(i + 200, middleX + middleW, innerX, top, bottom, frame, 8));
  const outsideParticles = Array.from({ length: 9 }).map((_, i) => box(i + 400, 10, outerX - 30, top - 200, bottom + 200, frame, 20));
  const gapCount = 26;
  const gapParticles = Array.from({ length: gapCount }).map((_, i) => {
    // Each particle enters through the hole at its own time, then drifts to a resting spot.
    const enter = (i / gapCount) * 0.8;
    const t = Math.max(0, Math.min(1, (fill - enter) / 0.2));
    if (t <= 0) return null;
    const target = box(i + 600, outerX + outerW + 8, middleX, top, bottom, frame, 8);
    const holePt = { x: middleX + middleW / 2, y: holeY };
    if (t < 0.35) {
      const k = t / 0.35;
      return { x: lerp(middleX + middleW + 40, holePt.x, k), y: holeY + Math.sin(i) * 6 };
    }
    const k = (t - 0.35) / 0.65;
    const e = 1 - Math.pow(1 - k, 3);
    return { x: lerp(holePt.x, target.x, e), y: lerp(holePt.y, target.y, e) };
  });

  const paneGlow = (id: PaneId) => (highlight === id ? "#ffd23f" : "#d8f3ff");
  const outerPath = `M ${outerX} ${top} Q ${outerX - bow * 2} ${(top + bottom) / 2} ${outerX} ${bottom} L ${outerX + outerW} ${bottom} Q ${outerX + outerW - bow * 2} ${(top + bottom) / 2} ${outerX + outerW} ${top} Z`;

  return (
    <g>
      {/* outside: cold, thin air */}
      <defs>
        <linearGradient id="xs-out" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a1633" />
          <stop offset="1" stopColor="#1a3366" />
        </linearGradient>
        <linearGradient id="xs-cabin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fbe7c6" />
          <stop offset="1" stopColor="#f6d39a" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={outerX} height={1920} fill="url(#xs-out)" />
      <rect x={outerX} y={0} width={1080 - outerX} height={1920} fill="url(#xs-cabin)" />
      {/* the sealed outer gap gets cabin-coloured as it fills */}
      <rect x={outerX + outerW} y={top} width={middleX - outerX - outerW} height={bottom - top} fill="#16325f" />
      <rect x={outerX + outerW} y={top} width={middleX - outerX - outerW} height={bottom - top} fill="#f6d39a" opacity={fill * 0.9} />

      {/* fuselage frame / seals */}
      <rect x={outerX - 20} y={top - 70} width={innerX + innerW - outerX + 40} height={70} rx={10} fill="#8e99ab" stroke="#4a5568" strokeWidth={5} />
      <rect x={outerX - 20} y={bottom} width={innerX + innerW - outerX + 40} height={70} rx={10} fill="#8e99ab" stroke="#4a5568" strokeWidth={5} />

      {outsideParticles.map((p, i) => (
        <circle key={`o${i}`} cx={p.x} cy={p.y} r={11} fill="#7fb2ff" opacity={0.55} />
      ))}
      {cabinParticles.map((p, i) => (
        <circle key={`c${i}`} cx={p.x} cy={p.y} r={11} fill="#e8833a" opacity={0.85} />
      ))}
      {innerGap.map((p, i) => (
        <circle key={`g${i}`} cx={p.x} cy={p.y} r={9} fill="#e8833a" opacity={0.85} />
      ))}
      {gapParticles.map((p, i) => (p ? <circle key={`f${i}`} cx={p.x} cy={p.y} r={10} fill="#e8833a" /> : null))}

      {/* panes */}
      <path d={outerPath} fill="#7fd3ff" fillOpacity={0.55} stroke={paneGlow("outer")} strokeWidth={highlight === "outer" ? 10 : 6} />
      {crack > 0 && (
        <path
          d={`M ${outerX + 22} ${top + 160} l -18 60 l 22 40 l -20 70 l 18 50`}
          stroke="white"
          strokeWidth={6}
          fill="none"
          opacity={crack}
          strokeLinecap="round"
        />
      )}
      {/* middle pane with hole */}
      <rect x={middleX} y={top} width={middleW} height={holeY - holeH / 2 - top} fill="#7fd3ff" fillOpacity={0.55} stroke={paneGlow("middle")} strokeWidth={highlight === "middle" ? 9 : 5} />
      <rect x={middleX} y={holeY + holeH / 2} width={middleW} height={bottom - holeY - holeH / 2} fill="#7fd3ff" fillOpacity={0.55} stroke={paneGlow("middle")} strokeWidth={highlight === "middle" ? 9 : 5} />
      {backup > 0 && (
        <rect x={middleX - 14} y={top - 10} width={middleW + 28} height={bottom - top + 20} rx={18} fill="none" stroke="#3ddc84" strokeWidth={10} opacity={backup * (0.7 + 0.3 * Math.sin(frame / 4))} />
      )}
      {/* inner scratch pane: not sealed, air flows around it */}
      <rect x={innerX} y={top + 40} width={innerW} height={bottom - top - 80} rx={6} fill="#c4ecff" fillOpacity={0.7} stroke="white" strokeWidth={4} />

      {labels && (
        <g fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={34} textAnchor="middle">
          {[
            { x: outerX + outerW / 2, t: "OUTER", c: highlight === "outer" ? "#ffd23f" : "#ffffff" },
            { x: middleX + middleW / 2, t: "MIDDLE", c: highlight === "middle" ? "#ffd23f" : "#ffffff" },
            { x: innerX + innerW / 2, t: "INNER", c: "#ffffff" },
          ].map((l) => (
            <text key={l.t} x={l.x} y={bottom + 125} fill={l.c} stroke="#11131a" strokeWidth={10} paintOrder="stroke" >
              {l.t}
            </text>
          ))}
        </g>
      )}
      {/* pressure arrows on the outer pane */}
      {[0.18, 0.38, 0.58, 0.78].map((k, i) => (
        <Arrow key={i} x={outerX - 6} y={lerp(top, bottom, k)} len={150 * load} dir={-1} color="#ff5a4e" thick={22} />
      ))}
      {/* balanced arrows on the middle pane */}
      {balance > 0 &&
        [0.25, 0.55].map((k, i) => (
          <g key={i} opacity={balance}>
            <Arrow x={middleX - 4} y={lerp(top, bottom, k)} len={60} dir={-1} color="#3ddc84" thick={12} />
            <Arrow x={middleX + middleW + 4} y={lerp(top, bottom, k)} len={60} dir={1} color="#3ddc84" thick={12} />
          </g>
        ))}
    </g>
  );
};

/** Side view of an original, cartoon airliner flying above the clouds. */
export const PlaneFlying: React.FC<{ frame: number }> = ({ frame }) => {
  const bob = Math.sin(frame / 10) * 8;
  return (
    <g>
      <defs>
        <linearGradient id="hi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d2b66" />
          <stop offset="0.55" stopColor="#2f6fd6" />
          <stop offset="1" stopColor="#9dd0ff" />
        </linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#hi-sky)" />
      {Array.from({ length: 30 }).map((_, i) => (
        <circle key={i} cx={rand(i) * 1080} cy={rand(i + 30) * 500} r={2 + rand(i + 60) * 2} fill="white" opacity={0.5} />
      ))}
      {/* cloud sea */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = ((i * 170 - frame * 14) % 1530 + 1530) % 1530 - 220;
        return <ellipse key={i} cx={x} cy={1180 + (i % 3) * 30} rx={190} ry={70} fill="white" opacity={0.95} />;
      })}
      <rect x={0} y={1210} width={1080} height={710} fill="white" />
      <g transform={`translate(540 ${740 + bob}) rotate(-4)`}>
        {/* tail */}
        <path d="M -330 -20 L -400 -190 L -330 -190 L -230 -30 Z" fill="#e94f37" stroke="#1f2430" strokeWidth={8} strokeLinejoin="round" />
        {/* body */}
        <path d="M -380 -40 Q -380 -70 -300 -72 L 280 -72 Q 400 -70 420 0 Q 400 60 280 62 L -300 62 Q -360 60 -380 20 Z" fill="#f7f9fc" stroke="#1f2430" strokeWidth={8} />
        <rect x={-300} y={14} width={590} height={16} fill="#2f6fd6" />
        {/* cockpit */}
        <path d="M 330 -46 Q 380 -40 396 -12 L 340 -12 Z" fill="#1f2430" />
        {/* windows */}
        {Array.from({ length: 11 }).map((_, i) => (
          <rect key={i} x={-250 + i * 50} y={-38} width={22} height={30} rx={11} fill="#2a3b5c" />
        ))}
        {/* wing */}
        <path d="M -40 30 L -170 200 L -110 200 L 110 40 Z" fill="#d9dee7" stroke="#1f2430" strokeWidth={8} strokeLinejoin="round" />
        <ellipse cx={-30} cy={120} rx={60} ry={26} fill="#b7c0cf" stroke="#1f2430" strokeWidth={7} />
      </g>
      {/* speed lines */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = 1080 - ((frame * 40 + i * 230) % 1400);
        return <line key={i} x1={x} y1={560 + i * 70} x2={x + 140} y2={560 + i * 70} stroke="white" strokeWidth={6} opacity={0.4} strokeLinecap="round" />;
      })}
    </g>
  );
};
