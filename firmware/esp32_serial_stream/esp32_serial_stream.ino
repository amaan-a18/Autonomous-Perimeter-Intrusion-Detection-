/*
  esp32_serial_stream.ino

  STEP 2 (fastest hardware-integration path). Streams raw int16 audio
  samples over Serial, one per line, so backend/live_classifier.py can
  read them, run them through your already-trained model, and publish
  MQTT alerts -- without needing to port the model onto the ESP32 itself.

  This is the recommended path if you already validated everything in
  software (Phases 1-4) and just want the real microphone driving the
  same pipeline.

  Usage:
    1. Flash this sketch.
    2. On your PC: python backend/live_classifier.py --serial_port <port>
       (see README for finding your serial port)

  Wiring: same as i2s_audio_capture.ino
*/

#include <driver/i2s.h>

#define I2S_WS   25
#define I2S_SD   32
#define I2S_SCK  33
#define I2S_PORT I2S_NUM_0
#define SAMPLE_RATE 16000
#define BUFFER_LEN 512

int32_t sBuffer[BUFFER_LEN];

void i2sInit() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = 0,
    .dma_buf_count = 4,
    .dma_buf_len = BUFFER_LEN,
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

void setup() {
  Serial.begin(115200);
  i2sInit();
}

void loop() {
  size_t bytesRead;
  i2s_read(I2S_PORT, sBuffer, sizeof(sBuffer), &bytesRead, portMAX_DELAY);
  int samplesRead = bytesRead / sizeof(int32_t);
  for (int i = 0; i < samplesRead; i++) {
    int16_t sample = sBuffer[i] >> 14;
    Serial.println(sample);
  }
}
