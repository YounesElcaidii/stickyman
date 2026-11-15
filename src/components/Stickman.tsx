import React from "react";

/**
 * Reusable stickman with a round, expressive face.
 * Origin (0,0) is the hip. All limb angles are absolute, in degrees:
 * 0 = straight down, 90 = pointing forward (+x), -90 = pointing backward, 180 = up.
 */

export type Expression = "neutral" | "happy" | "surprised" | "curious" | "thinking" | "grin";

export type Pose = {
  armL: [number, number]; // [upper, lower] — the arm drawn behind the body
  armR: [number, number]; // the arm drawn in front
  legL: [number, number];
  legR: [number, number];
  lean: number; // torso tilt in degrees (positive = forward)
  headTilt: number;
};

export const POSES = {
  stand: { armL: [-12, -6], armR: [12, 6], legL: [-10, -6], legR: [10, 6], lean: 0, headTilt: 0 },
  sit: { armL: [20, 75], armR: [28, 85], legL: [86, 4], legR: [92, 8], lean: -4, headTilt: 0 },
  sitPoint: { armL: [20, 75], armR: [130, 150], legL: [86, 4], legR: [92, 8], lean: 2, headTilt: -8 },
  wave: { armL: [-12, -6], armR: [150, 200], legL: [-10, -6], legR: [10, 6], lean: 0, headTilt: 6 },
  point: { armL: [-12, -6], armR: [100, 110], legL: [-10, -6], legR: [10, 6], lean: 3, headTilt: 0 },
  thumbsUp: { armL: [-12, -6], armR: [50, 160], legL: [-10, -6], legR: [10, 6], lean: 0, headTilt: 8 },
  shrug: { armL: [-60, 30], armR: [60, -30], legL: [-10, -6], legR: [10, 6], lean: 0, headTilt: -6 },
} satisfies Record<string, Pose>;

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number) => x + (y - x) * t;
  const mm = (x: [number, number], y: [number, number]): [number, number] => [m(x[0], y[0]), m(x[1], y[1])];
  return {
    armL: mm(a.armL, b.armL),
    armR: mm(a.armR, b.armR),
    legL: mm(a.legL, b.legL),
    legR: mm(a.legR, b.legR),
    lean: m(a.lean, b.lean),
    headTilt: m(a.headTilt, b.headTilt),
  };
};

const INK = "#1f2430";
const rad = (d: number) => (d * Math.PI) / 180;
const step = (x: number, y: number, angle: number, len: number) => ({
  x: x + Math.sin(rad(angle)) * len,
  y: y + Math.cos(rad(angle)) * len,
});

type FaceProps = {
  expression: Expression;
  lookX: number; // -1..1
  lookY: number; // -1..1
  turn: number; // -1..1 shifts features to fake a head turn
  blink: number; // 0 open, 1 closed
  talk: number; // 0..1 mouth openness
  r: number;
  color: string;
};

