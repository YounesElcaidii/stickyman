#!/usr/bin/env python3
"""Generate the narration for a Short with free, local, neural text-to-speech (Piper).

Usage:
    python3 scripts/make_voice.py airplane-window --preview-only   # short voice sample + checks
    python3 scripts/make_voice.py airplane-window                  # full narration + caption timing

Reads   src/shorts/<short>/narration.json
Writes  out/voice-preview.wav                     a short sample to judge the voice by ear
        out/voice-license.txt                     the voice's model card (license record)
        public/shorts/<short>/narration.wav       the whole narration on the video timeline
        public/shorts/<short>/timing.json         scene + caption timing measured from the audio

There is NO silent fallback: if the voice cannot be downloaded or does not produce clear
English speech, this script prints the exact error and exits with a failure.

`--engine espeak-dev` exists only for offline layout work on a machine that cannot download
the Piper voice. The render check refuses to pass a video narrated with it.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import speechlib  # noqa: E402
from speechlib import RATE, db, loudness_gain, soft_limit, log, read_wav, rms, transcribe, word_recall, word_times, words_of, write_wav  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
VOICE_DIR = ROOT / ".voices"
OUT = ROOT / "out"


def die(msg: str) -> "None":
    print(f"::error::{msg}", flush=True)
    print(f"NARRATION FAILED: {msg}", flush=True)
    sys.exit(1)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=kw.pop("text", True), **kw)


def ensure_piper_voice(voice: str) -> Path:
    onnx = VOICE_DIR / f"{voice}.onnx"
    cfg = VOICE_DIR / f"{voice}.onnx.json"
    if not (onnx.exists() and cfg.exists() and onnx.stat().st_size > 1_000_000):
        VOICE_DIR.mkdir(parents=True, exist_ok=True)
        log(f"[voice] downloading Piper voice {voice} ...")
        r = run([sys.executable, "-m", "piper.download_voices", "--download-dir", str(VOICE_DIR), voice])
        log(r.stdout.strip())
        log(r.stderr.strip())
        if r.returncode != 0 or not onnx.exists() or onnx.stat().st_size < 1_000_000:
            die(f"could not download Piper voice '{voice}' (exit {r.returncode}): {r.stderr.strip()[-600:] or 'no model file was written'}")
    log(f"[voice] model: {onnx} ({onnx.stat().st_size / 1e6:.1f} MB)")
    save_model_card(voice)
    return onnx


def save_model_card(voice: str) -> None:
    """Keep the voice's license record next to the video."""
    lang, name, quality = voice.split("-")
    url = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{lang[:2]}/{lang}/{name}/{quality}/MODEL_CARD"
    OUT.mkdir(exist_ok=True)
    target = OUT / "voice-license.txt"
    try:
        card = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "replace")
    except Exception as e:  # the license record is informative; the narration itself is checked separately
        print(f"::warning::could not fetch the voice model card ({e})", flush=True)
        card = f"(model card could not be downloaded: {e})"
    with target.open("a") as fh:  # one block per voice used in this video
        fh.write(f"Voice: {voice}\nSource: {url}\n\n{card}\n\n{'-' * 60}\n\n")
    log(f"[voice] model card saved to {target}:\n{card.strip()}\n")


def synth(engine: str, onnx: Path | None, text: str, out: Path, scale: float) -> np.ndarray:
    out.parent.mkdir(parents=True, exist_ok=True)
    if engine == "piper":
        r = run(
            [sys.executable, "-m", "piper", "-m", str(onnx), "-f", str(out),
             "--length-scale", f"{scale:.3f}", "--sentence-silence", "0.15"],
            input=text,
        )
    else:
        exe = shutil.which("espeak-ng")
        if not exe:
            die("espeak-dev engine requested but espeak-ng is not installed")
        r = run([exe, "-v", "en-us", "-s", str(int(160 / scale)), "-w", str(out), text])
    if r.returncode != 0 or not out.exists() or out.stat().st_size < 2000:
        die(f"{engine} produced no audio for {text!r} (exit {r.returncode}): {r.stderr.strip()[-600:]}")
    samples, rate = read_wav(out)
    if rate != RATE:  # resample to the common rate
        n = int(round(len(samples) * RATE / rate))
        samples = np.interp(np.linspace(0, len(samples) - 1, n), np.arange(len(samples)), samples).astype(np.float32)
    return trim(samples)


