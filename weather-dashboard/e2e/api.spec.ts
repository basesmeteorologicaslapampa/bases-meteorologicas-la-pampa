import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test("GET /api/health responde con estructura valida", async ({ request }) => {
    const response = await request.get("/api/health");

    // Puede ser 200 (ok/degraded) o 503 (down) - ambos son respuestas validas
    expect([200, 503]).toContain(response.status());

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

  test("GET /api/health incluye latencia de DB cuando conectada", async ({
    request,
  }) => {
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

    const body = await response.json();

    if (response.ok()) {
      // 200: debe ser un array
      expect(Array.isArray(body)).toBeTruthy();
    } else {
      // 503/500: debe tener campo error
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
