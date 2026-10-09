"""Synthesises the Gulf voice-over lines with NAMAA-Space/NAMAA-Saudi-TTS v1 (MIT; a Chatterbox multilingual fine-tune).

    python audio/tts_namaa.py lines.json outdir/ [seeds]     lines.json = [["intro", "تبي تكبّر …"], ["f1", "…"], …]

Writes outdir/<name>_t<i>.wav, one file per take (3 takes by default, more with extra seeds such as 4,5,6) and skips
takes that already exist. The takes in audio/vo/ were chosen by transcribing every take (faster-whisper) and keeping
the one closest to the script; logo.wav is the brand name and the rest of the line, joined with a 0.3 s pause.
Needs: torch (CPU is fine, ~5 s of compute per second of speech), chatterbox-tts, safetensors, huggingface_hub.
Chatterbox adds an inaudible Perth watermark to everything it generates.
"""
import json
import os
import sys

import torch
import torchaudio as ta
from chatterbox import mtl_tts
from huggingface_hub import snapshot_download
from safetensors.torch import load_file

lines = json.load(open(sys.argv[1], encoding='utf-8'))
outdir = sys.argv[2]
os.makedirs(outdir, exist_ok=True)
TAKES = [dict(seed=1), dict(seed=2, exaggeration=0.65, cfg_weight=0.4), dict(seed=3)]
if len(sys.argv) > 3:
    TAKES += [dict(seed=int(s)) for s in sys.argv[3].split(',')]

ck = snapshot_download('NAMAA-Space/NAMAA-Saudi-TTS', allow_patterns=['t3_mtl23ls_v2.safetensors'])
model = mtl_tts.ChatterboxMultilingualTTS.from_pretrained(device='cpu')
model.t3.load_state_dict(load_file(f'{ck}/t3_mtl23ls_v2.safetensors', device='cpu'))
model.t3.to('cpu').eval()

for name, text in lines:
    for i, kw in enumerate(TAKES):
        out = os.path.join(outdir, f'{name}_t{i}.wav')
        if os.path.exists(out):
            continue
        kw = dict(kw)
        torch.manual_seed(kw.pop('seed'))
        wav = model.generate(text, language_id='ar', **kw)
        ta.save(out, wav, model.sr)
        print(f'{name} take {i}: {wav.shape[-1] / model.sr:.2f} s', flush=True)
