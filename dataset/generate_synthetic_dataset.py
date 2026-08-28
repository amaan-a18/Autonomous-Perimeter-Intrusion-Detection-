"""
generate_synthetic_dataset.py

Generates a labeled synthetic WAV dataset for the four acoustic classes used
in this project: footsteps, vehicle, glass_break, normal.

WHY SYNTHETIC DATA?
This lets you run the ENTIRE pipeline (features -> training -> MQTT -> dashboard)
immediately, with no downloads and no hardware. It is NOT a substitute for real
audio for your final report/demo -- swap this out with real recordings or a
downloaded dataset (see dataset/README.md) before you present.

Usage:
    python generate_synthetic_dataset.py --out ./data --clips_per_class 60
"""

import argparse
import os
import numpy as np
import soundfile as sf

SAMPLE_RATE = 16000
CLIP_SECONDS = 3


def make_footsteps(duration, sr):
    """Low-frequency thuds at irregular intervals, like footfall impacts."""
    n = int(duration * sr)
    audio = np.zeros(n)
    t_step = 0
    while t_step < duration:
        idx = int(t_step * sr)
        impact_len = int(0.08 * sr)
        env = np.exp(-np.linspace(0, 12, impact_len))
        tone = np.sin(2 * np.pi * np.random.uniform(60, 120) * np.linspace(0, 0.08, impact_len))
        impact = env * tone * np.random.uniform(0.6, 1.0)
        end = min(idx + impact_len, n)
        audio[idx:end] += impact[: end - idx]
        t_step += np.random.uniform(0.35, 0.6)
    audio += np.random.normal(0, 0.01, n)
    return audio


def make_vehicle(duration, sr):
    """Low rumble with harmonics, like an idling engine."""
    n = int(duration * sr)
    t = np.linspace(0, duration, n)
    base_freq = np.random.uniform(35, 55)
    audio = np.zeros(n)
    for harmonic in range(1, 6):
        audio += (1.0 / harmonic) * np.sin(2 * np.pi * base_freq * harmonic * t + np.random.uniform(0, 1))
    audio *= 0.3
    audio += np.random.normal(0, 0.03, n)
    return audio


def make_glass_break(duration, sr):
    """Sharp high-frequency transient burst, like breaking glass."""
    n = int(duration * sr)
    audio = np.random.normal(0, 0.02, n)
    burst_start = np.random.uniform(0.3, duration - 0.5)
    idx = int(burst_start * sr)
    burst_len = int(0.25 * sr)
    env = np.exp(-np.linspace(0, 8, burst_len))
    noise = np.random.normal(0, 1, burst_len)
    high_freqs = np.zeros(burst_len)
    tt = np.linspace(0, 0.25, burst_len)
    for f in np.random.uniform(2000, 7000, 6):
        high_freqs += np.sin(2 * np.pi * f * tt)
    burst = env * (0.6 * noise + 0.4 * high_freqs) * 0.8
    end = min(idx + burst_len, n)
    audio[idx:end] += burst[: end - idx]
    return audio


def make_normal(duration, sr):
    """Pink-ish ambient noise, like a quiet perimeter at night."""
    n = int(duration * sr)
    white = np.random.normal(0, 1, n)
    # simple pink noise approximation via cumulative filtering
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    from scipy.signal import lfilter
    pink = lfilter(b, a, white)
    pink = pink / (np.max(np.abs(pink)) + 1e-9) * 0.05
    return pink


GENERATORS = {
    "footsteps": make_footsteps,
    "vehicle": make_vehicle,
    "glass_break": make_glass_break,
    "normal": make_normal,
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="./data")
    parser.add_argument("--clips_per_class", type=int, default=60)
    parser.add_argument("--sr", type=int, default=SAMPLE_RATE)
    parser.add_argument("--duration", type=float, default=CLIP_SECONDS)
    args = parser.parse_args()

    for label, gen_fn in GENERATORS.items():
        class_dir = os.path.join(args.out, label)
        os.makedirs(class_dir, exist_ok=True)
        for i in range(args.clips_per_class):
            audio = gen_fn(args.duration, args.sr)
            audio = np.clip(audio, -1, 1)
            path = os.path.join(class_dir, f"{label}_{i:03d}.wav")
            sf.write(path, audio.astype(np.float32), args.sr)
        print(f"Generated {args.clips_per_class} clips for class '{label}' -> {class_dir}")

    print("\nDone. Dataset written to:", os.path.abspath(args.out))
    print("Replace these with real recordings/downloaded audio before your final demo.")


if __name__ == "__main__":
    main()
