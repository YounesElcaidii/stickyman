import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "@fontsource/fredoka/700.css";
import { Captions } from "../../components/Captions";
import type { Timing } from "../../lib/timing";
import { marksFrom, type Marks } from "./rig";
import { Scene3D } from "./Scene3D";

const HIGHLIGHT = ["square", "hole", "snapped", "spun", "same", "both"];

/**
 * A fixed, typical narration timing used only by the McFlurrySpoonTest composition, so the
 * 3D smoke test can ask for known frames (before/after the shaft connects, mid-mix, ending).
 */
export const TEST_TIMING: Timing = {
  engine: "test",
  voice: "test",
  totalSeconds: 24,
  audio: "",
  lines: [
    { id: "hook", text: "", start: 0.15, duration: 3.6 },
    { id: "snapped", text: "", start: 4.4, duration: 2.2 },
    { id: "spun", text: "", start: 7.2, duration: 6.0 },
    { id: "same", text: "", start: 14.6, duration: 4.8 },
    { id: "both", text: "", start: 20.0, duration: 1.9 },
  ],
  captions: [
    { text: "snapped onto the mixer.", start: 5.0, end: 6.6 },
    { text: "and you got the same spoon", start: 16.6, end: 18.2 },
  ],
};

/** Quiet sound design: one click when the parts connect, a soft motor while it mixes. */
const Sound: React.FC<{ marks: Marks; speechEnd: number }> = ({ marks, speechEnd }) => {
  const mixFrames = marks.spinStop + 14 - marks.spinStart;
  return (
    <>
      <Sequence from={marks.snapAt} durationInFrames={12} layout="none">
        <Html5Audio src={staticFile("sfx/click.wav")} volume={0.32} />
      </Sequence>
      <Sequence from={marks.spinStart} durationInFrames={mixFrames} layout="none">
        <Html5Audio
          src={staticFile("sfx/whir.wav")}
          volume={(f) => {
            const fadeIn = Math.min(1, f / 14);
            const fadeOut = Math.min(1, Math.max(0, (mixFrames - f) / 14));
            const inPause = f + marks.spinStart > speechEnd + 4 && f + marks.spinStart < marks.spinStop - 6;
            return fadeIn * fadeOut * (inPause ? 0.075 : 0.03); // louder only between sentences
          }}
        />
      </Sequence>
    </>
  );
};

export const McFlurrySpoonShort: React.FC<{ timing: Timing; debug?: boolean }> = ({ timing, debug = false }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  if (timing.lines.length === 0) return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  const marks = marksFrom(timing, fps, durationInFrames);
  const spun = timing.lines.find((l) => l.id === "spun")!;
  const real = timing.audio !== "";

  return (
    <AbsoluteFill style={{ backgroundColor: debug ? "black" : "#3d5661" }}>
      <ThreeCanvas width={width} height={height} shadows={!debug} camera={{ fov: 30, position: [0, 20, 20] }} gl={{ antialias: true }}>
        <Scene3D frame={frame} marks={marks} debug={debug} />
      </ThreeCanvas>
      {real && (
        <>
          <Html5Audio src={staticFile(timing.audio)} volume={1} />
          <Sound marks={marks} speechEnd={Math.round((spun.start + spun.duration) * fps)} />
          <Captions captions={timing.captions} highlight={HIGHLIGHT} />
        </>
      )}
    </AbsoluteFill>
  );
};
