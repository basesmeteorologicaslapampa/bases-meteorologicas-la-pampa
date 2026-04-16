-- ============================================
-- Estacion Meteorologica - Supabase Schema
-- ============================================
-- Ejecutar este SQL en el SQL Editor de Supabase
-- (Dashboard > SQL Editor > New Query)

-- 1. Tabla principal de lecturas
CREATE TABLE weather_readings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  temperature REAL NOT NULL,        -- Celsius
  humidity REAL NOT NULL,            -- % humedad relativa
  rain_mm REAL NOT NULL DEFAULT 0,   -- ml de lluvia recogidos
  wind_speed REAL NOT NULL DEFAULT 0, -- km/h
  wind_direction INT NOT NULL DEFAULT 0 -- grados 0-359 (0=Norte, 90=Este, 180=Sur, 270=Oeste)
);

-- 2. Indice para consultas por fecha (el mas comun)
CREATE INDEX idx_weather_created_at ON weather_readings (created_at DESC);

-- 3. Row Level Security
ALTER TABLE weather_readings ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (el dashboard es publico)
CREATE POLICY "Lectura publica"
  ON weather_readings
  FOR SELECT
  USING (true);

-- Solo con apikey puede insertar (el ESP32 usa la service_role key)
CREATE POLICY "Insercion con apikey"
  ON weather_readings
  FOR INSERT
  WITH CHECK (true);

-- 4. Vista para resumen diario (util para graficos de largo plazo)
CREATE VIEW daily_summary AS
SELECT
  DATE(created_at AT TIME ZONE 'UTC') AS fecha,
  ROUND(AVG(temperature)::numeric, 1) AS temp_avg,
  ROUND(MIN(temperature)::numeric, 1) AS temp_min,
  ROUND(MAX(temperature)::numeric, 1) AS temp_max,
  ROUND(AVG(humidity)::numeric, 1) AS humidity_avg,
  ROUND(SUM(rain_mm)::numeric, 1) AS rain_total,
  ROUND(AVG(wind_speed)::numeric, 1) AS wind_avg,
  ROUND(MAX(wind_speed)::numeric, 1) AS wind_max,
  COUNT(*) AS readings_count
FROM weather_readings
GROUP BY DATE(created_at AT TIME ZONE 'UTC')
ORDER BY fecha DESC;

-- 5. Habilitar Realtime para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE weather_readings;
