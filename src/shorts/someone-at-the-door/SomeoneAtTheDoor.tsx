import React, { useLayoutEffect } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import "@fontsource/fredoka/700.css";
import { Captions } from "../../components/Captions";
import type { Timing } from "../../lib/timing";
import { Apartment } from "./Apartment";
import { Arm } from "./Hands";
import { Hallway, PEEPHOLE_CAMERA } from "./Hallway";
import { Phone, phoneGrip, type PhoneScreen } from "./Phone";
import { marksFrom, stateAt, type Marks } from "./rig";

const HIGHLIGHT = ["outside", "knocks", "handle", "rings", "twenty", "freezes", "open", "peephole", "jacket", "still", "locked", "speak", "silent"];
const FONT = "Fredoka, sans-serif";

const Camera: React.FC<{ eye: THREE.Vector3; look: THREE.Vector3; fov: number }> = ({ eye, look, fov }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(eye);
    cam.fov = fov;
    cam.near = 0.03;
    cam.far = 30;
    cam.lookAt(look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, [camera, eye, look, fov]);
  return null;
};

/** Everything you hear besides the voices, all kept well under the speech. */
const Sound: React.FC<{ m: Marks }> = ({ m }) => {
  const L = m.line;
  const steps: number[] = [];
  for (let f = m.walkFrom + 6; f < m.contact - 18; f += 13) steps.push(f);
  const ringFrames = Math.max(1, m.answered - m.ring);
  const beatFrom = L.freezes.s;
  return (
    <>
      <Html5Audio src={staticFile("sfx/room.wav")} loop volume={(f) => 0.07 * Math.min(1, Math.max(0, (m.end - 12 - f) / 50))} />
      {m.knocks.map((at) => (
        <Sequence key={at} from={at} durationInFrames={9} layout="none">
          <Html5Audio src={staticFile("sfx/knock.wav")} volume={0.6} />
        </Sequence>
      ))}
      {steps.map((at) => (
        <Sequence key={at} from={at} durationInFrames={8} layout="none">
          <Html5Audio src={staticFile("sfx/footstep.wav")} volume={0.13} />
        </Sequence>
      ))}
      <Sequence from={m.contact} durationInFrames={6} layout="none">
        <Html5Audio src={staticFile("sfx/click.wav")} volume={0.08} />
      </Sequence>
      {/* the ring is loud for a beat, then drops under the narrator */}
      <Sequence from={m.ring} durationInFrames={ringFrames} layout="none">
        <Html5Audio src={staticFile("sfx/ringtone.wav")} loop volume={(f) => (f + m.ring < L.rings.s - 3 ? 0.42 : 0.07) * Math.min(1, (ringFrames - f) / 6)} />
      </Sequence>
      <Sequence from={m.ring} durationInFrames={14} layout="none">
        <Html5Audio src={staticFile("sfx/buzz.wav")} volume={0.3} />
      </Sequence>
      <Sequence from={m.buzz} durationInFrames={14} layout="none">
        <Html5Audio src={staticFile("sfx/buzz.wav")} volume={0.45} />
      </Sequence>
      <Sequence from={m.handleTurns + 4} durationInFrames={8} layout="none">
        <Html5Audio src={staticFile("sfx/click.wav")} volume={0.1} />
      </Sequence>
      {/* a low heartbeat from the moment the hand freezes, fading with the picture */}
      <Sequence from={beatFrom} layout="none">
        <Html5Audio
          src={staticFile("sfx/heartbeat.wav")}
          loop
          volume={(f) => 0.1 * Math.min(1, f / 40) * Math.min(1, Math.max(0, (m.end - 10 - beatFrom - f) / 60))}
        />
      </Sequence>
    </>
  );
};

