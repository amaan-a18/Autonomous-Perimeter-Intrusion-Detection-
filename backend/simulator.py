"""
simulator.py

Stands in for the ESP32 during software-first development. It loads the
trained model, picks random clips from your dataset, classifies them, and
publishes MQTT alerts on the same topic scheme the real ESP32 will use
later. Point the React dashboard at your broker and this will drive it.

Usage:
    python simulator.py --broker localhost --port 1883 --data ../dataset/data --model ../ml/model
"""

import argparse
import json
import os
import random
import time
import sys

import joblib
import paho.mqtt.client as mqtt

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml"))
from feature_extraction import extract_features  # noqa: E402


def load_model(model_dir):
    model = joblib.load(os.path.join(model_dir, "model.pkl"))
    with open(os.path.join(model_dir, "labels.json")) as f:
        labels = json.load(f)
    return model, labels


def collect_clips(data_dir):
    clips = []
    for label in os.listdir(data_dir):
        class_dir = os.path.join(data_dir, label)
        if not os.path.isdir(class_dir):
            continue
        for fname in os.listdir(class_dir):
            if fname.lower().endswith(".wav"):
                clips.append(os.path.join(class_dir, fname))
    return clips


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--broker", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--data", default="../dataset/data")
    parser.add_argument("--model", default="../ml/model")
    parser.add_argument("--node", default="node1")
    parser.add_argument("--interval", type=float, default=4.0, help="seconds between simulated events")
    parser.add_argument("--username", default=None)
    parser.add_argument("--password", default=None)
    args = parser.parse_args()

    model, labels = load_model(args.model)
    clips = collect_clips(args.data)
    if not clips:
        print("No WAV clips found in", args.data)
        return

    client = mqtt.Client()
    if args.username:
        client.username_pw_set(args.username, args.password)
    client.connect(args.broker, args.port, keepalive=60)
    client.loop_start()

    topic = f"perimeter/{args.node}/alert"
    print(f"Publishing simulated events to '{topic}' every {args.interval}s. Ctrl+C to stop.")

    try:
        while True:
            clip_path = random.choice(clips)
            features = extract_features(clip_path).reshape(1, -1)
            pred_idx = model.predict(features)[0]
            probs = model.predict_proba(features)[0]
            label = labels[pred_idx]
            confidence = float(probs[pred_idx])

            payload = json.dumps(
                {
                    "event": label,
                    "confidence": round(confidence, 3),
                    "source_clip": os.path.basename(clip_path),
                    "timestamp": time.time(),
                }
            )
            client.publish(topic, payload)
            print(f"Published: {payload}")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
