import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test("GET /api/health responde con status valido", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    // Estructura basica
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("checks");
    expect(body.checks).toHaveProperty("database");
    expect(body.checks).toHaveProperty("data_freshness");

    // Status valido
    expect(["ok", "degraded", "down"]).toContain(body.status);

    // Database check tiene status
    expect(["ok", "error"]).toContain(body.checks.database.status);

    // Data freshness tiene status
    expect(["ok", "stale", "no_data"]).toContain(
      body.checks.data_freshness.status
    );
  });

  test("GET /api/health incluye latencia de DB", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();

    if (body.checks.database.status === "ok") {
      expect(body.checks.database.latency_ms).toBeGreaterThan(0);
    }
  });

  test("GET /api/readings responde con array o error controlado", async ({
    request,
  }) => {
    const response = await request.get("/api/readings");

    // Puede ser 200 (datos) o 500 (si no hay env vars de service role)
    if (response.ok()) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
    } else {
      const body = await response.json();
      expect(body).toHaveProperty("error");
    }
  });

  test("GET /api/readings respeta limit parameter", async ({ request }) => {
    const response = await request.get("/api/readings?limit=5");

    if (response.ok()) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBeLessThanOrEqual(5);
    }
  });
});
