import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "@fontsource/fredoka/700.css";
import { Canvas, Sfx } from "../../components/Shot";
import { Captions } from "../../components/Captions";
import { Stickman, POSES, blinkAt, mixPose } from "../../components/Stickman";
import { pop, ramp, settle } from "../../lib/anim";
import { lineFrames, type Timing } from "../../lib/timing";
import { WindowPOV, POV_HOLE } from "./Cabin";
import { Cutaway } from "./Cutaway";

export const SHORT_ID = "airplane-window";

const HIGHLIGHT = ["tiny", "hole", "middle", "gap", "outer", "difference"];
const SFX_VOLUME = 0.1; // sound effects stay far below the narration

// --- Scene 1: close-up of the tiny hole while the question is asked ---------------------------

const HoleCloseup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = 1.75 + 0.25 * ramp(f, 0, 110);
  const ring = pop(f, fps, 6);
  const peek = settle(f, fps, 3);
  const target = { x: 520, y: 700 }; // where the hole sits on screen
  return (
    <Canvas>
      <g transform={`translate(${target.x} ${target.y}) scale(${zoom}) translate(${-POV_HOLE.x} ${-POV_HOLE.y})`}>
        <WindowPOV frame={f} wing={false} />
      </g>
      {/* ring + pointer on the hole */}
      <circle cx={target.x} cy={target.y} r={(70 + 6 * Math.sin(f / 4)) * ring} fill="none" stroke="#11131a" strokeWidth={22} />
      <circle cx={target.x} cy={target.y} r={(70 + 6 * Math.sin(f / 4)) * ring} fill="none" stroke="#ff5a4e" strokeWidth={12} />
      <Stickman
        x={215}
        y={1420 + (1 - peek) * 500}
        scale={1.4}
        pose={mixPose(POSES.stand, { ...POSES.point, armR: [138, 146], lean: 4, headTilt: -8 }, peek)}
        expression={f < 20 ? "surprised" : "curious"}
        lookX={0.8}
        lookY={-0.9}
        turn={0.5}
        blink={blinkAt(f, 40)}
        shirt="#ff7a59"
      />
      <Sfx at={6} name="pop" volume={SFX_VOLUME} />
    </Canvas>
  );
};

// --- Scenes 2-5: one stable cutaway --------------------------------------------------------------

const CutawayScene: React.FC<{
  marks: { middle: number; flow: number; flowEnd: number; inside: number; difference: number; differenceEnd: number };
}> = ({ marks }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flowLen = marks.flowEnd - marks.flow;
  const done = f >= marks.differenceEnd - 8;
  const cheer = pop(f, fps, marks.differenceEnd - 8);
  return (
    <Canvas>
      <Cutaway
        frame={f}
        appear={ramp(f, 0, 8)}
        holeCallout={pop(f, fps, marks.middle + 6)}
        middleGlow={f >= marks.middle && f < marks.inside ? 1 : 0}
        flow={ramp(f, marks.flow + flowLen * 0.3, marks.flow + flowLen * 0.6)}
        rise={ramp(f, marks.flow + flowLen * 0.6, marks.flow + flowLen * 0.8)}
        fill={ramp(f, marks.flow + flowLen * 0.55, marks.flowEnd + 10)}
        push={ramp(f, marks.inside + 8, marks.inside + 30)}
        outsideLow={ramp(f, marks.difference + 6, marks.difference + 24)}
        outerGlow={f >= marks.inside + 8 ? 1 : 0}
      >
        <Stickman
          x={920}
          y={1081}
          scale={0.7}
          pose={done ? mixPose(POSES.stand, POSES.thumbsUp, cheer) : POSES.stand}
          thumb={done && cheer > 0.5}
          expression={done ? "grin" : f >= marks.flow ? "happy" : "curious"}
          lookX={-0.8}
          turn={-0.4}
          blink={blinkAt(f, 12)}
          shirt="#ff7a59"
        />
      </Cutaway>
      <Sfx at={marks.middle + 6} name="pop" volume={SFX_VOLUME} />
      <Sfx at={marks.differenceEnd - 8} name="ding" volume={SFX_VOLUME} />
    </Canvas>
  );
};

// --- Composition -----------------------------------------------------------------------------------

export const AirplaneWindowShort: React.FC<{ timing: Timing }> = ({ timing }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (timing.lines.length === 0) return <AbsoluteFill style={{ backgroundColor: "#11131a" }} />;
  const at = lineFrames(timing, fps);
  // Cut to the cutaway just before "It's in the middle pane."
  const cut = Math.max(1, at.middle.start - 6);
  const rel = (frame: number) => frame - cut;

  return (
    <AbsoluteFill style={{ backgroundColor: "#11131a" }}>
      <Sequence from={0} durationInFrames={cut} layout="none">
        <HoleCloseup />
      </Sequence>
      <Sequence from={cut} durationInFrames={durationInFrames - cut} layout="none">
        <CutawayScene
          marks={{
            middle: rel(at.middle.start),
            flow: rel(at.flow.start),
            flowEnd: rel(at.flow.end),
            inside: rel(at.inside.start),
            difference: rel(at.difference.start),
            differenceEnd: rel(at.difference.end),
          }}
        />
      </Sequence>

      {/* narration: one track, full volume */}
      <Html5Audio src={staticFile(timing.audio)} volume={1} />

      <Captions captions={timing.captions} highlight={HIGHLIGHT} />
    </AbsoluteFill>
  );
};
