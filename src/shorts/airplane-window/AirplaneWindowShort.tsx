import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "@fontsource/fredoka/700.css";
import { Canvas, Sfx, Shot } from "../../components/Shot";
import { Captions } from "../../components/Captions";
import { Stickman, POSES, blinkAt, mixPose } from "../../components/Stickman";
import { pop, ramp, settle, shake } from "../../lib/anim";
import { sceneRanges, type Timing } from "../../lib/timing";
import { CabinWide, WindowPOV, POV_HOLE } from "./Cabin";
import { Blueprint, CrossSection, ExplodedPanes, MIDDLE_HOLE, PANE_POS, PlaneFlying, Tag, XS } from "./Diagram";

export const SHORT_ID = "airplane-window";

const HIGHLIGHT = [
  "tiny", "hole", "three", "panes", "middle", "outer", "pressurized", "thin",
  "gap", "pressure", "difference", "backup", "moisture", "clear",
];

/** Splits a scene into quick cuts at the given fractions of its length. */
const cuts = (duration: number, fractions: number[]) => {
  const points = [0, ...fractions.map((f) => Math.round(duration * f)), duration];
  return points.slice(0, -1).map((from, i) => ({ from, duration: points[i + 1] - from }));
};

// --- Scene 1: passenger notices the hole -------------------------------------------------

const PassengerWide: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const turn = ramp(f, 8, 16);
  const q = pop(f, fps, 18);
  const lean = ramp(f, 16, 28);
  const pose = mixPose(POSES.sit, { ...POSES.sit, lean: 6, headTilt: -10 }, lean);
  return (
    <Canvas>
      <CabinWide
        frame={f}
        passenger={
          <Stickman
            x={540}
            y={1160}
            scale={1.1}
            pose={pose}
            shirt="#ff7a59"
            expression={f < 18 ? "neutral" : "curious"}
            lookX={-0.6 + turn * 1.5}
            lookY={-0.9 * turn}
            turn={turn * 0.6}
            blink={blinkAt(f, 30)}
          />
        }
      />
      <g transform={`translate(620 720) scale(${q})`}>
        <circle r={58} fill="white" stroke="#1f2430" strokeWidth={8} />
        <text y={30} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={90} fill="#ff5a4e">
          ?
        </text>
      </g>
      <Sfx at={18} name="pop" />
      <TitleBanner frame={f} duration={duration} />
    </Canvas>
  );
};

const TitleBanner: React.FC<{ frame: number; duration: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 2);
  return (
    <g transform={`translate(540 200) scale(${p}) rotate(-3)`}>
      <rect x={-470} y={-80} width={940} height={150} rx={30} fill="#ffd23f" stroke="#11131a" strokeWidth={10} />
      <text y={28} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={84} fill="#11131a">
        WHY THE TINY HOLE?
      </text>
    </g>
  );
};

const HoleCloseup: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = 1 + 0.9 * ramp(f, 4, duration);
  const ring = pop(f, fps, 6);
  const hx = POV_HOLE.x;
  const hy = POV_HOLE.y;
  return (
    <Canvas>
      <g transform={`translate(${hx} ${hy}) scale(${zoom}) translate(${-hx} ${-hy})`}>
        <WindowPOV frame={f} />
        <circle cx={hx} cy={hy} r={44 * ring} fill="none" stroke="#ff5a4e" strokeWidth={10 / zoom + 4} />
      </g>
      <g opacity={ring}>
        <path d={`M ${hx + 260} ${hy - 330} Q ${hx + 200} ${hy - 120} ${hx + 70} ${hy - 50}`} stroke="#ff5a4e" strokeWidth={16} fill="none" strokeLinecap="round" />
        <path d={`M ${hx + 50} ${hy - 40} l 52 -6 l -22 -42 Z`} fill="#ff5a4e" stroke="#ff5a4e" strokeWidth={10} strokeLinejoin="round" />
      </g>
      <Sfx at={6} name="ding" volume={0.3} />
    </Canvas>
  );
};

// --- Scene 2: three panes ------------------------------------------------------------------

