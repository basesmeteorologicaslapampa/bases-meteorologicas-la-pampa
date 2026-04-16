"use client";

import { useEffect, useState } from "react";
import { supabase, type WeatherReading } from "@/lib/supabase";
import { degreesToCardinal } from "@/lib/wind";
import CurrentCard from "./CurrentCard";
import TemperatureChart from "./TemperatureChart";
import WindRainChart from "./WindRainChart";
import WindCompass from "./WindCompass";

export default function Dashboard() {
  const [readings, setReadings] = useState<WeatherReading[]>([]);
  const [latest, setLatest] = useState<WeatherReading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("weather_readings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(288); // ultimas 24h a 5min intervalos

      if (!error && data) {
        setReadings(data);
        setLatest(data[data.length - 1] ?? null);
      }
      setLoading(false);
    }

    fetchData();

    // Suscripcion Realtime
    const channel = supabase
      .channel("weather-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "weather_readings" },
        (payload) => {
          const newReading = payload.new as WeatherReading;
          setLatest(newReading);
          setReadings((prev) => {
            const updated = [...prev, newReading];
            // Mantener solo las ultimas 288 lecturas
            if (updated.length > 288) updated.shift();
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 animate-pulse text-lg">
          Cargando datos...
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">Sin datos aun</p>
          <p className="text-gray-500 text-sm">
            Ejecuta el simulador o conecta el ESP32 para enviar lecturas
          </p>
        </div>
      </div>
    );
  }

  const lastUpdate = new Date(latest.created_at).toLocaleString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="space-y-6">
      {/* Ultima actualizacion */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Ultima lectura: {lastUpdate}
      </div>

      {/* Cards de estado actual */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <CurrentCard
          icon="🌡"
          label="Temperatura"
          value={latest.temperature.toFixed(1)}
          unit="°C"
        />
        <CurrentCard
          icon="💧"
          label="Humedad"
          value={latest.humidity.toFixed(0)}
          unit="%"
        />
        <CurrentCard
          icon="🌧"
          label="Lluvia"
          value={latest.rain_mm.toFixed(1)}
          unit="mm"
        />
        <CurrentCard
          icon="💨"
          label="Viento"
          value={latest.wind_speed.toFixed(1)}
          unit="km/h"
        />
        <CurrentCard
          icon="🧭"
          label="Direccion"
          value={degreesToCardinal(latest.wind_direction)}
          unit={`${latest.wind_direction}°`}
        />
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TemperatureChart data={readings} />
        </div>
        <WindCompass
          degrees={latest.wind_direction}
          speed={latest.wind_speed}
        />
      </div>

      <WindRainChart data={readings} />
    </div>
  );
}
