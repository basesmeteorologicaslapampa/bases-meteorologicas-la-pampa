import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HealthStatus = {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  checks: {
    database: { status: "ok" | "error"; latency_ms?: number; error?: string };
    data_freshness: {
      status: "ok" | "stale" | "no_data";
      last_reading_at?: string;
      minutes_ago?: number;
      threshold_minutes: number;
    };
  };
};

const STALE_THRESHOLD_MINUTES = 15;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        status: "down",
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: "error", error: "Missing env vars" },
          data_freshness: {
            status: "no_data",
            threshold_minutes: STALE_THRESHOLD_MINUTES,
          },
        },
      } satisfies HealthStatus,
      { status: 503 }
    );
  }

  const supabase = createClient(url, key);
  const health: HealthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "ok" },
      data_freshness: {
        status: "ok",
        threshold_minutes: STALE_THRESHOLD_MINUTES,
      },
    },
  };

  // Check 1: Database connectivity + latency
  const dbStart = Date.now();
  const { data, error } = await supabase
    .from("weather_readings")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const dbLatency = Date.now() - dbStart;

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows, which is fine
    health.checks.database = {
      status: "error",
      latency_ms: dbLatency,
      error: error.message,
    };
    health.status = "down";
  } else {
    health.checks.database = { status: "ok", latency_ms: dbLatency };
  }

  // Check 2: Data freshness
  if (data?.created_at) {
    const lastReading = new Date(data.created_at);
    const minutesAgo = (Date.now() - lastReading.getTime()) / 1000 / 60;

    health.checks.data_freshness = {
      status: minutesAgo > STALE_THRESHOLD_MINUTES ? "stale" : "ok",
      last_reading_at: data.created_at,
      minutes_ago: Math.round(minutesAgo),
      threshold_minutes: STALE_THRESHOLD_MINUTES,
    };

    if (minutesAgo > STALE_THRESHOLD_MINUTES) {
      health.status = health.status === "down" ? "down" : "degraded";
    }
  } else {
    health.checks.data_freshness = {
      status: "no_data",
      threshold_minutes: STALE_THRESHOLD_MINUTES,
    };
    health.status = health.status === "down" ? "down" : "degraded";
  }

  const httpStatus = health.status === "down" ? 503 : health.status === "degraded" ? 200 : 200;

  return NextResponse.json(health, { status: httpStatus });
}
