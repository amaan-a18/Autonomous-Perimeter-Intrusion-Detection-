/*
  i2s_audio_capture.ino

  STEP 1 of hardware bring-up. Verifies the INMP441 MEMS microphone is wired
  correctly and streaming audio. Prints samples to Serial so you can view
  them on the Arduino IDE Serial Plotter (Tools > Serial Plotter).

  Wiring (INMP441 -> ESP32):
    VDD -> 3.3V
    GND -> GND
    SD  -> GPIO 32
    SCK -> GPIO 33
    WS  -> GPIO 25
    L/R -> GND

  Do not move on to the next sketch until you see clean waveform spikes
  here when you tap/clap near the mic.
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
  delay(500);
  Serial.println("I2S mic test starting...");
  i2sInit();
}

void loop() {
  size_t bytesRead;
  i2s_read(I2S_PORT, sBuffer, sizeof(sBuffer), &bytesRead, portMAX_DELAY);
  int samplesRead = bytesRead / sizeof(int32_t);
  for (int i = 0; i < samplesRead; i++) {
    int16_t sample = sBuffer[i] >> 14; // scale 32-bit I2S sample down to ~16-bit range
    Serial.println(sample);
  }
}
