# Firmware

Three sketches, meant to be used in order as you bring hardware online.

## Setup (once)

1. Install [Arduino IDE](https://www.arduino.cc/en/software) (2.x recommended).
2. File > Preferences > Additional Board URLs, add:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-cp3-release/package_esp32_index.json`
3. Tools > Board > Boards Manager > search "esp32" > install "esp32 by Espressif Systems".
4. Tools > Board > select "ESP32 Dev Module".
5. Plug in your ESP32 via USB, select the correct port under Tools > Port.

## 1. `i2s_audio_capture/` — wiring test

Flash this first. Open Tools > Serial Plotter at 115200 baud. Tap/clap near the
mic — you should see waveform spikes. **Don't proceed until this works.**

## 2. `esp32_serial_stream/` — fastest path to a working demo

Identical audio capture, but meant to feed `backend/live_classifier.py` on
your PC over USB serial. This lets you reuse your already-trained Python
model without porting anything onto the ESP32. Recommended if you're on a
deadline.

Requires: `pyserial` (`pip install pyserial`, already in `backend/requirements.txt`).

## 3. `esp32_mqtt_publisher/` — full on-device edge ML (optional, do this last)

Runs classification directly on the ESP32 using a model trained on
[Edge Impulse](https://edgeimpulse.com) and publishes straight to MQTT/WiFi,
no PC needed. Requires exporting your Edge Impulse project as an "Arduino
library" and installing it + the `PubSubClient` library first. See the
comments at the top of the `.ino` file for the exact steps.

This is the version that best matches "edge-level ML" if your project
requirements/report specifically call that out — but it's more setup, so
only do it if steps 1–2 are already working and you have time left.

## Finding your serial port

- **Windows:** Device Manager > Ports (COM & LPT) — look for `COMx`
- **Mac:** `ls /dev/tty.usbserial-*` or `/dev/tty.SLAB_USBtoUART*`
- **Linux:** `ls /dev/ttyUSB*` or `/dev/ttyACM*`