# Voice effects. Each keeps the clip's length, so caption timing measured on the clean voice still holds.
EFFECTS = {
    # a caller on the phone: slightly brighter and younger, narrow telephone band
    "phone": "asetrate=22050*1.05,aresample=22050,atempo=0.952381,highpass=f=320,lowpass=f=3300,"
             "acompressor=threshold=0.1:ratio=3:makeup=2",
    # a voice on the other side of a closed door: a touch lower, muffled, a little hallway echo
    "door": "asetrate=22050*0.96,aresample=22050,atempo=1.041667,highpass=f=110,lowpass=f=1100,"
            "aecho=0.7:0.5:38:0.22,volume=1.6",
}


def apply_effect(samples: np.ndarray, effect: str | None, work: Path) -> np.ndarray:
    if not effect:
        return samples
    if effect not in EFFECTS:
        die(f"unknown voice effect '{effect}'")
    src, dst = work / "fx-in.wav", work / "fx-out.wav"
    write_wav(src, samples)
    r = run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", EFFECTS[effect], "-ar", str(RATE), "-ac", "1", str(dst)])
    if r.returncode != 0:
        die(f"voice effect '{effect}' failed: {r.stderr.strip()[-400:]}")
    out, _ = read_wav(dst)
    if len(out) < len(samples):
        out = np.concatenate([out, np.zeros(len(samples) - len(out), dtype=np.float32)])
    out = out[: len(samples)]
    return soft_limit(out * loudness_gain([out]))


def trim(samples: np.ndarray, floor: float = 0.01, pad: float = 0.03) -> np.ndarray:
    """Remove leading/trailing silence so sentence timing is exact."""
    loud = np.flatnonzero(np.abs(samples) > floor)
    if len(loud) == 0:
        return samples
    a = max(0, loud[0] - int(pad * RATE))
    b = min(len(samples), loud[-1] + int(pad * RATE))
    return samples[a:b]


