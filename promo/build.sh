#!/usr/bin/env bash
# Rebuilds the velorci 30s ad.
#
#   ./build.sh                    picture + music/SFX            -> deliverables/velorci-ad-30s.mp4
#   ./build.sh --vo voice.wav     same, with a recorded VO       -> deliverables/velorci-ad-30s_vo.mp4
#   ./build.sh --skip-render ...  reuse out/video.mp4 (audio-only changes)
#
# Needs: node + playwright (Chromium), ffmpeg, python3 with numpy and scipy.
set -euo pipefail
cd "$(dirname "$0")"

VO=""
RENDER=1
while [ $# -gt 0 ]; do
  case "$1" in
    --vo) VO="$2"; shift 2 ;;
    --skip-render) RENDER=0; shift ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

mkdir -p out deliverables
[ "$RENDER" = 1 ] && node render.mjs

if [ -n "$VO" ]; then
  python3 audio/build_audio.py --vo "$VO"
  python3 mux.py out/video.mp4 out/mix_vo.wav deliverables/velorci-ad-30s_vo.mp4
else
  python3 audio/build_audio.py
fi
python3 mux.py out/video.mp4 out/mix_music.wav deliverables/velorci-ad-30s.mp4
ffmpeg -hide_banner -loglevel error -y -i out/video.mp4 -frames:v 1 -q:v 2 deliverables/cover.jpg
