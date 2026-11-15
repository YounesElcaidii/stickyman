"""Shared audio + speech helpers for the narration and render checks.

- read/write WAV as numpy arrays
- forced alignment (pocketsphinx): exact start/end time of every spoken word
- speech-to-text (faster-whisper): what a listener would actually hear
"""

from __future__ import annotations

import re
import subprocess
import wave
from pathlib import Path

import numpy as np

RATE = 22050  # everything is processed as 22.05 kHz mono


def log(msg: str) -> None:
    print(msg, flush=True)


def read_wav(path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(path), "rb") as w:
        assert w.getsampwidth() == 2, f"{path}: expected 16-bit PCM"
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            data = data.reshape(-1, w.getnchannels()).mean(axis=1)
        return data, w.getframerate()


def write_wav(path: Path, samples: np.ndarray, rate: int = RATE, channels: int = 1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(samples, -1.0, 1.0) * 32767.0).astype("<i2")
    if channels == 2:
        pcm = np.repeat(pcm, 2)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def loudness_gain(clips: list[np.ndarray], target_rms_db: float = -18.0) -> float:
    """One gain for all clips so the speech sits at a consistent, loud level."""
    return 10 ** (target_rms_db / 20) / max(1e-6, rms(np.concatenate(clips)))


def soft_limit(samples: np.ndarray, ceiling_db: float = -1.5) -> np.ndarray:
    """Rounds off the few loudest peaks instead of clipping them; never exceeds the ceiling."""
    ceiling = 10 ** (ceiling_db / 20)
    return (np.tanh(samples / ceiling) * ceiling).astype(np.float32)


def decode_audio(path: Path, rate: int = RATE) -> np.ndarray:
    """Decode the first audio stream of any media file to mono float samples."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", str(rate), "-f", "s16le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


def db(x: float) -> float:
    return 20.0 * float(np.log10(max(x, 1e-9)))


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0


def words_of(text: str) -> list[str]:
    text = text.lower().replace("’", "'")
    return [w for w in re.sub(r"[^a-z' ]+", " ", text).split() if w.strip("'")]


PRONUNCIATIONS: dict[str, str] = {}  # extra words for the aligner (ARPAbet), set per Short


def align_words(samples: np.ndarray, rate: int, text: str) -> list[tuple[str, float, float]]:
    """Forced alignment: returns (word, start_seconds, end_seconds) for every word of `text`."""
    from pocketsphinx import Decoder

    words = words_of(text)
    decoder = Decoder(samprate=rate, loglevel="FATAL")
    for w, phones in PRONUNCIATIONS.items():
        if decoder.lookup_word(w) is None:
            decoder.add_word(w, phones, True)
    missing = [w for w in words if decoder.lookup_word(w) is None]
    if missing:
        raise RuntimeError(f"words missing from the alignment dictionary: {missing}")
    # The aligner needs a little room and a noise floor: pad with near-silence on both sides.
    pad = 0.3
    quiet = np.zeros(int(pad * rate), dtype=np.float32)
    padded = np.concatenate([quiet, samples, quiet])
    padded = padded + np.random.default_rng(0).normal(0, 0.0005, len(padded)).astype(np.float32)
    decoder.set_align_text(" ".join(words))
    decoder.start_utt()
    decoder.process_raw((np.clip(padded, -1, 1) * 32767).astype("<i2").tobytes(), full_utt=True)
    decoder.end_utt()
    segments = decoder.seg()
    if segments is None:
        raise RuntimeError("the aligner found no match for the script in the audio")
    frame = 1.0 / 100.0
    length = len(samples) / rate
    out = []
    for seg in segments:
        w = re.sub(r"\(\d+\)$", "", seg.word)
        if w.startswith("<") or w.startswith("("):
            continue
        start = min(length, max(0.0, seg.start_frame * frame - pad))
        end = min(length, max(start, (seg.end_frame + 1) * frame - pad))
        out.append((w, start, end))
    if [w for w, _, _ in out] != words:
        raise RuntimeError(f"alignment failed: expected {len(words)} words, aligned {len(out)}")
    return out


_whisper = None


def transcribe(path: Path, model_name: str = "base.en") -> str:
    """Speech-to-text with a small local Whisper model (downloaded once, no API key)."""
    global _whisper
    from faster_whisper import WhisperModel

    if _whisper is None:
        _whisper = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _info = _whisper.transcribe(decode_audio(path, 16000), language="en", beam_size=5)
    return " ".join(s.text.strip() for s in segments).strip()


def whisper_word_times(path: Path, text: str, model_name: str = "base.en") -> list[tuple[str, float, float]]:
    """Word timing from Whisper's word timestamps, matched onto the known script."""
    import difflib

    global _whisper
    from faster_whisper import WhisperModel

    if _whisper is None:
        _whisper = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _info = _whisper.transcribe(decode_audio(path, 16000), language="en", beam_size=5, word_timestamps=True)
    heard = []
    for seg in segments:
        for w in seg.words or []:
            for token in words_of(w.word):
                heard.append((token, float(w.start), float(w.end)))
    return match_word_times(words_of(text), heard)


