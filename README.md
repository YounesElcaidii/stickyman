# stickyman

Stickman explainer YouTube Shorts, built with [Remotion](https://www.remotion.dev/) and rendered
entirely on GitHub Actions — no PC, no manual editing, no voice recording, no paid API keys.

## Shorts

| Short | Folder | Composition | Artifact | File |
| --- | --- | --- | --- | --- |
| Why Do Airplane Windows Have a Tiny Hole? | `airplane-window` | `AirplaneWindow` | `stickman-short-v2` | `airplane-window-short-v2.mp4` |
| When a Cheese Prank Turned Fatal | `cheese-allergy` | `CheeseAllergy` | `stickman-cheese-allergy` | `cheese-allergy-short.mp4` |
| Why Did McFlurry Spoons Have a Square Hole? (3D) | `mcflurry-spoon` | `McFlurrySpoon` | `stickman-mcflurry-spoon` | `mcflurry-spoon-short.mp4` |
| Someone Is Outside Your Door (cel-shaded 3D, fiction) | `someone-at-the-door` | `SomeoneAtTheDoor` | `stickman-someone-at-the-door` | `someone-at-the-door.mp4` |

## Get a video from your phone

1. On github.com open the repo → **Actions** → **Render Video** → **Run workflow**, pick the Short, → **Run workflow**.
   (The workflow also renders every Short on each pull request that changes the videos.)
2. Wait for the green check (about 3–5 minutes) and open the run.
3. Under **Artifacts** download the Short's artifact (see the table above). It is a `.zip` containing:
   - the full 1080 × 1920 `.mp4` to upload
   - `voice-preview.wav` — a short sample of the voice
   - `voice-license.txt` — the voice's model card (license record)
   - `check-report.md` and `frames/` — what the automatic check verified

Always download the MP4 from the artifact. Copies previewed inside chat apps are often
downscaled and re-encoded.

## How it works

- `src/shorts/<short>/narration.json` — the script. Each line is one sentence, split into the
  caption phrases that appear on screen.
- `scripts/make_voice.py` — narration with [Piper](https://github.com/OHF-Voice/piper1-gpl), a free
  neural text-to-speech engine that runs on the runner's CPU. It first makes and checks a short
  voice sample, then the full narration, then measures where every word is in the audio so the
  captions follow the real voice. **There is no fallback voice:** if the voice cannot be downloaded
  or a speech-to-text pass cannot understand it, the run fails with the exact error.
- `src/shorts/<short>/*.tsx` — the scenes, driven by the measured narration timing.
- `src/components/` — reusable pieces: `Stickman` (poses + expressive face) and `Captions`
  (kept clear of the YouTube Shorts buttons on the right and the title area at the bottom).
- `scripts/check_video.py` — the delivery check. It fails the run unless the MP4 is H.264 at
  exactly 1080 × 1920 and 30 fps with AAC audio, lasts the length set in `narration.json`, does not clip, has every narration
  sentence audible at the right time and clearly above the sound effects, and speech-to-text of
  the final file gives back the script, with caption timing cross-checked against it.

## 3D Shorts

`mcflurry-spoon` is real 3D: Three.js through `@remotion/three`, with original models built in code
(`src/shorts/mcflurry-spoon/Scene3D.tsx`) and every camera move and part motion a pure function of
the frame (`rig.ts`). The GitHub runner has no GPU, so the Short's `narration.json` sets
`"gl": "swangle"` (software WebGL). Before the full render, `scripts/smoke_test_3d.py` renders a few
half-size stills, fails on black or blank frames, and measures from pixels that the mixer shaft
really ends up inside the spoon's socket. Its stills are in the artifact under `3d-test/`.

## Voices and licenses

Two free neural voice engines are supported; a Short names its engine in `narration.json`.

- **Piper** (default): `en_US-ljspeech-high` for the first three Shorts. Each Piper voice's model
  card is downloaded on every render and shipped as `voice-license.txt`. Check a voice's card
  before using it: several Piper voices are trained on non-commercial datasets.
- **Kokoro-82M v1.0** (`"engine": "kokoro"`), used by `someone-at-the-door`: model weights under the
  Apache License 2.0, run through `kokoro-onnx` (MIT) on the CPU. Narrator `am_michael`; Alex and
  the hallway voice `am_puck`, with light phone and door effects. Lines can name their own voice,
  effect, speed and pause.

Neither engine needs an account or key. There is no fallback voice: if a voice cannot be loaded or
a speech-to-text pass cannot understand it, the run fails with the exact error.

## Making the next Short

1. Create `src/shorts/<new-id>/` with a `narration.json` (script, `composition`, `outputName`,
   `artifactName`, length window) and the scene components. `cheese-allergy` is the newest example.
   A caption can be `{"show": "In 2017,", "say": "In twenty seventeen,"}` when the spoken words
   differ from the on-screen text; unusual names go in `pronunciations` for the caption aligner.
2. Add the Short to `SHORTS` in `src/Root.tsx` and to the `short` options in
   `.github/workflows/render-video.yml`.
3. Open a pull request (it renders automatically) or run **Render Video** and pick the Short.

## Local development (optional)

```bash
npm ci && pip install -r requirements.txt     # Python 3.13
python3 scripts/make_voice.py airplane-window && python3 scripts/make_sfx.py
npm run studio          # live preview
npx remotion render AirplaneWindow out/airplane-window-short-v2.mp4
python3 scripts/check_video.py out/airplane-window-short-v2.mp4 airplane-window
```

Offline, without the Piper voice, `--engine espeak-dev --no-asr` gives a robotic placeholder for
layout work only; the delivery check refuses videos made with it.
