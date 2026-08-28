"""
live_classifier.py

Phase 5 (hardware bring-up): receives raw audio from the real ESP32 over
serial, runs it through the same trained model, and publishes MQTT alerts.
This lets you keep the model/MQTT/dashboard exactly as validated in
software-only testing and just swap the data source.

Requires the ESP32 to be running firmware/esp32_serial_stream (streams
raw int16 PCM samples over serial at SAMPLE_RATE).

Usage:
    python live_classifier.py --serial_port /dev/ttyUSB0 --baud 115200 \
        --broker localhost --model ../ml/model
"""

import argparse
import json
import os
import sys
import time

import joblib
import numpy as np
import serial
import paho.mqtt.client as mqtt

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml"))
from feature_extraction import SAMPLE_RATE, N_MFCC  # noqa: E402
import librosa  # noqa: E402
from scipy.signal import butter, lfilter  # noqa: E402

WINDOW_SECONDS = 3
WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SECONDS


def highpass_filter(y, sr, cutoff=100, order=4):
    b, a = butter(order, cutoff / (sr / 2), btype="high")
    return lfilter(b, a, y)


def features_from_samples(samples):
    y = np.array(samples, dtype=np.float32) / 32768.0
    y = highpass_filter(y, SAMPLE_RATE)
    mfcc = librosa.feature.mfcc(y=y, sr=SAMPLE_RATE, n_mfcc=N_MFCC)
    return np.concatenate([np.mean(mfcc, axis=1), np.std(mfcc, axis=1)]).reshape(1, -1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--serial_port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--broker", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--model", default="../ml/model")
    parser.add_argument("--node", default="node1")
    args = parser.parse_args()

    model = joblib.load(os.path.join(args.model, "model.pkl"))
    with open(os.path.join(args.model, "labels.json")) as f:
        labels = json.load(f)

    ser = serial.Serial(args.serial_port, args.baud, timeout=1)
    client = mqtt.Client()
    client.connect(args.broker, args.port)
    client.loop_start()

    topic = f"perimeter/{args.node}/alert"
    buffer = []
    print(f"Listening on {args.serial_port} @ {args.baud} baud. Publishing to '{topic}'.")

    try:
        while True:
            line = ser.readline().decode(errors="ignore").strip()
            if not line:
                continue
            try:
                sample = int(line)
            except ValueError:
                continue
            buffer.append(sample)

            if len(buffer) >= WINDOW_SAMPLES:
                features = features_from_samples(buffer[-WINDOW_SAMPLES:])
                pred_idx = model.predict(features)[0]
                probs = model.predict_proba(features)[0]
                label = labels[pred_idx]
                confidence = float(probs[pred_idx])

                payload = json.dumps(
                    {"event": label, "confidence": round(confidence, 3), "timestamp": time.time()}
                )
                client.publish(topic, payload)
                print(f"Published: {payload}")
                buffer = []
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        client.loop_stop()
        client.disconnect()
        ser.close()


if __name__ == "__main__":
    main()