const PanesScene: React.FC<{ duration: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spread = settle(f, fps, 2);
  const tags: { id: "outer" | "middle" | "inner"; label: string; at: number; dx: number; dy: number }[] = [
    { id: "outer", label: "OUTER", at: 10, dx: -10, dy: -360 },
    { id: "middle", label: "MIDDLE", at: 22, dx: 0, dy: -360 },
    { id: "inner", label: "INNER", at: 34, dx: 10, dy: -360 },
  ];
  return (
    <Canvas>
      <Blueprint />
      <ExplodedPanes spread={spread} frame={f} />
      {tags.map((t, i) => {
        const p = pop(f, fps, t.at);
        const pos = PANE_POS[t.id];
        return (
          <g key={t.id}>
            <Tag x={pos.x + t.dx} y={pos.y + t.dy} text={`${i + 1}  ${t.label}`} scale={p} size={40} />
            <Sfx at={t.at} name="pop" volume={0.3} />
          </g>
        );
      })}
      <SideLabels frame={f} />
    </Canvas>
  );
};

const SideLabels: React.FC<{ frame: number }> = ({ frame }) => {
  const o = ramp(frame, 6, 16);
  return (
    <g opacity={o} fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={44}>
      <text x={70} y={1120} fill="#7fb2ff">← OUTSIDE</text>
      <text x={1010} y={300} fill="#f6d39a" textAnchor="end">CABIN →</text>
    </g>
  );
};

// --- Scene 3: the hole is in the middle pane ----------------------------------------------

const MiddleFocus: React.FC<{ duration: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const z = 1 + 0.5 * settle(f, fps, 0);
  const tag = pop(f, fps, 8);
  return (
    <Canvas>
      <Blueprint />
      <g transform={`translate(${MIDDLE_HOLE.x} ${MIDDLE_HOLE.y - 150}) scale(${z}) translate(${-MIDDLE_HOLE.x} ${-(MIDDLE_HOLE.y - 150)})`}>
        <ExplodedPanes spread={1} focus="middle" holeGlow={1} frame={f} />
      </g>
      <Tag x={540} y={260} text="HOLE IS IN THE MIDDLE PANE" size={46} scale={tag} />
      <Sfx at={8} name="ding" volume={0.3} />
    </Canvas>
  );
};

const OuterSealed: React.FC<{ duration: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tag = pop(f, fps, 4);
  const pos = PANE_POS.outer;
  return (
    <Canvas>
      <Blueprint />
      <g transform={`translate(${pos.x} ${pos.y}) scale(1.4) translate(${-pos.x} ${-pos.y})`}>
        <ExplodedPanes spread={1} focus="outer" frame={f} />
      </g>
      <Tag x={540} y={260} text="OUTER PANE: NO HOLE" size={50} color="#3ddc84" scale={tag} />
      <g transform={`translate(${pos.x + 40} ${pos.y + 40}) scale(${tag})`}>
        <circle r={70} fill="#3ddc84" stroke="#0b1530" strokeWidth={8} />
        <path d="M -32 0 L -8 26 L 34 -24" stroke="#0b1530" strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sfx at={4} name="pop" volume={0.35} />
    </Canvas>
  );
};

// --- Scene 4: pressurized cabin vs thin outside air ---------------------------------------

const Altitude: React.FC<{ duration: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, fps, 4);
  const ft = Math.round(Math.min(1, f / 24) * 35000);
  return (
    <Canvas>
      <PlaneFlying frame={f} />
      <Tag x={540} y={300} text={`${ft.toLocaleString("en-US")} FT`} size={70} scale={p} color="white" />
    </Canvas>
  );
};

const PressureCompare: React.FC<{ duration: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = pop(f, fps, 2);
  const b = pop(f, fps, 10);
  return (
    <Canvas>
      <CrossSection frame={f} fill={0} load={0} />
      <Tag x={190} y={220} text="THIN AIR" size={40} color="#7fb2ff" scale={a} />
      <Tag x={820} y={220} text="PRESSURIZED" size={40} color="#ff9f5a" scale={b} />
      <Stickman x={880} y={1010} scale={0.72} pose={POSES.stand} expression="happy" lookX={-0.6} blink={blinkAt(f)} shirt="#ff7a59" />
      <Sfx at={2} name="pop" volume={0.3} />
      <Sfx at={10} name="pop" volume={0.3} />
    </Canvas>
  );
};

// --- Scene 5: air flows into the gap, outer pane takes the load ---------------------------

