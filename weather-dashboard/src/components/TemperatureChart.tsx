"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { WeatherReading } from "@/lib/supabase";

type Props = {
  data: WeatherReading[];
};

export default function TemperatureChart({ data }: Props) {
  const chartData = data.map((r) => ({
    time: format(new Date(r.created_at), "HH:mm", { locale: es }),
    temperatura: r.temperature,
    humedad: r.humidity,
  }));

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
        Temperatura y Humedad
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="time" fontSize={12} tickMargin={8} />
            <YAxis fontSize={12} tickMargin={8} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="temperatura"
              stroke="#f97316"
              fill="url(#tempGrad)"
              strokeWidth={2}
              name="Temp (°C)"
            />
            <Area
              type="monotone"
              dataKey="humedad"
              stroke="#3b82f6"
              fill="url(#humGrad)"
              strokeWidth={2}
              name="Humedad (%)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
