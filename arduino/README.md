# Arduino - Firmware ESP32

Firmware para la estacion meteorologica basada en ESP32. Lee sensores cada 5 minutos y envia los datos a Supabase via HTTPS POST.

## Hardware requerido

| Componente | Modelo | Interface | Pin ESP32 | Costo aprox |
|---|---|---|---|---|
| **Microcontrolador** | ESP32 DevKitC V4 | - | - | ~$5 |
| **Temp + Humedad** | BME280 | I2C | SDA=21, SCL=22 | ~$3-5 |
| **Anemometro** | Cup type (pulsos) | Digital interrupt | GPIO 25 | ~$10-20 |
| **Pluviometro** | Tipping bucket | Digital interrupt | GPIO 26 | ~$8-15 |
| **Veleta** | Resistiva (ADC) | Analogico | GPIO 34 | ~$10-15 |
| **Cable USB** | USB-C o Micro-USB | - | - | ~$2 |

**Minimo viable**: ESP32 + BME280 = temperatura + humedad + presion (~$10).

## Diagrama de conexiones

```
ESP32 DevKitC
┌─────────────────────┐
│                     │
│  3.3V ──────────── BME280 VCC
│  GND  ──────────── BME280 GND
│  GPIO 21 (SDA) ─── BME280 SDA
│  GPIO 22 (SCL) ─── BME280 SCL
│                     │
│  GPIO 25 ────────── Anemometro (signal)
│  GND  ──────────── Anemometro (GND)
│                     │
│  GPIO 26 ────────── Pluviometro (signal)
│  GND  ──────────── Pluviometro (GND)
│                     │
│  GPIO 34 ────────── Veleta (signal, voltage divider)
│  3.3V ──────────── Veleta (VCC)
│  GND  ──────────── Veleta (GND)
│                     │
│  USB ──── PC (programacion + alimentacion)
│                     │
└─────────────────────┘
```

## Constantes de calibracion

Estas constantes dependen del modelo exacto de cada sensor. Ajustarlas segun la hoja de datos:

```cpp
const float RAIN_MM_PER_TIP = 0.2794; // mm por cada bascula del pluviometro
const float WIND_KMH_PER_HZ = 2.4;    // km/h por cada pulso/seg del anemometro
```

La veleta usa un mapeo ADC → grados:
```cpp
int readWindDirection() {
  int adc = analogRead(WIND_VANE_PIN);
  return map(adc, 0, 4095, 0, 359); // Ajustar segun modelo
}
```

## Librerias requeridas

Instalar desde Arduino IDE > **Library Manager**:

| Libreria | Autor | Para que |
|---|---|---|
| Adafruit BME280 Library | Adafruit | Sensor BME280 |
| Adafruit Unified Sensor | Adafruit | Dependencia de BME280 |
| ArduinoJson | Benoit Blanchon | Serializar JSON para Supabase |

## Configuracion antes de flashear

Editar `weather_station.ino` y cambiar estas constantes:

```cpp
// WiFi
const char* WIFI_SSID     = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD";

// Supabase PROD (no dev!)
const char* SUPABASE_URL = "https://lkpoevafziyuowzyhsws.supabase.co/rest/v1/weather_readings";
const char* SUPABASE_KEY = "sb_secret_xxx";  // service_role key de PROD

// Intervalo de envio
const unsigned long INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
```

**Importante**: usar las credenciales de **PROD** (no dev). El ESP32 es hardware real que escribe datos reales.

## Setup del Arduino IDE

### 1. Instalar soporte para ESP32

1. Arduino IDE > **File > Preferences**
2. En "Additional boards manager URLs" agregar:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
3. **Tools > Board > Boards Manager** > buscar "esp32" > Install

### 2. Seleccionar el board

- **Tools > Board**: `ESP32 Dev Module`
- **Tools > Port**: el puerto USB donde esta conectado el ESP32
- **Tools > Upload Speed**: 921600

### 3. Flashear

1. Abrir `weather_station.ino` en Arduino IDE
2. Verificar que las credenciales estan correctas
3. **Upload** (boton flecha derecha)
4. Abrir **Serial Monitor** (115200 baud) para ver el output

## Debugging via Serial Monitor

Output esperado:

```
Conectando WiFi... OK
192.168.1.100
T=22.5C H=55% R=0.0mm W=5.2km/h D=180
HTTP 201
T=23.1C H=54% R=0.3mm W=6.1km/h D=190
HTTP 201
```

| Output | Significado |
|---|---|
| `HTTP 201` | Dato enviado correctamente a Supabase |
| `HTTP 401` | API key incorrecta |
| `HTTP 404` | URL de Supabase incorrecta |
| `WiFi desconectado` | Se perdio la conexion, reintenta automaticamente |

## Seguridad (SSL/TLS)

El sketch actual usa `client.setInsecure()` que desactiva la verificacion de certificados SSL. Esto es aceptable para prototipado pero **no para produccion**. Para mayor seguridad:

1. Embedir el certificado raiz de Let's Encrypt (ISRG Root X1)
2. Usar `client.setCACert(cert)` en vez de `setInsecure()`

## Alimentacion

| Opcion | Duracion | Notas |
|---|---|---|
| USB (5V) | Ilimitada | Necesita toma de corriente |
| Bateria LiPo 3.7V + regulador | Meses (con deep sleep) | Usar `esp_deep_sleep()` entre lecturas |
| Panel solar + bateria | Indefinida | Requiere controlador de carga |

Para deep sleep (ahorro de bateria):
```cpp
esp_sleep_enable_timer_wakeup(5 * 60 * 1000000); // 5 min en microsegundos
esp_deep_sleep_start();
```

## Archivos

```
arduino/
└── weather_station.ino    # Sketch principal (todo en un archivo)
```