const GapFlow: React.FC<{ duration: number; offset: number; total: number; wide: boolean }> = ({ offset, total, wide }) => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = local + offset; // continuous simulation across cuts
  const fill = ramp(f, 4, total * 0.55);
  const load = ramp(f, total * 0.45, total * 0.8);
  const balance = ramp(f, total * 0.6, total * 0.85);
  const holeX = XS.middleX + XS.middleW / 2;
  const cam = wide ? 1 : 1.7;
  const camY = wide ? 960 : XS.holeY - 120;
  const camX = wide ? 540 : holeX + 60;
  const s = shake(f, Math.round(total * 0.5), 8, 10);
  const loadTag = pop(local, fps, Math.round(total * 0.5) - offset);
  return (
    <Canvas>
      <g transform={`translate(${540 + s.x} ${960 + s.y}) scale(${cam}) translate(${-camX} ${-camY})`}>
        <CrossSection frame={f} fill={fill} load={load} balance={balance} highlight={wide ? "outer" : "middle"} />
        {!wide && (
          <g opacity={ramp(local, 2, 8)}>
            <path d={`M ${holeX + 170} ${XS.holeY + 120} Q ${holeX + 100} ${XS.holeY + 40} ${holeX + 40} ${XS.holeY + 4}`} stroke="#11131a" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="4 18" />
          </g>
        )}
      </g>
      {!wide ? (
        <Tag x={540} y={240} text="CABIN AIR FLOWS IN" size={52} scale={pop(local, fps, 2)} color="#ff9f5a" />
      ) : (
        <>
          <Tag x={540} y={190} text="OUTER PANE TAKES THE LOAD" size={44} color="#ff5a4e" textColor="white" scale={loadTag} />
          <Tag x={760} y={300} text="MIDDLE: BALANCED" size={36} color="#3ddc84" scale={pop(f, fps, Math.round(total * 0.65))} />
        </>
      )}
    </Canvas>
  );
};

// --- Scene 6: backup + moisture -----------------------------------------------------------

const Backup: React.FC<{ duration: number }> = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = pop(f, fps, 4);
  return (
    <Canvas>
      <CrossSection frame={f + 200} fill={1} load={1} balance={1} backup={g} crack={0} />
      <Tag x={540} y={220} text="MIDDLE PANE = BACKUP" size={50} color="#3ddc84" scale={g} />
      <g transform={`translate(${XS.middleX + 15} ${640}) scale(${g})`}>
        <path d="M 0 -80 L 70 -55 Q 70 30 0 80 Q -70 30 -70 -55 Z" fill="#3ddc84" stroke="#0b1530" strokeWidth={8} />
        <path d="M -26 0 L -6 22 L 30 -22" stroke="#0b1530" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sfx at={4} name="ding" volume={0.3} />
    </Canvas>
  );
};

const Defog: React.FC<{ duration: number }> = ({ duration }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fog = 1 - ramp(f, 4, Math.min(duration - 4, 30));
  const p = pop(f, fps, 20);
  return (
    <Canvas>
      <rect width={1080} height={1920} fill="#e2dccf" />
      <g transform="translate(420 700) scale(0.8) translate(-540 -820)">
        <WindowPOV frame={f} fog={fog} />
      </g>
      {/* moisture escaping through the hole */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t = ((f + i * 6) % 30) / 30;
        return (
          <circle key={i} cx={420 + (POV_HOLE.x - 540) * 0.8 + Math.sin(i * 2 + f / 5) * 8} cy={700 + (POV_HOLE.y - 820) * 0.8 - 20 - t * 50} r={10 * (1 - t)} fill="#9ad7ff" opacity={fog * (1 - t)} />
        );
      })}
      <Stickman
        x={880}
        y={1200}
        scale={1.15 * (0.6 + 0.4 * p)}
        thumb={p > 0.5}
        pose={mixPose(POSES.stand, POSES.thumbsUp, p)}
        expression="grin"
        lookX={-0.5}
        blink={blinkAt(f, 10)}
        shirt="#ff7a59"
      />
      <Tag x={420} y={190} text="NO FOG" size={60} color="#9ad7ff" scale={p} />
      <Sfx at={20} name="pop" volume={0.35} />
    </Canvas>
  );
};