def match_word_times(script: list[str], heard: list[tuple[str, float, float]]) -> list[tuple[str, float, float]]:
    """Map recognised word times onto the script words; unmatched words are interpolated."""
    import difflib

    sm = difflib.SequenceMatcher(a=script, b=[h[0] for h in heard], autojunk=False)
    times: list[tuple[float, float] | None] = [None] * len(script)
    for block in sm.get_matching_blocks():
        for k in range(block.size):
            times[block.a + k] = (heard[block.b + k][1], heard[block.b + k][2])
    matched = sum(t is not None for t in times)
    if not heard or matched < 0.6 * len(script):
        raise RuntimeError(f"only {matched} of {len(script)} script words were recognised")
    known = [i for i, t in enumerate(times) if t is not None]
    for i in range(len(script)):
        if times[i] is None:
            before = max([k for k in known if k < i], default=None)
            after = min([k for k in known if k > i], default=None)
            a = times[before][1] if before is not None else heard[0][1]
            b = times[after][0] if after is not None else heard[-1][2]
            lo_i = before if before is not None else -1
            hi_i = after if after is not None else len(script)
            step = (b - a) / (hi_i - lo_i)
            times[i] = (a + step * (i - lo_i - 0.5), a + step * (i - lo_i + 0.5))
    return [(w, t[0], t[1]) for w, t in zip(script, times)]


def estimate_word_times(samples: np.ndarray, rate: int, text: str) -> list[tuple[str, float, float]]:
    """Last resort: spread the words across the clip in proportion to their length."""
    words = words_of(text)
    weights = [len(w) + 2 for w in words]
    total, length, t, out = sum(weights), len(samples) / rate, 0.0, []
    for w, k in zip(words, weights):
        d = length * k / total
        out.append((w, t, t + d))
        t += d
    return out


def word_times(samples: np.ndarray, rate: int, text: str, wav: Path, use_whisper: bool) -> tuple[list[tuple[str, float, float]], str]:
    """Best available word timing for a clip, and the name of the method that produced it."""
    try:
        return align_words(samples, rate, text), "forced alignment"
    except Exception as e:
        log(f"[sync] forced alignment failed ({e}); trying speech-to-text word timestamps")
    if use_whisper:
        try:
            return whisper_word_times(wav, text), "speech-to-text word timestamps"
        except Exception as e:
            log(f"[sync] speech-to-text word timing failed ({type(e).__name__}: {e})")
    print(f"::warning::caption timing inside \"{text[:40]}...\" is estimated, not measured", flush=True)
    return estimate_word_times(samples, rate, text), "estimated"


def word_recall(expected_text: str, heard_text: str) -> tuple[float, list[str]]:
    """Share of the expected words that were heard (order-insensitive, counts respected)."""
    expected = words_of(expected_text)
    pool: dict[str, int] = {}
    for w in words_of(heard_text):
        pool[w] = pool.get(w, 0) + 1
    hit, missed = 0, []
    for w in expected:
        if pool.get(w, 0) > 0:
            pool[w] -= 1
            hit += 1
        else:
            missed.append(w)
    return (hit / max(1, len(expected))), missed
