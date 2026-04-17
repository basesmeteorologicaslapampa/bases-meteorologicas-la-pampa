# E2E Tests con Playwright

Tests end-to-end que abren un browser real (Chromium) y verifican que el dashboard y las APIs funcionen correctamente.

## Estructura

```
weather-dashboard/
├── e2e/
│   ├── dashboard.spec.ts    # Tests de UI (pagina, cards, charts)
│   └── api.spec.ts          # Tests de endpoints (/api/health, /api/readings)
├── playwright.config.ts     # Configuracion de Playwright
├── docker/
│   ├── Dockerfile.e2e       # Imagen con Playwright + Chromium
│   ├── docker-compose.e2e.yml
│   └── e2e.sh               # Wrapper Docker
└── test-results/            # (gitignored) screenshots de fallos
```

## Tests incluidos

### `dashboard.spec.ts`

| Test | Que verifica |
|---|---|
| Carga la pagina y muestra el titulo | `<h1>` con "Bases Meteorologicas La Pampa" |
| Muestra estado de datos | Cards con metricas O mensaje "Sin datos aun" |
| Muestra rosa de vientos | SVG compass visible si hay datos |

### `api.spec.ts`

| Test | Que verifica |
|---|---|
| `/api/health` estructura valida | JSON con status, timestamp, checks.database, checks.data_freshness |
| `/api/health` latencia de DB | `latency_ms > 0` cuando DB conectada |
| `/api/readings` respuesta | Array de datos (200) o error controlado (503) |
| `/api/readings?limit=5` | Respeta el parametro limit |

## Como correr los tests

### Via Docker (recomendado, no instala nada)

```bash
cd weather-dashboard

# Todos los tests
./docker/e2e.sh

# Solo un archivo
./docker/e2e.sh e2e/api.spec.ts

# Solo un test especifico
./docker/e2e.sh --grep "carga la pagina"
```

Requiere: Docker corriendo + `.env.local` configurado.

### Via npm (requiere Playwright instalado)

```bash
cd weather-dashboard

# Instalar browsers (una vez)
npx playwright install chromium

# Correr tests (levanta dev server automaticamente)
npm run test:e2e

# Un archivo
npx playwright test e2e/api.spec.ts

# Con UI interactiva
npx playwright test --ui
```

## En CI (GitHub Actions)

El workflow `.github/workflows/e2e.yml` corre automaticamente en cada push/PR.

- Instala Chromium en el runner de GitHub
- Levanta Next.js dev server
- Corre todos los tests
- Si falla: sube `playwright-report/` como artifact (screenshots + traces)

## Como agregar un test nuevo

1. Crear o editar un archivo `e2e/*.spec.ts`
2. Usar la API de Playwright:

```typescript
import { test, expect } from "@playwright/test";

test("mi nuevo test", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("algo esperado")).toBeVisible();
});
```

3. Probar localmente: `./docker/e2e.sh e2e/mi_archivo.spec.ts`
4. Commit + push → CI lo corre automaticamente

## Principios de diseño

- **Sin dependencia de datos reales**: los tests pasan tanto con DB vacia como con datos
- **Toleran placeholder env vars**: en CI no hay Supabase real, los tests verifican estructura (no contenido)
- **Screenshots automaticos**: si un test falla, se guarda captura de pantalla en `test-results/`
- **Retry**: cada test tiene 1 reintento automatico antes de marcar como fallido

## Troubleshooting

### Tests pasan local pero fallan en CI

- Los tests no deben depender de datos reales (DB puede estar vacia en CI)
- Revisar screenshots en el artifact `playwright-report`
- Puede ser timing: agregar `page.waitForSelector()` o `page.waitForTimeout()`

### "browser was not found"

```bash
npx playwright install chromium
```

O usar Docker: `./docker/e2e.sh` (browsers pre-instalados en la imagen).

### Timeout esperando el dev server

Playwright espera 30s a que Next.js inicie. Si tu maquina es lenta:

Editar `playwright.config.ts`:
```typescript
webServer: {
  timeout: 60000, // 60s en vez de 30s
}
```
