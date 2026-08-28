/*
  esp32_mqtt_publisher.ino

  STEP 3 (optional, full "edge ML" path). Runs classification ON the ESP32
  itself using an Edge Impulse-exported model, then publishes the result
  directly over MQTT/WiFi -- no PC/backend required at runtime.

  SETUP REQUIRED BEFORE THIS COMPILES:
  1. Train a model on https://edgeimpulse.com using your dataset (see
     ml/README or main project README for the MFCC + classifier steps).
  2. Export it: Deployment -> Arduino library -> download .zip
  3. Arduino IDE: Sketch -> Include Library -> Add .ZIP Library... (select the export)
  4. Replace the placeholder include below with your actual project's
     generated header, e.g. "Perimeter_Watch_inferencing.h"
  5. Install library: PubSubClient (Library Manager)
  6. Fill in WIFI_SSID / WIFI_PASSWORD / MQTT_BROKER below.

  Wiring: same as i2s_audio_capture.ino
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <driver/i2s.h>

// --- REPLACE with your Edge Impulse export's header filename ---
#include <YOUR_PROJECT_inferencing.h>

// ---- Wi-Fi / MQTT config ----
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER   = "YOUR_BROKER_IP_OR_HOST";
const int   MQTT_PORT     = 1883;
const char* NODE_ID       = "node1";
char MQTT_TOPIC[64];

// ---- I2S config ----
#define I2S_WS   25
#define I2S_SD   32
#define I2S_SCK  33
#define I2S_PORT I2S_NUM_0

WiFiClient espClient;
PubSubClient client(espClient);

static int16_t sampleBuffer[EI_CLASSIFIER_RAW_SAMPLE_COUNT];

void i2sInit() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = EI_CLASSIFIER_FREQUENCY,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = 0,
    .dma_buf_count = 4,
    .dma_buf_len = 512,
    .use_apll = false
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };
  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
}

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected.");
}

void connectMqtt() {
  client.setServer(MQTT_BROKER, MQTT_PORT);
  while (!client.connected()) {
    Serial.println("Connecting to MQTT broker...");
    if (client.connect(NODE_ID)) {
      Serial.println("MQTT connected.");
    } else {
      delay(1000);
    }
  }
}

void publishAlert(const char* label, float confidence) {
  char payload[128];
  snprintf(payload, sizeof(payload),
           "{\"event\":\"%s\",\"confidence\":%.2f}", label, confidence);
  client.publish(MQTT_TOPIC, payload);
  Serial.print("Published: ");
  Serial.println(payload);
}

int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr) {
  for (size_t i = 0; i < length; i++) {
    out_ptr[i] = (float)sampleBuffer[offset + i];
  }
  return 0;
}

void captureWindow() {
  size_t bytesRead;
  int32_t rawBuffer[512];
  size_t collected = 0;
  while (collected < EI_CLASSIFIER_RAW_SAMPLE_COUNT) {
    i2s_read(I2S_PORT, rawBuffer, sizeof(rawBuffer), &bytesRead, portMAX_DELAY);
    int samplesRead = bytesRead / sizeof(int32_t);
    for (int i = 0; i < samplesRead && collected < EI_CLASSIFIER_RAW_SAMPLE_COUNT; i++) {
      sampleBuffer[collected++] = rawBuffer[i] >> 14;
    }
  }
}

void setup() {
  Serial.begin(115200);
  snprintf(MQTT_TOPIC, sizeof(MQTT_TOPIC), "perimeter/%s/alert", NODE_ID);
  i2sInit();
  connectWifi();
  connectMqtt();
}

void loop() {
  if (!client.connected()) connectMqtt();
  client.loop();

  captureWindow();

  signal_t signal;
  signal.total_length = EI_CLASSIFIER_RAW_SAMPLE_COUNT;
  signal.get_data = &microphone_audio_signal_get_data;

  ei_impulse_result_t result;
  EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);
  if (res != EI_IMPULSE_OK) {
    Serial.println("Classifier error");
    return;
  }

  // Find the highest-confidence label
  float bestConfidence = 0;
  const char* bestLabel = "unknown";
  for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
    if (result.classification[ix].value > bestConfidence) {
      bestConfidence = result.classification[ix].value;
      bestLabel = result.classification[ix].label;
    }
  }

  publishAlert(bestLabel, bestConfidence);
}
