import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "@fontsource/fredoka/700.css";
import { Canvas, Sfx } from "../../components/Shot";
import { Captions } from "../../components/Captions";
import { Stickman, POSES, blinkAt, mixPose } from "../../components/Stickman";
import { pop, ramp, settle } from "../../lib/anim";
import { lineFrames, type Timing } from "../../lib/timing";
import { CheeseScene, EffectCard, Hallway, ImmuneGraphic, Pill } from "./Art";

const HIGHLIGHT = ["milk", "allergy", "anaphylaxis", "breathing", "pressure", "seriously"];
const SFX_VOLUME = 0.06; // barely-there; this Short stays quiet
const FONT = "Fredoka, sans-serif";

/** Frame at which the caption containing `needle` starts (falls back to `fallback`). */
const captionFrame = (timing: Timing, needle: string, fps: number, fallback: number) => {
  const c = timing.captions.find((x) => x.text.toLowerCase().includes(needle));
  return c ? Math.round(c.start * fps) : fallback;
};

// --- 1. The piece of cheese ----------------------------------------------------------------------

const CheeseCloseup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(f, fps, 4, 140);
  return (
    <Canvas>
      <CheeseScene zoom={1.25 + 0.12 * ramp(f, 0, 170)} />
      <g transform={`translate(475 300) scale(${p})`}>
        <rect x={-405} y={-70} width={810} height={140} rx={34} fill="#1f2430" />
        <path d="M -340 -34 L -300 34 L -380 34 Z" fill="#ffd23f" stroke="#ffd23f" strokeWidth={8} strokeLinejoin="round" />
        <rect x={-345} y={-12} width={10} height={26} rx={4} fill="#1f2430" />
        <circle cx={-340} cy={24} r={6} fill="#1f2430" />
        <text x={40} y={19} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={54} fill="white">
          SEVERE MILK ALLERGY
        </text>
      </g>
      <Sfx at={4} name="pop" volume={SFX_VOLUME} />
    </Canvas>
  );
};

// --- 2. Where and when (no re-enactment) ---------------------------------------------------------

const HallwayScene: React.FC<{ nameAt: number }> = ({ nameAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const place = settle(f, fps, 6);
  const name = settle(f, fps, nameAt);
  const drift = 1.04 + 0.04 * ramp(f, 0, 300);
  return (
    <Canvas>
      <g transform={`translate(540 900) scale(${drift}) translate(-540 -900)`}>
        <Hallway frame={f} />
      </g>
      <rect width={1080} height={1920} fill="#0f1320" opacity={0.18} />
      <Pill x={475} y={230} text="London, 2017" size={56} opacity={place} scale={0.9 + 0.1 * place} />
      <Pill x={475} y={372} text="Karanbir Cheema, 13" size={56} bg="#1f2430" fg="white" opacity={name} scale={0.9 + 0.1 * name} />
    </Canvas>
  );
};

// --- 3. What anaphylaxis does ----------------------------------------------------------------------

const AnaphylaxisScene: React.FC<{ breathingAt: number; pressureAt: number }> = ({ breathingAt, pressureAt }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = settle(f, fps, 2);
  const pointing = settle(f, fps, breathingAt - 6);
  return (
    <Canvas>
      <defs>
        <radialGradient id="an-bg" cx="0.5" cy="0.35" r="0.9">
          <stop offset="0" stopColor="#1b2a52" />
          <stop offset="1" stopColor="#0f1730" />
        </radialGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#an-bg)" />
      <Pill x={475} y={240} text="ANAPHYLAXIS" size={72} bg="#ffd23f" opacity={title} scale={0.9 + 0.1 * title} />
      <ImmuneGraphic frame={f} approach={ramp(f, 8, 40)} react={ramp(f, 38, 60)} />
      <EffectCard x={330} y={850} kind="breathing" active={ramp(f, breathingAt, breathingAt + 8)} frame={f} />
      <EffectCard x={330} y={1045} kind="pressure" active={ramp(f, pressureAt, pressureAt + 8)} frame={f} />
      <Stickman
        x={170}
        y={1078}
        scale={0.85}
        pose={mixPose(POSES.stand, { ...POSES.point, armR: [108, 96] }, pointing)}
        expression="calm"
        onDark
        lookX={0.7}
        lookY={0.1}
        turn={0.4}
        blink={blinkAt(f, 20)}
        shirt="#ff7a59"
      />
    </Canvas>
  );
};

// --- 4. Quiet ending -------------------------------------------------------------------------------

const QuietCard: React.FC<{ reminderAt: number; fadeOutAt: number }> = ({ reminderAt, fadeOutAt }) => {
  const f = useCurrentFrame();
  const fadeIn = ramp(f, 0, 14);
  const nameOut = 1 - ramp(f, reminderAt - 8, reminderAt + 4);
  const message = ramp(f, reminderAt + 2, reminderAt + 16);
  const out = ramp(f, fadeOutAt, fadeOutAt + 14);
  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Canvas bg="#0d101a">
        <defs>
          <radialGradient id="q-glow" cx="0.5" cy="0.36" r="0.6">
            <stop offset="0" stopColor="#25304f" />
            <stop offset="1" stopColor="#0d101a" />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#q-glow)" />
        <g opacity={nameOut} fontFamily={FONT} fontWeight={700} textAnchor="middle">
          <text x={540} y={640} fontSize={84} fill="white">
            Karanbir Cheema
          </text>
          <rect x={440} y={690} width={200} height={6} rx={3} fill="#ffd23f" />
          <text x={540} y={780} fontSize={52} fill="#aab4cc">
            aged 13
          </text>
        </g>
        <g opacity={message}>
          <g fontFamily={FONT} fontWeight={700} textAnchor="middle" fontSize={84} fill="white">
            <text x={540} y={470}>
              Take food allergies
            </text>
            <text x={540} y={580} fill="#ffd23f">
              seriously.
            </text>
          </g>
          <Stickman x={540} y={1010} scale={0.95} pose={POSES.stand} expression="calm" onDark blink={blinkAt(f, 30)} shirt="#ff7a59" />
        </g>
        <rect width={1080} height={1920} fill="black" opacity={out} />
      </Canvas>
    </AbsoluteFill>
  );
};

