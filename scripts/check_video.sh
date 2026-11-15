#!/usr/bin/env bash
# Verifies a rendered Short: vertical 1080x1920 video, 25-30 s, and audible narration.
# Usage: bash scripts/check_video.sh out/airplane-window-short.mp4
set -euo pipefail
FILE="${1:?usage: check_video.sh <file.mp4>}"
MIN_SECONDS="${MIN_SECONDS:-25}"
MAX_SECONDS="${MAX_SECONDS:-30}"
fail() { echo "::error::$*"; echo "CHECK FAILED: $*"; exit 1; }

[ -s "$FILE" ] || fail "$FILE is missing or empty"

probe() { ffprobe -v error -select_streams "$1" -show_entries "$2" -of default=nw=1:nk=1 "$FILE" | head -n1; }

vcodec=$(probe v:0 stream=codec_name)
width=$(probe v:0 stream=width)
height=$(probe v:0 stream=height)
frames=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of default=nw=1:nk=1 "$FILE" | head -n1 | tr -dc 0-9)
acodec=$(probe a:0 stream=codec_name)
duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$FILE")

echo "Video: ${vcodec:-none} ${width}x${height}, ${frames} frames"
echo "Audio: ${acodec:-none}"
echo "Duration: ${duration}s"

[ -n "$vcodec" ] || fail "no video stream"
[ "$width" = "1080" ] && [ "$height" = "1920" ] || fail "expected 1080x1920, got ${width}x${height}"
[ "${frames:-0}" -gt 100 ] || fail "too few video frames ($frames)"
[ -n "$acodec" ] || fail "no audio stream"
awk -v d="$duration" -v lo="$MIN_SECONDS" -v hi="$MAX_SECONDS" 'BEGIN { exit !(d >= lo && d <= hi) }' \
  || fail "duration ${duration}s is outside ${MIN_SECONDS}-${MAX_SECONDS}s"

# Loudness: the mix must be clearly audible, not silence.
vol=$(ffmpeg -hide_banner -nostats -i "$FILE" -map 0:a:0 -af volumedetect -f null - 2>&1)
mean=$(echo "$vol" | sed -n 's/.*mean_volume: \(-\?[0-9.]*\) dB.*/\1/p')
max=$(echo "$vol" | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB.*/\1/p')
echo "Audio level: mean ${mean} dB, peak ${max} dB"
awk -v m="$mean" 'BEGIN { exit !(m > -35) }' || fail "audio too quiet (mean ${mean} dB)"
awk -v m="$max" 'BEGIN { exit !(m > -12) }' || fail "audio peak too low (${max} dB)"

# Narration coverage: most of the runtime must contain sound (speech), not silence.
silence=$(ffmpeg -hide_banner -nostats -i "$FILE" -map 0:a:0 -af silencedetect=noise=-45dB:d=0.6 -f null - 2>&1 \
  | sed -n 's/.*silence_duration: \([0-9.]*\).*/\1/p' | awk '{s+=$1} END {printf "%.2f", s+0}')
echo "Silent time: ${silence}s of ${duration}s"
awk -v s="$silence" -v d="$duration" 'BEGIN { exit !(s < d * 0.35) }' || fail "too much silence (${silence}s) - narration missing?"

echo "All checks passed: $FILE"