const ChoiceCard: React.FC<{ show: number; speakAt: number; silentAt: number; frame: number }> = ({ show, speakAt, silentAt, frame }) => {
  if (show <= 0) return null;
  const pop = (at: number) => {
    const t = Math.max(0, Math.min(1, (frame - at) / 7));
    return 1 - Math.pow(1 - t, 3);
  };
  const button = (label: string, at: number, top: number, bg: string, fg: string) => (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 210,
        top,
        height: 190,
        borderRadius: 44,
        background: bg,
        border: "10px solid #16110f",
        boxShadow: "0 14px 0 #16110f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 104,
        color: fg,
        opacity: pop(at),
        transform: `scale(${0.8 + 0.2 * pop(at)})`,
      }}
    >
      {label}
    </div>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(10,8,12,0.62)", opacity: show }} />
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 190,
          top: 250,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 84,
          color: "white",
          opacity: show,
          textShadow: "0 6px 0 #16110f",
        }}
      >
        What would you do?
      </div>
      {button("SPEAK", speakAt, 460, "#ffd23f", "#16110f")}
      {button("STAY SILENT", silentAt, 730, "#f4f1ea", "#16110f")}
    </AbsoluteFill>
  );
};

export const SomeoneAtTheDoor: React.FC<{ timing: Timing }> = ({ timing }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  if (timing.lines.length === 0) return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  const m = marksFrom(timing, fps, durationInFrames);
  const s = stateAt(frame, m);
  const cap = (needle: string, fallback: number) => {
    const c = timing.captions.find((x) => x.text.toLowerCase().includes(needle));
    return c ? Math.round(c.start * fps) : fallback;
  };
  const screen: PhoneScreen =
    s.screen === "ringing"
      ? { kind: "call", pulse: s.pulse }
      : s.screen === "call" && s.callConnected
        ? { kind: "call", pulse: 1, connected: true }
        : s.screen === "locked"
          ? { kind: "message", texts: ["I'm outside.", "Whatever you do, keep the door locked."] }
          : { kind: "message", texts: ["I'm outside."] };
  const fadeOut = Math.max(0, Math.min(1, (frame - (durationInFrames - 14)) / 12));

  return (
    <AbsoluteFill style={{ backgroundColor: "#07090f" }}>
      {/* the peephole view sits a little above centre, clear of the captions */}
      <AbsoluteFill style={{ transform: s.inPeephole ? "translateY(-110px)" : undefined }}>
        <ThreeCanvas width={width} height={height} shadows camera={{ fov: 76, position: [0, 1.6, 3] }} gl={{ antialias: true }}>
          {s.inPeephole ? (
            <>
              <Camera eye={PEEPHOLE_CAMERA.eye} look={PEEPHOLE_CAMERA.look} fov={PEEPHOLE_CAMERA.fov} />
              <Hallway frame={frame} />
            </>
          ) : (
            <>
              <Camera eye={s.eye} look={s.look} fov={76} />
              <Apartment frame={frame} handleTurn={s.handleTurn} knock={s.knock} knockY={s.knockY} />
              <Arm shoulder={s.shoulderR} pose={s.right} />
              <Arm shoulder={s.shoulderL} pose={phoneGrip(s.phonePos, s.phoneRot)} left />
              <Phone position={s.phonePos} rotation={s.phoneRot} screen={screen} />
            </>
          )}
        </ThreeCanvas>
        {s.inPeephole && (
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(circle 470px at 50% 50%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 76%, rgba(0,0,0,0.55) 90%, #050506 97%, #050506 100%)",
            }}
          >
            <div style={{ position: "absolute", left: 540 - 474, top: 960 - 474, width: 948, height: 948, borderRadius: "50%", border: "14px solid #1c1a1d", boxSizing: "border-box" }} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      {s.inPeephole && <AbsoluteFill style={{ background: "#050506", top: 1340 }} />}

      <ChoiceCard show={s.choice} speakAt={m.choiceAt + 4} silentAt={cap("or stay silent", m.choiceAt + 40)} frame={frame} />
      <Html5Audio src={staticFile(timing.audio)} volume={1} />
      <Sound m={m} />
      <Captions captions={timing.captions} highlight={HIGHLIGHT} />
      <AbsoluteFill style={{ background: "black", opacity: fadeOut }} />
    </AbsoluteFill>
  );
};
