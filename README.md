# stickyman

Stickman explainer YouTube Shorts, built with [Remotion](https://www.remotion.dev/) and rendered
entirely on GitHub Actions — no PC, no manual editing, no voice recording, no paid API keys.

## Shorts

| Short | Composition | Output |
| --- | --- | --- |
| Why Do Airplane Windows Have a Tiny Hole? | `AirplaneWindow` | `airplane-window-short.mp4` |

## Render from your phone

1. Open the repo on github.com → **Actions** tab → **Render Video** → **Run workflow** → **Run workflow**.
2. Wait for the green check (about 5–8 minutes), open the run, and download **stickman-short** under *Artifacts*.
3. The download is a `.zip`; open it in the Files app to get the MP4.

## How it works

- `src/shorts/<short>/narration.json` — the script, one entry per scene. Edit the text here.
- `scripts/make_voice.py` — free neural text-to-speech with [Piper](https://github.com/OHF-Voice/piper1-gpl)
  (voice downloaded once and cached). It times every line, adjusts speaking speed so the Short
  lands between 25 and 30 seconds, and writes `public/shorts/<short>/timing.json`.
  If Piper ever can't download its voice, it falls back to `espeak-ng` and the run shows a warning.
- `scripts/make_sfx.py` — synthesizes the whoosh/pop/ding sound effects.
- `src/shorts/<short>/*.tsx` — the scenes. Shots and captions follow the narration timing automatically.
- `src/components/` — reusable pieces: `Stickman` (poses + expressive face), `Captions`, `Shot` (quick cuts).
- `scripts/check_video.sh` — fails the run unless the MP4 is 1080×1920, 25–30 s, and has audible narration.

## Making the next Short

1. Copy `src/shorts/airplane-window` to `src/shorts/<new-id>`; edit `narration.json` and the scenes.
2. Register a new `<Composition>` in `src/Root.tsx`.
3. Run **Render Video** with `short` = `<new-id>` and `composition` = your composition id.

## Local development (optional)

```bash
npm ci && pip install -r requirements.txt
npm run voice -- airplane-window && python3 scripts/make_sfx.py
npm run studio          # live preview
npx remotion render AirplaneWindow out/airplane-window-short.mp4
npm run check -- out/airplane-window-short.mp4
```
