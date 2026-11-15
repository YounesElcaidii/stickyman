import React from "react";
import { Composition } from "remotion";
import { AirplaneWindowShort, SHORT_ID } from "./shorts/airplane-window/AirplaneWindowShort";
import { loadTiming, type Timing } from "./lib/timing";

const FPS = 30;
const emptyTiming: Timing = { engine: "", voice: "", totalSeconds: 27, audio: "", lines: [], captions: [] };

/**
 * Every Short is one <Composition>. To add a new Short:
 *   1. copy src/shorts/airplane-window to src/shorts/<new-id> and edit narration.json + scenes
 *   2. register it below with id = PascalCase name
 *   3. run the "Render Video" workflow with short=<new-id> and composition=<CompositionId>
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AirplaneWindow"
      component={AirplaneWindowShort}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={27 * FPS}
      defaultProps={{ timing: emptyTiming }}
      calculateMetadata={async () => {
        const timing = await loadTiming(SHORT_ID);
        return {
          durationInFrames: Math.round(timing.totalSeconds * FPS),
          props: { timing },
        };
      }}
    />
  </>
);