export const Face: React.FC<FaceProps> = ({ expression, lookX, lookY, turn, blink, talk, r, color }) => {
  const s = r / 62;
  const fx = turn * 14 * s;
  const big = expression === "surprised";
  const eyeRx = (big ? 17 : 14) * s;
  const eyeRy = (big ? 21 : 17) * s * Math.max(0.08, 1 - blink);
  const eyeY = -8 * s;
  const gap = 23 * s;
  const px = lookX * 6 * s;
  const py = lookY * 7 * s;

  const brow = (side: -1 | 1) => {
    const x = fx + side * gap;
    let lift = 0;
    let tilt = 0;
    if (expression === "surprised") lift = 12;
    if (expression === "curious") lift = side === 1 ? 12 : 0;
    if (expression === "thinking") tilt = side * 6;
    if (expression === "happy" || expression === "grin") lift = 4;
    const y = eyeY - 30 * s - lift * s;
    return (
      <path
        d={`M ${x - 13 * s} ${y + tilt * s} Q ${x} ${y - 7 * s} ${x + 13 * s} ${y - tilt * s}`}
        stroke={INK}
        strokeWidth={6 * s}
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  let mouth: React.ReactNode;
  const my = 26 * s;
  const mx = fx * 1.1;
  if (expression === "surprised") {
    mouth = <ellipse cx={mx} cy={my + 4 * s} rx={10 * s} ry={(13 + talk * 4) * s} fill={INK} />;
  } else if (expression === "happy" || expression === "grin") {
    const open = expression === "grin" ? 14 : 6 + talk * 10;
    mouth = (
      <path
        d={`M ${mx - 22 * s} ${my - 4 * s} Q ${mx} ${my + (open + 8) * s} ${mx + 22 * s} ${my - 4 * s} Z`}
        fill={INK}
        stroke={INK}
        strokeWidth={4 * s}
        strokeLinejoin="round"
      />
    );
  } else if (expression === "curious") {
    mouth = (
      <path
        d={`M ${mx - 12 * s} ${my + 4 * s} Q ${mx + 4 * s} ${my + (2 + talk * 10) * s} ${mx + 16 * s} ${my - 4 * s}`}
        stroke={INK}
        strokeWidth={6 * s}
        fill="none"
        strokeLinecap="round"
      />
    );
  } else if (expression === "thinking") {
    mouth = (
      <path
        d={`M ${mx - 14 * s} ${my + 2 * s} q ${7 * s} ${-6 * s} ${14 * s} 0 t ${14 * s} 0`}
        stroke={INK}
        strokeWidth={6 * s}
        fill="none"
        strokeLinecap="round"
      />
    );
  } else {
    mouth =
      talk > 0.15 ? (
        <ellipse cx={mx} cy={my + 2 * s} rx={12 * s} ry={(3 + talk * 9) * s} fill={INK} />
      ) : (
        <path d={`M ${mx - 13 * s} ${my} Q ${mx} ${my + 6 * s} ${mx + 13 * s} ${my}`} stroke={INK} strokeWidth={6 * s} fill="none" strokeLinecap="round" />
      );
  }

  return (
    <g>
      <circle r={r} fill={color} stroke={INK} strokeWidth={10 * s} />
      {/* cheeks */}
      <ellipse cx={fx - 40 * s} cy={14 * s} rx={11 * s} ry={7 * s} fill="#ff8fa3" opacity={0.55} />
      <ellipse cx={fx + 40 * s} cy={14 * s} rx={11 * s} ry={7 * s} fill="#ff8fa3" opacity={0.55} />
      {([-1, 1] as const).map((side) => (
        <g key={side}>
          <ellipse cx={fx + side * gap} cy={eyeY} rx={eyeRx} ry={eyeRy} fill="white" stroke={INK} strokeWidth={4 * s} />
          {blink < 0.6 && (
            <>
              <circle cx={fx + side * gap + px} cy={eyeY + py} r={(big ? 7 : 8) * s} fill={INK} />
              <circle cx={fx + side * gap + px + 3 * s} cy={eyeY + py - 3 * s} r={2.6 * s} fill="white" />
            </>
          )}
        </g>
      ))}
      {brow(-1)}
      {brow(1)}
      {mouth}
    </g>
  );
};

export type StickmanProps = {
  x: number;
  y: number;
  scale?: number;
  pose?: Pose;
  expression?: Expression;
  lookX?: number;
  lookY?: number;
  turn?: number;
  blink?: number;
  talk?: number;
  flip?: boolean;
  faceColor?: string;
  shirt?: string;
  thumb?: boolean; // draws a thumbs-up on the front hand
};

export const Stickman: React.FC<StickmanProps> = ({
  x,
  y,
  scale = 1,
  pose = POSES.stand,
  expression = "neutral",
  lookX = 0,
  lookY = 0,
  turn = 0,
  blink = 0,
  talk = 0,
  flip = false,
  faceColor = "#fff4e0",
  shirt,
  thumb = false,
}) => {
  const sw = 14;
  const hip = { x: 0, y: 0 };
  const shoulder = step(hip.x, hip.y, 180 + pose.lean, 160);
  const neck = step(hip.x, hip.y, 180 + pose.lean, 176);
  const head = step(hip.x, hip.y, 180 + pose.lean + pose.headTilt * 0.3, 232);

  const limb = (from: { x: number; y: number }, [a, b]: [number, number], l1: number, l2: number) => {
    const mid = step(from.x, from.y, a, l1);
    const end = step(mid.x, mid.y, b, l2);
    return { mid, end, d: `M ${from.x} ${from.y} L ${mid.x} ${mid.y} L ${end.x} ${end.y}` };
  };

  const armL = limb(shoulder, pose.armL, 80, 74);
  const armR = limb(shoulder, pose.armR, 80, 74);
  const legL = limb(hip, pose.legL, 92, 92);
  const legR = limb(hip, pose.legR, 92, 92);
  const line = (d: string, color = INK) => (
    <path d={d} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      {line(armL.d, "#3a4152")}
      {line(legL.d, "#3a4152")}
      {line(`M ${hip.x} ${hip.y} L ${neck.x} ${neck.y}`)}
      {shirt && (
        <path
          d={`M ${hip.x} ${hip.y - 6} L ${shoulder.x} ${shoulder.y + 4}`}
          stroke={shirt}
          strokeWidth={26}
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {line(legR.d)}
      {line(armR.d)}
      {thumb ? (
        <g transform={`translate(${armR.end.x} ${armR.end.y})`}>
          <rect x={-16} y={-14} width={32} height={30} rx={10} fill={faceColor} stroke={INK} strokeWidth={6} />
          <rect x={-8} y={-44} width={15} height={36} rx={7} fill={faceColor} stroke={INK} strokeWidth={6} />
        </g>
      ) : (
        <circle cx={armR.end.x} cy={armR.end.y} r={9} fill={INK} />
      )}
      <g transform={`translate(${head.x} ${head.y}) rotate(${pose.headTilt}) ${flip ? "scale(-1 1)" : ""}`}>
        <Face
          expression={expression}
          lookX={flip ? -lookX : lookX}
          lookY={lookY}
          turn={flip ? -turn : turn}
          blink={blink}
          talk={talk}
          r={62}
          color={faceColor}
        />
      </g>
    </g>
  );
};

/** Natural blink: returns 0..1 closure for the given frame. */
export const blinkAt = (frame: number, offset = 0) => {
  const t = (frame + offset) % 84;
  return t < 3 ? [0.5, 1, 0.5][t] : 0;
};
