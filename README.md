# Autonomous Perimeter Intrusion Detection Using Acoustic Sensors

An intelligent, vision-independent perimeter security system that uses
acoustic sensing, Digital Signal Processing (DSP), and Machine Learning
(ML) to detect and classify possible intrusion-related sounds in real
time.

## 📌 Project Overview

Traditional perimeter security systems often depend on cameras. However,
cameras may become less effective in conditions such as darkness, fog,
rain, smoke, or visual obstruction.

This project proposes an acoustic-based intrusion detection system using
an array of MEMS microphones connected to an ESP32. Captured sounds are
processed using DSP techniques and classified using Machine Learning.
The system can identify sounds such as:

-   👣 Footsteps
-   🚗 Vehicle engines
-   🪟 Glass breaking
-   🌿 Ambient/environmental noise

When a suspicious sound is detected, the system can communicate the
event using MQTT and display the detection information through a
React-based dashboard.

## 🎯 Objectives

-   Detect potential perimeter intrusions without relying on visual
    input.
-   Capture environmental audio using MEMS microphones.
-   Apply DSP techniques to process and extract useful audio features.
-   Use ML to distinguish threat-related sounds from ambient noise.
-   Provide real-time communication using MQTT.
-   Display alerts and monitoring information through a React dashboard.
-   Develop a low-cost prototype suitable for a mini project.

## 🏗️ System Architecture

``` text
MEMS Microphones
       ↓
     ESP32
       ↓
DSP & Feature Extraction
       ↓
ML Sound Classification
       ↓
   MQTT Broker
       ↓
 React Dashboard
```

## ⚙️ How It Works

1.  **Sound Capture** --- MEMS microphones capture sounds from the
    surrounding environment.
2.  **Edge Processing** --- The ESP32 receives acoustic sensor data and
    supports communication.
3.  **Digital Signal Processing** --- Audio signals are filtered and
    processed to reduce unwanted noise.
4.  **Feature Extraction** --- Relevant audio features are generated for
    ML classification.
5.  **ML Classification** --- The model classifies sounds such as
    footsteps, vehicle engines, glass breaking, or ambient noise.
6.  **MQTT Communication** --- Detection results are transmitted using
    MQTT for lightweight real-time communication.
7.  **React Dashboard** --- Detection results can be visualized through
    a web dashboard.

## 🧰 Technology Stack

### Hardware

-   ESP32
-   MEMS Microphones
-   Breadboard
-   Jumper Wires
-   Buzzer / LED indicators
-   USB Power Supply

### Software & Technologies

-   Digital Signal Processing (DSP)
-   Machine Learning
-   Python
-   MQTT
-   React
-   JavaScript
-   VS Code
-   Arduino IDE / PlatformIO

## 🔌 Hardware Components

  Component          Purpose
  ------------------ ----------------------------------------
  ESP32              Microcontroller and edge communication
  MEMS Microphone    Acoustic signal acquisition
  Buzzer             Local intrusion alert
  LED                Visual status indication
  Breadboard         Prototype circuit assembly
  Jumper Wires       Component connections
  USB Power Supply   Power source

## 💻 Software Components

  Component          Purpose
  ------------------ ---------------------------------------
  DSP                Audio filtering and signal processing
  Machine Learning   Sound classification
  MQTT               Real-time messaging
  React              Web-based monitoring dashboard
  Python             Data processing and ML development

## 📊 Expected Outcomes

-   Real-time acoustic intrusion detection.
-   Identification of common intrusion-related sounds.
-   Operation without depending on camera visibility.
-   Improved distinction between threats and normal environmental noise.
-   Real-time alerts and monitoring.
-   Low-cost and scalable prototype.

## 🌍 SDG Mapping

### SDG 9 --- Industry, Innovation and Infrastructure

The project demonstrates the use of IoT, DSP, Machine Learning, and
connected systems to develop an innovative smart-security
infrastructure.

### SDG 16 --- Peace, Justice and Strong Institutions

The system supports safer environments by enabling automated monitoring,
early detection of suspicious activity, and real-time security alerts.

## 💰 Estimated Cost

**₹1,500 -- ₹2,000** for the mini-project prototype.

The final cost may vary depending on the number of MEMS microphones,
ESP32 board type, enclosure, and other components used.

## 📁 Suggested Repository Structure

``` text
Autonomous-Perimeter-Intrusion-Detection/
│
├── hardware/
│   ├── esp32/
│   └── circuit-diagram/
├── dsp/
│   └── audio-processing/
├── ml/
│   ├── dataset/
│   ├── training/
│   └── models/
├── mqtt/
│   └── configuration/
├── frontend/
│   └── react-dashboard/
├── docs/
│   └── project-report/
├── README.md
└── LICENSE
```

## 🚀 Future Enhancements

-   Increase the number of microphones for better sound localization.
-   Add sound direction/angle estimation.
-   Improve ML accuracy using a larger and more diverse dataset.
-   Deploy ML inference closer to the sensor for faster response.
-   Add mobile notifications.
-   Add GPS/location information for distributed sensor nodes.
-   Develop a weather-resistant outdoor enclosure.
-   Support multiple acoustic sensor nodes across a larger perimeter.

## 👥 Project Type

**Mini Project --- CSS7102**

**Project Title:** Autonomous Perimeter Intrusion Detection Using
Acoustic Sensors

## 📜 License

This project is developed for academic/educational purposes.
