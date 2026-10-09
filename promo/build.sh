#!/usr/bin/env bash
# Rebuilds the velorci ad.
#
#   ./build.sh                       54 s cut with the Gulf voice-over (Microsoft neural TTS, needs network)
#                                    -> deliverables/velorci-ad.mp4 and velorci-ad_no-vo.mp4
#   ./build.sh --vo voice.wav        same, with a recorded voice-over (aligned to 0 s) instead of TTS
#   ./build.sh --vo-lines dir/       same, with one wav per phrase (intro.wav, f1.wav … f13.wav, logo.wav) placed on its cue
#   ./build.sh --cut 30              fast 30 s cut, music only -> deliverables/velorci-ad-30s.mp4
#   ./build.sh --skip-render ...     reuse the rendered picture in out/ (audio-only changes)
#
# Needs: node + playwright (Chromium), ffmpeg, python3 with numpy, scipy (and edge-tts for the TTS voice-over).
set -euo pipefail
cd "$(dirname "$0")"

VO=""; LINES=""; RENDER=1; CUT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --vo) VO="$2"; shift 2 ;;
    --vo-lines) LINES="$2"; shift 2 ;;
    --cut) CUT="$2"; shift 2 ;;
    --skip-render) RENDER=0; shift ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

mkdir -p out deliverables
if [ "$CUT" = 30 ]; then
  [ "$RENDER" = 1 ] && node render.mjs --timing timing-30s.json
  python3 audio/build_audio.py --timing timing-30s.json
  python3 mux.py out/velorci-ad-30s.video.mp4 out/velorci-ad-30s.mix_music.wav deliverables/velorci-ad-30s.mp4
  exit 0
fi

[ "$RENDER" = 1 ] && node render.mjs
if [ -n "$VO" ]; then python3 audio/build_audio.py --vo "$VO"
elif [ -n "$LINES" ]; then python3 audio/build_audio.py --vo-lines "$LINES"
else python3 audio/build_audio.py --edge-vo; fi
python3 mux.py out/velorci-ad.video.mp4 out/velorci-ad.mix_vo.wav deliverables/velorci-ad.mp4
python3 mux.py out/velorci-ad.video.mp4 out/velorci-ad.mix_music.wav deliverables/velorci-ad_no-vo.mp4
ffmpeg -hide_banner -loglevel error -y -i out/velorci-ad.video.mp4 -frames:v 1 -q:v 2 deliverables/cover.jpg
