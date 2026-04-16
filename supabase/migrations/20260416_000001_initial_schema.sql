-- ============================================
-- Migration: 20260416_000001_initial_schema
-- Descripcion: Schema inicial - tabla weather_readings + RLS + Realtime
-- ============================================
-- Idempotente: se puede correr multiples veces sin errores

-- 1. Tabla principal de lecturas
CREATE TABLE IF NOT EXISTS weather_readings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  temperature REAL NOT NULL,          -- Celsius
  humidity REAL NOT NULL,              -- % humedad relativa
  rain_mm REAL NOT NULL DEFAULT 0,     -- mm de lluvia recogidos
  wind_speed REAL NOT NULL DEFAULT 0,  -- km/h
  wind_direction INT NOT NULL DEFAULT 0 -- grados 0-359 (0=N, 90=E, 180=S, 270=O)
);

-- 2. Indice para consultas por fecha (el mas comun)
CREATE INDEX IF NOT EXISTS idx_weather_created_at
  ON weather_readings (created_at DESC);

-- 3. Row Level Security
ALTER TABLE weather_readings ENABLE ROW LEVEL SECURITY;

-- Policies: DROP IF EXISTS para idempotencia
DROP POLICY IF EXISTS "Lectura publica" ON weather_readings;
CREATE POLICY "Lectura publica"
  ON weather_readings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Insercion con apikey" ON weather_readings;
CREATE POLICY "Insercion con apikey"
  ON weather_readings
  FOR INSERT
  WITH CHECK (true);

-- 4. Vista para resumen diario
CREATE OR REPLACE VIEW daily_summary AS
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

-- 5. Habilitar Realtime para la tabla (solo si no esta ya en la publicacion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'weather_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE weather_readings;
  END IF;
END $$;

-- 6. Tabla de control de migraciones (se crea con esta primera migration)
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrar esta migracion como aplicada
INSERT INTO _migrations (name)
  VALUES ('20260416_000001_initial_schema')
  ON CONFLICT (name) DO NOTHING;
