"""
feature_extraction.py

Converts labeled WAV clips into MFCC feature vectors for classification.
This is the "DSP" stage from the project architecture: noise filtering +
salient feature extraction, done in Python for training. The same MFCC
approach is what Edge Impulse uses on-device if you later port the model
to the ESP32.
"""

import os
import numpy as np
import librosa
from scipy.signal import butter, lfilter

SAMPLE_RATE = 16000
N_MFCC = 13


def highpass_filter(y, sr, cutoff=100, order=4):
    """Removes low-frequency rumble (wind, ground vibration) below `cutoff` Hz."""
    b, a = butter(order, cutoff / (sr / 2), btype="high")
    return lfilter(b, a, y)


def extract_features(path, sr=SAMPLE_RATE, n_mfcc=N_MFCC):
    """Loads a WAV file and returns a fixed-length MFCC feature vector."""
    y, loaded_sr = librosa.load(path, sr=sr, mono=True)
    y = highpass_filter(y, sr)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    # Use mean + std across time for a compact, fixed-length vector per clip
    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std = np.std(mfcc, axis=1)
    return np.concatenate([mfcc_mean, mfcc_std])


def build_dataset(data_dir):
    """
    Walks a folder structured as data_dir/<class_name>/*.wav and returns
    (X, y, label_names) ready for scikit-learn.
    """
    X, y = [], []
    label_names = sorted(
        [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
    )
    label_to_idx = {name: i for i, name in enumerate(label_names)}

    for label in label_names:
        class_dir = os.path.join(data_dir, label)
        for fname in os.listdir(class_dir):
            if not fname.lower().endswith(".wav"):
                continue
            path = os.path.join(class_dir, fname)
            try:
                features = extract_features(path)
                X.append(features)
                y.append(label_to_idx[label])
            except Exception as e:
                print(f"Skipping {path}: {e}")

    return np.array(X), np.array(y), label_names


if __name__ == "__main__":
    import sys

    data_dir = sys.argv[1] if len(sys.argv) > 1 else "../dataset/data"
    X, y, labels = build_dataset(data_dir)
    print(f"Extracted features: X={X.shape}, y={y.shape}, labels={labels}")