def check_speech(label: str, samples: np.ndarray, wav: Path, expected: str, asr: bool, required: bool = True) -> None:
    """Fail unless the audio is audible, unclipped English speech that matches the script."""
    # an optional sample (an alternative voice offered for comparison) is reported, never fatal
    fail = die if required else (lambda msg: print(f"::warning::{msg}", flush=True))
    seconds = len(samples) / RATE
    level, peak = db(rms(samples)), db(float(np.max(np.abs(samples))) if len(samples) else 0)
    n_words = len(words_of(expected))
    log(f"[check] {label}: {seconds:.2f}s, level {level:.1f} dBFS, peak {peak:.1f} dBFS, {n_words} words")
    if seconds < n_words * 0.12:
        fail(f"{label}: only {seconds:.2f}s of audio for {n_words} words - speech is missing")
    if level < -32:
        fail(f"{label}: audio is too quiet ({level:.1f} dBFS)")
    if peak > -0.2:
        fail(f"{label}: audio is clipping (peak {peak:.1f} dBFS)")
    if asr:
        try:
            heard = transcribe(wav)
        except Exception as e:
            fail(f"{label}: speech-to-text check could not run: {type(e).__name__}: {e}")
        recall, missed = word_recall(expected, heard)
        log(f"[check] {label}: speech-to-text heard: \"{heard}\"")
        log(f"[check] {label}: {recall * 100:.0f}% of the script words recognised" + (f" (missed: {missed})" if missed else ""))
        if recall < 0.85:
            fail(f"{label}: the voice is not intelligible enough - only {recall * 100:.0f}% of the words were recognised. Heard: \"{heard}\"")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("short")
    ap.add_argument("--engine", default="piper", choices=["piper", "espeak-dev"])
    ap.add_argument("--preview-only", action="store_true", help="only make and check out/voice-preview.wav")
    ap.add_argument("--no-asr", action="store_true", help="skip the speech-to-text check (offline development only)")
    args = ap.parse_args()
    asr = not args.no_asr

    cfg = json.loads((ROOT / "src" / "shorts" / args.short / "narration.json").read_text())
    for line in cfg["lines"]:
        # A caption is either plain text, or {"show": on-screen text, "say": how it is spoken}.
        line["captions"] = [c if isinstance(c, dict) else {"show": c, "say": c} for c in line["captions"]]
        line["text"] = " ".join(c["show"] for c in line["captions"])
        line["spoken"] = " ".join(c["say"] for c in line["captions"])
    speechlib.PRONUNCIATIONS.update({k.lower(): v for k, v in cfg.get("pronunciations", {}).items()})
    pub = ROOT / "public" / "shorts" / args.short
    work = OUT / "voice-work"
    OUT.mkdir(exist_ok=True)

    (OUT / "voice-license.txt").unlink(missing_ok=True)
    models: dict[str, Path | None] = {}

    def model(voice: str) -> Path | None:
        """The voice model for a line; each voice is downloaded once and its license card recorded."""
        if voice not in models:
            models[voice] = ensure_piper_voice(voice) if args.engine == "piper" else None
        return models[voice]

    onnx = None
    if args.engine == "piper":
        try:
            import piper  # noqa: F401
        except ImportError as e:
            die(f"Piper is not installed: {e}")
        onnx = model(cfg["voice"])
    else:
        print("::warning::espeak-dev engine: robotic development voice, not for publishing", flush=True)
    voice_name = cfg["voice"] if args.engine == "piper" else "espeak-ng (development only)"
    scale = float(cfg.get("lengthScale", 1.0))

    # 1) A short sample first: proves the voice works before anything is rendered.
    preview_text = cfg["previewText"]
    sample = synth(args.engine, onnx, preview_text, work / "preview-raw.wav", scale)
    sample = soft_limit(sample * loudness_gain([sample]))
    write_wav(OUT / "voice-preview.wav", sample)
    check_speech("voice-preview.wav", sample, OUT / "voice-preview.wav", preview_text, asr)
    log(f"[voice] sample OK: {OUT / 'voice-preview.wav'} ({voice_name})")
    # Extra samples (e.g. a second character's voice with its effect), each checked the same way.
    for extra_sample in cfg.get("voiceSamples", []):
        v = extra_sample.get("voice", cfg["voice"])
        dry = synth(args.engine, model(v), extra_sample["text"], work / "sample-raw.wav", scale * float(extra_sample.get("lengthScale", 1.0)))
        dry = soft_limit(dry * loudness_gain([dry]))
        target = OUT / extra_sample["file"]
        write_wav(target, apply_effect(dry, extra_sample.get("effect"), work))
        write_wav(work / "sample-dry.wav", dry)
        check_speech(extra_sample["file"], dry, work / "sample-dry.wav", extra_sample["text"], asr, required=not extra_sample.get("optional", False))
        log(f"[voice] sample OK: {target} ({v if args.engine == 'piper' else voice_name}, effect: {extra_sample.get('effect') or 'none'})")
    if args.preview_only:
        return 0

    # 2) Full narration. To land inside the length window we first stretch the pauses between
    #    sentences (time for each animation to land), and only then nudge the speaking speed.
    base_gap, lead, base_tail = float(cfg["gapSeconds"]), float(cfg["leadInSeconds"]), float(cfg["tailSeconds"])
    max_gap, max_tail = float(cfg.get("maxGapSeconds", 1.0)), float(cfg.get("maxTailSeconds", 2.2))
    min_scale, max_scale = float(cfg.get("minLengthScale", 0.88)), float(cfg.get("maxLengthScale", 1.15))
    lo, hi = float(cfg["minSeconds"]), float(cfg["maxSeconds"])
    n_gaps = len(cfg["lines"]) - 1
    # A line can ask for its own pause ("pauseAfter"), e.g. a beat after a question.
    own = [float(l.get("pauseAfter", base_gap)) for l in cfg["lines"][:-1]]
    extra = sum(own) - base_gap * n_gaps
    clips: list[np.ndarray] = []
    total, gap, tail = 0.0, base_gap, base_tail
    for attempt in range(4):
        clips = [synth(args.engine, model(l.get("voice", cfg["voice"])), l["spoken"], work / f"{l['id']}.wav",
                       scale * float(l.get("lengthScale", 1.0))) for l in cfg["lines"]]
        speech = sum(len(c) for c in clips) / RATE
        gap, tail = base_gap, base_tail
        total = lead + speech + gap * n_gaps + extra + tail
        short = (lo + 1.0) - total
        if short > 0:
            add = min(short, (max_gap - base_gap) * n_gaps)
            gap += add / n_gaps
            tail += min(short - add, max_tail - base_tail)
            total = lead + speech + gap * n_gaps + extra + tail
        log(f"[voice] attempt {attempt + 1}: speed scale {scale:.3f} -> {speech:.2f}s of speech, "
            f"{gap:.2f}s pauses, {tail:.2f}s ending = {total:.2f}s total")
        if lo + 0.9 <= total <= hi - 0.7:
            break
        wanted = (lo + 1.0) if total < lo + 0.9 else (hi - 1.0)
        scale = max(min_scale, min(max_scale, scale * (speech + wanted - total) / speech))
    if not (lo + 0.3 <= total <= hi - 0.3):
        die(f"narration makes a {total:.2f}s video, outside {lo:.0f}-{hi:.0f}s; shorten or lengthen the script")

    # 3) One narration track on the video timeline, at a single consistent loudness.
    # every sentence at -18 dBFS RMS (voices differ in level), peaks rounded off below -1.5 dBFS
    track = np.zeros(int(round(total * RATE)), dtype=np.float32)
    lines, captions, methods = [], [], set()
    t = lead
    for line, clip in zip(cfg["lines"], clips):
        clip = soft_limit(clip * loudness_gain([clip]))  # the clean voice: checked and used for caption timing
        start = int(round(t * RATE))
        track[start:start + len(clip)] = apply_effect(clip, line.get("effect"), work)
        dur = len(clip) / RATE
        write_wav(work / f"{line['id']}-final.wav", clip)
        check_speech(f"line '{line['id']}'", clip, work / f"{line['id']}-final.wav", line["spoken"], asr=False)

        # Caption timing comes from where each word really is in the audio.
        words, method = word_times(clip, RATE, line["spoken"], work / f"{line['id']}-final.wav", asr)
        methods.add(method)
        i = 0
        for cap in line["captions"]:
            n = len(words_of(cap["say"]))
            first, last = words[i], words[i + n - 1]
            captions.append({"text": cap["show"], "spoken": cap["say"], "line": line["id"],
                             "start": round(t + first[1], 3), "end": round(t + last[2], 3)})
            i += n
        lines.append({"id": line["id"], "text": line["text"], "spoken": line["spoken"], "speaker": line.get("speaker", "narrator"), "start": round(t, 3), "duration": round(dur, 3)})
        t += dur + (own[len(lines) - 1] + gap - base_gap if len(lines) <= n_gaps else 0.0)

    # Each caption stays up until the next one starts (or a beat after the sentence ends).
    for a, b in zip(captions, captions[1:]):
        a["end"] = b["start"] if b["start"] - a["end"] < 0.45 else round(a["end"] + 0.25, 3)
    captions[-1]["end"] = round(captions[-1]["end"] + 0.6, 3)

    write_wav(pub / "narration.wav", track, channels=2)  # stereo, so the renderer keeps it at full level
    full_text = " ".join(l["text"] for l in lines)
    check_speech("narration.wav", track, pub / "narration.wav", full_text, asr)

    timing = {
        "engine": args.engine,
        "voice": voice_name,
        "lengthScale": round(scale, 3),
        "totalSeconds": round(total, 3),
        "minSeconds": lo,
        "maxSeconds": hi,
        "audio": f"shorts/{args.short}/narration.wav",
        "captionSync": " + ".join(sorted(methods)),
        "lines": lines,
        "captions": captions,
    }
    (pub / "timing.json").write_text(json.dumps(timing, indent=2) + "\n")
    log(f"[voice] narration OK: {total:.2f}s, {len(captions)} captions -> {pub / 'timing.json'}")
    for c in captions:
        log(f"    {c['start']:6.2f} - {c['end']:6.2f}  {c['text']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
