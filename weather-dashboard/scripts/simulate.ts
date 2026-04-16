/**
 * Simulador de estacion meteorologica
 * Envia datos ficticios a Supabase como si fuera el ESP32
 *
 * Uso:
 *   npx tsx scripts/simulate.ts
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL          - URL del proyecto Supabase
 *   SUPABASE_SERVICE_KEY   - Service role key (NO la anon key)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_KEY");
  console.error("Ejemplo:");
  console.error(
    "  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... npx tsx scripts/simulate.ts"
  );
  process.exit(1);
}

// Estado base que evoluciona con cada lectura
let temp = 22 + Math.random() * 5;
let humidity = 55 + Math.random() * 15;
let windDir = Math.floor(Math.random() * 360);

function randomWalk(value: number, step: number, min: number, max: number): number {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.max(min, Math.min(max, value + delta));
}

function generateReading() {
  temp = randomWalk(temp, 0.5, -5, 45);
  humidity = randomWalk(humidity, 2, 20, 100);
  windDir = (windDir + Math.floor((Math.random() - 0.5) * 30) + 360) % 360;

  return {
    temperature: Math.round(temp * 10) / 10,
    humidity: Math.round(humidity * 10) / 10,
    rain_mm: Math.random() < 0.3 ? Math.round(Math.random() * 5 * 10) / 10 : 0,
    wind_speed: Math.round(Math.random() * 30 * 10) / 10,
    wind_direction: windDir,
  };
}

async function sendReading() {
  const reading = generateReading();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/weather_readings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(reading),
  });

  const time = new Date().toLocaleTimeString("es-AR");
  if (res.ok) {
    console.log(
      `[${time}] Enviado: ${reading.temperature}°C | ${reading.humidity}% | ` +
        `${reading.rain_mm}mm | ${reading.wind_speed}km/h ${reading.wind_direction}°`
    );
  } else {
    const text = await res.text();
    console.error(`[${time}] Error ${res.status}: ${text}`);
  }
}

// Enviar una lectura cada 10 segundos (para testing rapido)
const INTERVAL_MS = 10_000;

console.log(`Simulador iniciado - enviando cada ${INTERVAL_MS / 1000}s`);
console.log(`URL: ${SUPABASE_URL}`);
console.log("Ctrl+C para detener\n");

sendReading();
setInterval(sendReading, INTERVAL_MS);
