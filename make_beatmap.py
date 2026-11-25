#!/usr/bin/env python3
"""Make a beat map (kick/bass hits + bass envelope) for a track, so the background can pulse with it.
Usage:  python tools/make_beatmap.py music/song.mp3
Writes: music/song.beats.js   (then add  beats:'music/song.beats.js'  to the track in js/tracks.js)
Needs:  ffmpeg on PATH, and  pip install numpy scipy"""
import sys, json, base64, subprocess, pathlib
import numpy as np
from scipy.signal import butter, sosfiltfilt, find_peaks

src = pathlib.Path(sys.argv[1])
sr = 22050
raw = subprocess.run(['ffmpeg','-v','error','-i',str(src),'-ac','1','-ar',str(sr),'-f','f32le','-'],
                     capture_output=True, check=True).stdout
y = np.frombuffer(raw, dtype=np.float32)
b = sosfiltfilt(butter(4, [35, 150], btype='band', fs=sr, output='sos'), y)   # kick + bass band
hop = sr // 50                                                                 # 50 frames per second
n = len(b) // hop
env = np.sqrt((b[:n*hop].reshape(n, hop) ** 2).mean(axis=1))
env = np.clip(env / np.percentile(env, 99.5), 0, 1)
avg = np.convolve(env, np.ones(25) / 25, mode='same')
d = np.convolve(np.maximum(0, env - avg * 1.05), np.ones(3) / 3, mode='same')  # rise above local average
pk, _ = find_peaks(d, height=max(0.12, np.percentile(d, 80)), distance=6)      # hits >= 0.12 s apart
strength = np.clip(d[pk] / np.percentile(d[pk], 90), 0.45, 1.0)
beats = [[round(float(p / 50), 2), round(float(s), 2)] for p, s in zip(pk, strength)]
env25 = base64.b64encode((env[::2] * 255).astype(np.uint8).tobytes()).decode()
out = src.with_suffix('.beats.js')
out.write_text("(window.BEATMAPS=window.BEATMAPS||{})['%s']=%s;\n" % (src.as_posix(), json.dumps({'beats': beats, 'env': env25}, separators=(',', ':'))))
print(f'{len(beats)} hits -> {out}')
