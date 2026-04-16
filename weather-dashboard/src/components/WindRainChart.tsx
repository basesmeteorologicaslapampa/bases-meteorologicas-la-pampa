"use client";

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { WeatherReading } from "@/lib/supabase";

type Props = {
  data: WeatherReading[];
};

export default function WindRainChart({ data }: Props) {
  const chartData = data.map((r) => ({
    time: format(new Date(r.created_at), "HH:mm", { locale: es }),
    viento: r.wind_speed,
    lluvia: r.rain_mm,
  }));

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
        Viento y Lluvia
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="time" fontSize={12} tickMargin={8} />
            <YAxis yAxisId="left" fontSize={12} tickMargin={8} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} tickMargin={8} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <Bar
              yAxisId="right"
              dataKey="lluvia"
              fill="#60a5fa"
              opacity={0.6}
              radius={[4, 4, 0, 0]}
              name="Lluvia (mm)"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="viento"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Viento (km/h)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
