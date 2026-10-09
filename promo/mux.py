"""Mux the rendered picture with an audio mix, loudness-normalised for social feeds (-14 LUFS, -1.5 dBTP).

    python3 promo/mux.py out/velorci-ad.video.mp4 out/velorci-ad.mix_vo.wav deliverables/velorci-ad.mp4
"""
import json
import subprocess
import sys

video, audio, target = sys.argv[1:4]
LOUD = 'I=-14:TP=-1.5:LRA=11'

# pass 1: measure
p = subprocess.run(['ffmpeg', '-hide_banner', '-i', audio, '-af', f'loudnorm={LOUD}:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True, check=True)
m = json.loads(p.stderr[p.stderr.rindex('{'):p.stderr.rindex('}') + 1])

# pass 2: apply (linear gain where possible, so the mix dynamics are untouched)
af = (f"loudnorm={LOUD}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-i', audio,
                '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '192k',
                '-shortest', '-movflags', '+faststart', target], check=True)
print('wrote', target)
