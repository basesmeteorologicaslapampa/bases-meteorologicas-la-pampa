import { createClient } from "@supabase/supabase-js";

// Placeholder para que el build no falle si no hay env vars
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type WeatherReading = {
  id: number;
  created_at: string;
  temperature: number;
  humidity: number;
  rain_mm: number;
  wind_speed: number;
  wind_direction: number;
};

export type DailySummary = {
  fecha: string;
  temp_avg: number;
  temp_min: number;
  temp_max: number;
  humidity_avg: number;
  rain_total: number;
  wind_avg: number;
  wind_max: number;
  readings_count: number;
};
