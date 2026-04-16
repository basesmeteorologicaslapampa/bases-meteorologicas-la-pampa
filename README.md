# Bases Meteorologicas La Pampa

Sistema de estaciones meteorologicas con ESP32 + Supabase + dashboard web.

## Arquitectura

```
ESP32 + sensores  ──HTTPS POST──►  Supabase  ──Realtime──►  Next.js en Vercel
   (cada 5 min)                    (PostgreSQL)             (dashboard publico)
```

## Estructura del monorepo

```
bases-meteorologicas-la-pampa/
├── arduino/            # Firmware ESP32 (C++)
├── supabase/           # Schema + migraciones SQL
├── weather-dashboard/  # Dashboard web (Next.js + Supabase client)
└── README.md           # Este archivo
```

## Componentes

### `weather-dashboard/`
Dashboard publico con Next.js 16 + Tailwind + Recharts. Conecta a Supabase via Realtime para actualizaciones en vivo. Deploy en Vercel.

Ver [weather-dashboard/README.md](weather-dashboard/README.md) para setup local.
Ver [weather-dashboard/DEPLOY.md](weather-dashboard/DEPLOY.md) para deploy a produccion.

### `supabase/`
Schema inicial de PostgreSQL y migraciones futuras.

Ver [supabase/README.md](supabase/README.md) para setup.

### `arduino/`
Firmware del ESP32 que lee sensores y envia datos a Supabase.

## Metricas recolectadas

| Metrica | Unidad | Sensor |
|---|---|---|
| Temperatura | °C | BME280 |
| Humedad relativa | % | BME280 |
| Lluvia acumulada | mm | Pluviometro tipping bucket |
| Velocidad del viento | km/h | Anemometro de pulsos |
| Direccion del viento | grados (0-359) | Veleta resistiva |

## URLs

- **Dashboard publico**: https://estaciones-meteorologicas-la-pampa.vercel.app
- **Repo**: este

## Versionado

Sigue [Semantic Versioning](https://semver.org/) con tags de git:
- `MAYOR.MENOR.PARCHE` (ej: `v1.2.3`)
- Rama principal: `main` (siempre deployable)
- Features/fixes en branches → PR → merge a `main` → auto-deploy

Ver docs de deploy en `weather-dashboard/DEPLOY.md`.

## Licencia

TBD.
