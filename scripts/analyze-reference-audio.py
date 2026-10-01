"""Measure reference musical beats. Optional offline dependency: pip install librosa."""
import argparse
import json
from pathlib import Path

import librosa
import numpy as np

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("audio", help="WAV extracted from the uploaded cut, starting at time zero")
parser.add_argument("output", help="Destination beat JSON")
args = parser.parse_args()
signal, sr = librosa.load(args.audio, sr=22050)
_, percussion = librosa.effects.hpss(signal)
hop = 256
strength = librosa.onset.onset_strength(y=percussion, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=strength, sr=sr, hop_length=hop, trim=False)
beat_ms = np.rint(librosa.frames_to_time(beats, sr=sr, hop_length=hop) * 1000).astype(int)
attacks = librosa.onset.onset_detect(onset_envelope=strength, sr=sr, hop_length=hop)
attack_ms = np.rint(librosa.frames_to_time(attacks, sr=sr, hop_length=hop) * 1000).astype(int)
times = []
for beat in beat_ms:
    if not 800 < beat < 25000:
        continue
    near = attack_ms[np.abs(attack_ms - beat) < 45]
    times.append(int(near[np.argmin(np.abs(near - beat))]) if len(near) else int(beat))
result = {
    "source": "Supplied 27.791667-second cover excerpt; times relative to this cut.",
    "method": "librosa HPSS percussion separation, onset strength, and beat tracking; these are musical beats, not forced vocal alignment.",
    "bpm": round(float(np.asarray(tempo).item()), 2),
    "beatMs": times,
}
Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(f"Measured {len(times)} beats at approximately {result['bpm']} BPM.")
