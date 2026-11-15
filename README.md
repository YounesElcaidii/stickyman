# stickyman

Stickman explainer YouTube Shorts, built with [Remotion](https://www.remotion.dev/) and rendered
entirely on GitHub Actions — no PC, no manual editing, no voice recording, no paid API keys.

## Shorts

| Short | Composition | Output |
| --- | --- | --- |
| Why Do Airplane Windows Have a Tiny Hole? | `AirplaneWindow` | `airplane-window-short-v2.mp4` |

## Get the video from your phone

1. On github.com open the repo → **Actions** → **Render Video** → **Run workflow** → **Run workflow**.
   (The workflow also runs by itself on every pull request that changes the video.)
2. Wait for the green check (about 6–10 minutes) and open the run.
3. Under **Artifacts** download **stickman-short-v2**. It is a `.zip` containing:
   - `airplane-window-short-v2.mp4` — the full 1080 × 1920 file to upload
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
  exactly 1080 × 1920 and 30 fps with AAC audio, lasts 25–30 s, does not clip, has every narration
  sentence audible at the right time and clearly above the sound effects, and speech-to-text of
  the final file gives back the script.

## Voice and license

The voice is `en_US-ljspeech-high`, a Piper voice trained on the public-domain LJ Speech dataset.
Its model card is downloaded on every render and shipped next to the MP4 as `voice-license.txt`.
To try another voice, change `"voice"` in `narration.json` — check its model card first, because
several Piper voices are trained on non-commercial datasets.

## Making the next Short

1. Copy `src/shorts/airplane-window` to `src/shorts/<new-id>`; edit `narration.json` and the scenes.
2. Register a new `<Composition>` in `src/Root.tsx`.
3. Run **Render Video** with `short`, `composition` and `output_name` set for the new Short.

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
