/*
 * Estacion Meteorologica ESP32
 * Envia lecturas a Supabase cada 5 minutos
 *
 * Hardware:
 *   - ESP32 DevKitC
 *   - BME280 (temperatura + humedad) en I2C (SDA=21, SCL=22)
 *   - Anemometro en GPIO 25 (pulse counting)
 *   - Pluviometro en GPIO 26 (tipping bucket, interrupt)
 *   - Veleta en GPIO 34 (ADC, resistive divider)
 *
 * Librerias requeridas (Arduino IDE > Library Manager):
 *   - Adafruit BME280 Library
 *   - Adafruit Unified Sensor
 *   - ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

// ========== CONFIGURACION ==========
const char* WIFI_SSID     = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";

const char* SUPABASE_URL = "https://TU_PROYECTO.supabase.co/rest/v1/weather_readings";
const char* SUPABASE_KEY = "TU_SERVICE_ROLE_KEY";

const unsigned long INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// Pines
const int ANEMOMETER_PIN = 25;
const int RAIN_PIN       = 26;
const int WIND_VANE_PIN  = 34;

// Constantes de calibracion
const float RAIN_MM_PER_TIP   = 0.2794; // mm por cada bascula del pluviometro
const float WIND_KMH_PER_HZ   = 2.4;    // km/h por cada pulso/seg del anemometro

// ========== VARIABLES GLOBALES ==========
Adafruit_BME280 bme;
volatile unsigned long rainTips = 0;
volatile unsigned long windPulses = 0;
unsigned long lastSendMs = 0;

// ========== INTERRUPCIONES ==========
void IRAM_ATTR onRainTip()  { rainTips++; }
void IRAM_ATTR onWindPulse() { windPulses++; }

// ========== VELETA (direccion viento) ==========
// Leer ADC y mapear resistencia a direccion en grados
int readWindDirection() {
  int adc = analogRead(WIND_VANE_PIN);
  // Tabla de calibracion segun tu veleta (ejemplo generico)
  // Mapear 0-4095 a 0-359 grados (ajustar segun modelo)
  return map(adc, 0, 4095, 0, 359);
}

// ========== ENVIO A SUPABASE ==========
bool sendReading(float temp, float hum, float rain, float wind, int dir) {
  WiFiClientSecure client;
  client.setInsecure(); // Para prototipo. En produccion, usar cert de Let's Encrypt.

  HTTPClient http;
  http.begin(client, SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.addHeader("Prefer", "return=minimal");

  StaticJsonDocument<200> doc;
  doc["temperature"]    = temp;
  doc["humidity"]       = hum;
  doc["rain_mm"]        = rain;
  doc["wind_speed"]     = wind;
  doc["wind_direction"] = dir;

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  Serial.printf("HTTP %d\n", code);
  http.end();

  return (code >= 200 && code < 300);
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);

  // BME280
  Wire.begin(21, 22);
  if (!bme.begin(0x76)) {
    Serial.println("Error: BME280 no encontrado");
    while (1) delay(10);
  }

  // Interrupciones
  pinMode(RAIN_PIN, INPUT_PULLUP);
  pinMode(ANEMOMETER_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(RAIN_PIN), onRainTip, FALLING);
  attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), onWindPulse, FALLING);

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");
  Serial.println(WiFi.localIP());
}

// ========== LOOP ==========
void loop() {
  unsigned long now = millis();

  if (now - lastSendMs >= INTERVAL_MS) {
    // Leer sensores
    float temp = bme.readTemperature();
    float hum  = bme.readHumidity();

    // Lluvia acumulada desde el ultimo envio
    noInterrupts();
    unsigned long tips = rainTips;
    rainTips = 0;
    unsigned long pulses = windPulses;
    windPulses = 0;
    interrupts();

    float rain_mm = tips * RAIN_MM_PER_TIP;

    // Velocidad viento promedio durante el intervalo
    float intervalSec = (now - lastSendMs) / 1000.0;
    float wind_hz    = pulses / intervalSec;
    float wind_kmh   = wind_hz * WIND_KMH_PER_HZ;

    int wind_dir = readWindDirection();

    Serial.printf("T=%.1fC H=%.0f%% R=%.1fmm W=%.1fkm/h D=%d\n",
                  temp, hum, rain_mm, wind_kmh, wind_dir);

    if (WiFi.status() == WL_CONNECTED) {
      sendReading(temp, hum, rain_mm, wind_kmh, wind_dir);
    } else {
      Serial.println("WiFi desconectado, reintentando...");
      WiFi.reconnect();
    }

    lastSendMs = now;
  }

  delay(100);
}
