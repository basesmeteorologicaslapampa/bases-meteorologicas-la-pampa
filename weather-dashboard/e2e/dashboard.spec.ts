import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("carga la pagina y muestra el titulo", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Estacion Meteorologica/);
    await expect(
      page.getByRole("heading", { name: /Bases Meteorologicas La Pampa/ })
    ).toBeVisible();
    await expect(page.getByText("Datos en tiempo real")).toBeVisible();
  });

  test("muestra estado de datos (cards o mensaje vacio)", async ({ page }) => {
    await page.goto("/");

    // Esperar a que el loading termine
    await page.waitForFunction(
      () => !document.querySelector('[class*="animate-pulse"]'),
      { timeout: 10000 }
    ).catch(() => {
      // Si sigue en loading despues de 10s, es un problema
    });

    // Debe mostrar cards con datos O el mensaje "Sin datos aun"
    const hasCards = await page.locator("text=Temperatura").isVisible().catch(() => false);
    const hasEmptyState = await page.locator("text=Sin datos").isVisible().catch(() => false);

    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test("muestra la rosa de vientos si hay datos", async ({ page }) => {
    await page.goto("/");

    // Si hay datos, debe haber un SVG de la rosa de vientos
    const hasData = await page.locator("text=Temperatura").isVisible().catch(() => false);

    if (hasData) {
      await expect(page.locator("text=Direccion del Viento")).toBeVisible();
      // El SVG de la rosa de vientos
      await expect(page.locator("svg circle")).toBeVisible();
    }
  });
});
