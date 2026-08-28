# Autonomous Perimeter Intrusion Detection

Acoustic sensing (ESP32 + MEMS mic) → DSP feature extraction → ML classification
→ MQTT → live React dashboard.

```
[MEMS Mic] --I2S--> [ESP32] --> [DSP: filter + MFCC] --> [ML classifier]
                                                                |
                                                       MQTT publish (WiFi)
                                                                |
                                                    [Mosquitto broker]
                                                                |
                                                [React dashboard, live view]
```

## Project layout

```
dataset/    synthetic + real dataset generation/organization
ml/         feature extraction (MFCC) + model training (Random Forest)
backend/    MQTT simulator (software-only demo) + live classifier (real hardware)
mosquitto/  local MQTT broker config (MQTT + WebSocket listeners)
dashboard/  React app, live event feed
firmware/   ESP32 Arduino sketches (wiring test, serial stream, full edge ML)
```

## Quick start — see `RUN_GUIDE.md` for full step-by-step instructions

Fastest path to see the whole thing working, no hardware required:

```bash
# 1. Generate a dataset and train the model
cd dataset && pip install -r requirements.txt && python generate_synthetic_dataset.py --out ./data --clips_per_class 60
cd ../ml && pip install -r requirements.txt && python train_model.py --data ../dataset/data --out ./model

# 2. Start the MQTT broker (needs mosquitto installed)
mosquitto -c ../mosquitto/mosquitto.conf

# 3. In a new terminal: start the simulator (stands in for the ESP32)
cd ../backend && pip install -r requirements.txt && python simulator.py

# 4. In a new terminal: start the dashboard
cd ../dashboard && npm install && npm run dev
```

Then open the dashboard URL Vite prints (usually `http://localhost:5173`) —
you'll see simulated events streaming in live.

## Swapping in real hardware later

See `firmware/README.md`. Short version: flash `esp32_serial_stream`, then run
`backend/live_classifier.py` instead of `simulator.py` — everything else
(model, broker, dashboard) stays exactly the same.

## Swapping in real audio data

The synthetic dataset gets your pipeline running immediately but isn't real
audio. See `dataset/README.md` for recording your own clips or pulling from
ESC-50 / UrbanSound8K before your final demo/report.
