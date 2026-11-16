import React from "react";
import { Composition } from "remotion";
import { AirplaneWindowShort } from "./shorts/airplane-window/AirplaneWindowShort";
import { CheeseAllergyShort } from "./shorts/cheese-allergy/CheeseAllergyShort";
import { McFlurrySpoonShort, TEST_TIMING } from "./shorts/mcflurry-spoon/McFlurrySpoonShort";
import { loadTiming, type Timing } from "./lib/timing";

const FPS = 30;
const emptyTiming: Timing = { engine: "", voice: "", totalSeconds: 30, audio: "", lines: [], captions: [] };

/**
 * Every Short is one entry here. To add a new Short:
 *   1. create src/shorts/<new-id>/ with narration.json (script, composition id, file and artifact names) and scenes
 *   2. add it to SHORTS below
 *   3. run the "Render Video" workflow and pick the new Short
 */
const SHORTS: { id: string; short: string; component: React.FC<{ timing: Timing }> }[] = [
  { id: "AirplaneWindow", short: "airplane-window", component: AirplaneWindowShort },
  { id: "CheeseAllergy", short: "cheese-allergy", component: CheeseAllergyShort },
  { id: "McFlurrySpoon", short: "mcflurry-spoon", component: McFlurrySpoonShort },
];

export const RemotionRoot: React.FC = () => (
  <>
    {/* 3D smoke test: same scene and animation as McFlurrySpoon, on a fixed timing, no audio */}
    <Composition
      id="McFlurrySpoonTest"
      component={McFlurrySpoonShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={TEST_TIMING.totalSeconds * FPS}
      defaultProps={{ timing: TEST_TIMING, debug: false }}
    />
    {SHORTS.map(({ id, short, component }) => (
      <Composition
        key={id}
        id={id}
        component={component}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={30 * FPS}
        defaultProps={{ timing: emptyTiming }}
        calculateMetadata={async () => {
          const timing = await loadTiming(short);
          return { durationInFrames: Math.round(timing.totalSeconds * FPS), props: { timing } };
        }}
      />
    ))}
  </>
);
