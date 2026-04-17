# Bases Meteorologicas La Pampa

Sistema de estaciones meteorologicas con ESP32 + Supabase + dashboard web.

**Version**: `v0.1.0`
**Dashboard**: https://estaciones-meteorologicas-la-pampa.vercel.app
**Health check**: https://estaciones-meteorologicas-la-pampa.vercel.app/api/health

## Arquitectura

```
ESP32 + sensores  ──HTTPS POST──►  Supabase  ──Realtime──►  Next.js en Vercel
   (cada 5 min)                    (PostgreSQL)             (dashboard publico)
                                       │
                            ┌──────────┤
                            │          │
                   GitHub Actions    Backups
                   (CI/CD + E2E     (diarios,
                    + monitoring)    90 dias)
```

## Estructura del monorepo

```
bases-meteorologicas-la-pampa/
├── arduino/                # Firmware ESP32 (C++)
├── supabase/               # Schema + migraciones SQL + Docker helpers
│   ├── migrations/         # SQL versionado (YYYYMMDD_NNNNNN_*.sql)
│   ├── docker/             # Imagen para aplicar migraciones (psql)
│   ├── migrate.sh          # Aplicar migraciones pendientes
│   ├── new-migration.sh    # Crear migracion nueva
│   └── backup.sh           # Backup manual de la DB
├── weather-dashboard/      # Dashboard web (Next.js + Supabase client)
│   ├── src/                # Codigo fuente
│   ├── e2e/                # Tests end-to-end (Playwright)
│   ├── scripts/            # Simulador de datos
│   └── docker/             # Vercel CLI + E2E runner
├── .github/
│   ├── workflows/          # CI, E2E, Monitoring, Backup
│   └── branch-protection.sh
├── CONTRIBUTING.md         # Convenciones de commits y workflow
├── MONITORING.md           # Monitoreo, alertas y backups
└── README.md               # Este archivo
```

## Metricas recolectadas

| Metrica | Unidad | Sensor |
|---|---|---|
| Temperatura | °C | BME280 |
| Humedad relativa | % | BME280 |
| Lluvia acumulada | mm | Pluviometro tipping bucket |
| Velocidad del viento | km/h | Anemometro de pulsos |
| Direccion del viento | grados (0-359) | Veleta resistiva |

## Documentacion

| Documento | Contenido |
|---|---|
| [weather-dashboard/README.md](weather-dashboard/README.md) | Setup local del dashboard |
| [weather-dashboard/DEPLOY.md](weather-dashboard/DEPLOY.md) | Deploy a Vercel (Git + Docker) |
| [weather-dashboard/E2E_TESTING.md](weather-dashboard/E2E_TESTING.md) | Tests end-to-end con Playwright |
| [supabase/README.md](supabase/README.md) | Base de datos, migraciones, dev/prod |
| [arduino/README.md](arduino/README.md) | Hardware, sensores, calibracion, setup |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Conventional Commits, SemVer, flujo de trabajo |
| [MONITORING.md](MONITORING.md) | Health check, alertas push, backups |
| [CHANGELOG.md](CHANGELOG.md) | Historial de releases |
| [.github/WORKFLOWS.md](.github/WORKFLOWS.md) | CI/CD: todos los GitHub Actions |

## CI/CD Pipeline

### En cada push/PR a `main`:

| Workflow | Que hace | Duracion |
|---|---|---|
| **CI** | Lint + TypeScript + Build | ~40s |
| **E2E Tests** | Playwright en Chromium | ~2min |

### Deploy a produccion (por tag SemVer):

```
Actions → Release → "Run workflow" → auto
  → calcula version → bumpa package.json → genera CHANGELOG
  → crea tag vX.Y.Z → push
  → deploy.yml → push a branch release → Vercel deploya produccion
  → GitHub Release creado con changelog
```

Pushes a `main` generan previews (staging), NO produccion. Solo tags deployean a produccion.

### Automatizaciones periodicas:

| Workflow | Frecuencia | Que hace |
|---|---|---|
| **Monitoring** | Cada 15 min | Health check + alerta si falla |
| **Backup** | Diario 04:00 UTC | pg_dump → GitHub Artifact (90 dias) |

Ver [.github/WORKFLOWS.md](.github/WORKFLOWS.md) para detalles.

## Variables de entorno

### Dashboard (`weather-dashboard/.env.local`)

Apuntar a **dev** para desarrollo local, **prod** esta en Vercel.

| Variable | Descripcion | Publica? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (solo lectura via RLS) | Si |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (lectura + escritura) | No |

### Migraciones (`supabase/.env.dev`, `supabase/.env.prod`)

| Variable | Descripcion |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (pooler, puerto 6543) |

### GitHub Secrets (repo > Settings > Secrets > Actions)

| Secret | Para | Obligatorio |
|---|---|---|
| `PROD_DATABASE_URL` | Backup diario | Si |
| `NTFY_TOPIC` | Push notifications (monitoring/backup) | No |
| `DEV_SUPABASE_URL` | E2E con DB real | No |
| `DEV_SUPABASE_ANON_KEY` | E2E con DB real | No |

## Entornos

| Entorno | Dashboard | Base de datos | Quien lo usa |
|---|---|---|---|
| **dev** | `npm run dev` (localhost) | Supabase dev (`xdajenijomg...`) | Desarrollo local |
| **prod** | `estaciones-meteorologicas-la-pampa.vercel.app` | Supabase prod (`lkpoevafzi...`) | Usuarios + ESP32 |

## Quick start

```bash
# 1. Clonar
git clone git@github-base-meteoro-lp:basesmeteorologicaslapampa/bases-meteorologicas-la-pampa.git
cd bases-meteorologicas-la-pampa

# 2. Instalar deps del dashboard
cd weather-dashboard && npm install

# 3. Configurar env vars (copiar de .env.local.example)
cp .env.local.example .env.local
# Editar .env.local con credenciales de Supabase DEV

# 4. Levantar dashboard
npm run dev

# 5. (Opcional) Simular datos en otra terminal
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=sb_secret_xxx \
npx tsx scripts/simulate.ts
```

## Versionado

Sigue [Semantic Versioning](https://semver.org/) + [Conventional Commits](https://www.conventionalcommits.org/).

- Rama principal: `main` (protegida, requiere PR + CI verde)
- Features/fixes en branches → PR → merge a `main` → auto-deploy
- Releases con tags: `git tag -a v0.2.0 -m "descripcion"`

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para detalles.

## Licencia

TBD.