// --- Composition -----------------------------------------------------------------------------------

export const CheeseAllergyShort: React.FC<{ timing: Timing }> = ({ timing }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (timing.lines.length === 0) return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  const at = lineFrames(timing, fps);
  const lead = 6; // each scene arrives a beat before its sentence
  const toCase = at.case.start - lead;
  const toAnaphylaxis = at.anaphylaxis.start - lead;
  const toQuiet = at.died.start - 10;
  // The last line finishes, the card holds, then it fades to black.
  const fadeOutAt = Math.max(at.reminder.end + 30, durationInFrames - 26);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={toCase} layout="none">
        <CheeseCloseup />
      </Sequence>
      <Sequence from={toCase} durationInFrames={toAnaphylaxis - toCase} layout="none">
        <HallwayScene nameAt={captionFrame(timing, "karanbir cheema", fps, toCase + 60) - toCase - 4} />
      </Sequence>
      <Sequence from={toAnaphylaxis} durationInFrames={toQuiet + 14 - toAnaphylaxis} layout="none">
        <AnaphylaxisScene
          breathingAt={captionFrame(timing, "breathing", fps, at.effects.start) - toAnaphylaxis}
          pressureAt={captionFrame(timing, "blood pressure", fps, at.effects.start + 30) - toAnaphylaxis}
        />
      </Sequence>
      <Sequence from={toQuiet} durationInFrames={durationInFrames - toQuiet} layout="none">
        <QuietCard reminderAt={at.reminder.start - toQuiet} fadeOutAt={fadeOutAt - toQuiet} />
      </Sequence>

      {/* narration: one track, full volume */}
      <Html5Audio src={staticFile(timing.audio)} volume={1} />

      <CaptionsUntil captions={timing.captions} hideAt={fadeOutAt} />
    </AbsoluteFill>
  );
};

/** Captions disappear with the picture when the ending fades to black. */
const CaptionsUntil: React.FC<{ captions: Timing["captions"]; hideAt: number }> = ({ captions, hideAt }) => {
  const f = useCurrentFrame();
  if (f >= hideAt) return null;
  return <Captions captions={captions} highlight={HIGHLIGHT} />;
};
