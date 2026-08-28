# Run Guide

Full step-by-step instructions to get the whole system running, software-first,
then optionally with real hardware. Follow in order — each step is checkable
before moving to the next.

Prerequisites: Python 3.9+, Node.js 18+, and (for step 2) an MQTT broker.

---

## Step 1 — Generate a dataset

```bash
cd dataset
pip install -r requirements.txt
python generate_synthetic_dataset.py --out ./data --clips_per_class 60
```

**Check:** you should see a new `dataset/data/` folder with 4 subfolders
(`footsteps`, `vehicle`, `glass_break`, `normal`), each containing ~60 `.wav`
files.

*(Optional, do this before your final demo: replace with real audio — see
`dataset/README.md`.)*

---

## Step 2 — Train the model

```bash
cd ../ml
pip install -r requirements.txt
python train_model.py --data ../dataset/data --out ./model
```

**Check:** the script prints a classification report and confusion matrix,
and creates `ml/model/model.pkl` and `ml/model/labels.json`. On synthetic
data you should see very high accuracy (this is expected — synthetic classes
are cleanly separated; real audio will be lower, which is normal and fine to
report honestly).

---

## Step 3 — Install and start the MQTT broker

**Install Mosquitto:**
- **Windows:** download the installer from https://mosquitto.org/download/
- **Mac:** `brew install mosquitto`
- **Linux (Debian/Ubuntu):** `sudo apt update && sudo apt install mosquitto mosquitto-clients`

**Start it with the provided config** (enables both raw MQTT on 1883 and
WebSockets on 9001 for the browser dashboard):

```bash
cd ../mosquitto
mosquitto -c mosquitto.conf -v
```

**Check:** you should see log lines like `Opening ipv4 listen socket on port 1883.`
and `...port 9001.` with no errors. Leave this terminal running.

> Alternative: if you'd rather not install anything locally, sign up for a
> free broker at HiveMQ Cloud or EMQX Cloud (both support WebSockets) and
> point `--broker`/`BROKER_URL` at that host instead in the steps below.

---

## Step 4 — Start the simulator (stands in for the ESP32)

Open a **new terminal**:

```bash
cd backend
pip install -r requirements.txt
python simulator.py --broker localhost --port 1883 --data ../dataset/data --model ../ml/model
```

**Check:** every few seconds you should see lines like:
```
Published: {"event": "footsteps", "confidence": 0.94, ...}
```

If you get a connection error, confirm the broker from Step 3 is still
running and the `--broker`/port match.

---

## Step 5 — Start the dashboard

Open **another new terminal**:

```bash
cd dashboard
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`) in your browser.

**Check:** the status pill in the top right should say "Broker connected",
and within a few seconds you'll see event cards and log rows appearing live,
matching what the simulator is publishing.

If it says "Connection error" or never leaves "Connecting...": your browser
needs the **WebSocket** port (9001), not 1883 — double check
`dashboard/src/App.jsx` has `const BROKER_URL = "ws://localhost:9001"` and
that Mosquitto's `mosquitto.conf` websocket listener started cleanly in Step 3.

**At this point you have a fully working end-to-end software demo.**

---

## Step 6 — (Optional) Bring in the real ESP32 + microphone

1. Wire the INMP441 per `firmware/README.md`.
2. Flash `firmware/i2s_audio_capture/i2s_audio_capture.ino`, confirm clean
   waveform in Serial Plotter.
3. Flash `firmware/esp32_serial_stream/esp32_serial_stream.ino`.
4. Stop the simulator (Ctrl+C in that terminal) and instead run:
   ```bash
   cd backend
   python live_classifier.py --serial_port <YOUR_PORT> --broker localhost --model ../ml/model
   ```
   (see `firmware/README.md` for finding `<YOUR_PORT>` on your OS)
5. The dashboard needs no changes — it keeps listening on the same MQTT topic.

**Check:** tap/clap/walk near the real mic and watch matching events appear
on the dashboard within ~1-3 seconds.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `ModuleNotFoundError` in Python scripts | Forgot `pip install -r requirements.txt` in that folder |
| Simulator can't connect to broker | Mosquitto not running, or wrong `--broker`/`--port` |
| Dashboard stuck on "Connecting..." | Using port 1883 instead of 9001, or Mosquitto's websocket listener didn't start — check its logs |
| `train_model.py` errors on empty dataset | Run Step 1 first, or check `--data` path points at the folder *containing* the class subfolders |
| ESP32 not detected by Arduino IDE | Install CP2102/CH340 USB driver for your board, try a different USB cable (some are power-only) |
| Very low real-world accuracy after swapping in real audio | Expected initially — collect more real samples per class, especially more `normal` ambient clips to cut false positives |