const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, fps, 0);
  const w = Math.sin(f / 3) * 18;
  return (
    <Canvas>
      <CabinWide frame={f + 300} />
      <rect width={1080} height={1920} fill="#11131a" opacity={0.45} />
      <g transform={`translate(540 520) scale(${p}) rotate(-3)`}>
        <rect x={-430} y={-150} width={860} height={300} rx={40} fill="#ffd23f" stroke="#11131a" strokeWidth={12} />
        <text y={-20} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={100} fill="#11131a">
          TINY HOLE.
        </text>
        <text y={95} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight={700} fontSize={100} fill="#ff5a4e">
          BIG JOB.
        </text>
      </g>
      <Stickman
        x={540}
        y={1240}
        scale={1.3}
        pose={{ ...POSES.wave, armR: [150 + w * 0.3, 200 + w] }}
        expression="happy"
        blink={blinkAt(f)}
        shirt="#ff7a59"
      />
      <Sfx at={0} name="ding" volume={0.35} />
    </Canvas>
  );
};

// --- Composition -----------------------------------------------------------------------------

export const AirplaneWindowShort: React.FC<{ timing: Timing }> = ({ timing }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const scenes = sceneRanges(timing, fps, durationInFrames);
  const byId = Object.fromEntries(scenes.map((s) => [s.id, s]));
  const last = timing.lines[timing.lines.length - 1];
  const endFrom = Math.round((last.start + last.duration) * fps) + 4;

  const hook = byId.hook;
  const panes = byId.panes;
  const middle = byId.middle;
  const pressure = byId.pressure;
  const gap = byId.gap;
  const backup = byId.backup;
  const backupDur = endFrom - backup.from;

  const [h1, h2] = cuts(hook.duration, [0.48]);
  const [m1, m2] = cuts(middle.duration, [0.55]);
  const [p1, p2] = cuts(pressure.duration, [0.42]);
  const [g1, g2] = cuts(gap.duration, [0.42]);
  const [b1, b2] = cuts(backupDur, [0.45]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#11131a" }}>
      <Shot from={hook.from + h1.from} duration={h1.duration} drift={0.06} origin="55% 45%">
        <PassengerWide duration={h1.duration} />
      </Shot>
      <Shot from={hook.from + h2.from} duration={h2.duration} drift={0}>
        <HoleCloseup duration={h2.duration} />
      </Shot>

      <Shot from={panes.from} duration={panes.duration}>
        <PanesScene duration={panes.duration} />
      </Shot>

      <Shot from={middle.from + m1.from} duration={m1.duration}>
        <MiddleFocus duration={m1.duration} />
      </Shot>
      <Shot from={middle.from + m2.from} duration={m2.duration}>
        <OuterSealed duration={m2.duration} />
      </Shot>

      <Shot from={pressure.from + p1.from} duration={p1.duration}>
        <Altitude duration={p1.duration} />
      </Shot>
      <Shot from={pressure.from + p2.from} duration={p2.duration}>
        <PressureCompare duration={p2.duration} />
      </Shot>

      <Shot from={gap.from + g1.from} duration={g1.duration} drift={0.03}>
        <GapFlow duration={g1.duration} offset={0} total={gap.duration} wide={false} />
      </Shot>
      <Shot from={gap.from + g2.from} duration={g2.duration} drift={0.03}>
        <GapFlow duration={g2.duration} offset={g2.from} total={gap.duration} wide />
      </Shot>

      <Shot from={backup.from + b1.from} duration={b1.duration}>
        <Backup duration={b1.duration} />
      </Shot>
      <Shot from={backup.from + b2.from} duration={b2.duration}>
        <Defog duration={b2.duration} />
      </Shot>

      <Shot from={endFrom} duration={durationInFrames - endFrom}>
        <EndCard />
      </Shot>

      {/* narration */}
      {timing.lines.map((line) => (
        <Sequence key={line.id} from={Math.round(line.start * fps)} durationInFrames={Math.ceil(line.duration * fps) + 2} layout="none">
          <Html5Audio src={staticFile(line.file)} volume={1} />
        </Sequence>
      ))}

      <Captions lines={timing.lines} highlight={HIGHLIGHT} y={1290} />
    </AbsoluteFill>
  );
};
