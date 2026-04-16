# Estacion Meteorologica - Dashboard

Dashboard web en tiempo real para una estacion meteorologica basada en ESP32, usando Supabase (backend) + Vercel (hosting). **Costo: $0**.

## Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind + Recharts
- **Backend**: Supabase (PostgreSQL + REST API + Realtime)
- **Hosting**: Vercel (Free tier)

## Metricas mostradas

- Temperatura (°C)
- Humedad relativa (%)
- Lluvia recogida (mm)
- Velocidad del viento (km/h)
- Direccion del viento (grados + cardinal)

## Setup

### 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. En **SQL Editor**, ejecutar `../supabase/schema.sql`
3. En **Settings > API**, copiar:
   - Project URL
   - `anon` public key
   - `service_role` key (para el simulador/ESP32)

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Desarrollo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 4. Simular datos (sin hardware)

En otra terminal:
```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=eyJhbGci... \
npx tsx scripts/simulate.ts
```

Envia una lectura ficticia cada 10 segundos. El dashboard debe actualizarse automaticamente via Realtime.

### 5. Deploy en Vercel

```bash
npm i -g vercel
vercel
```

Agregar las 3 variables de entorno en el dashboard de Vercel (Settings > Environment Variables).

## Como envia datos el ESP32

Dos opciones:

### Opcion A: Directo a Supabase (recomendado)
El ESP32 hace `POST` directo a `https://xxx.supabase.co/rest/v1/weather_readings`. Sin servidor intermedio. Ver `../arduino/weather_station.ino`.

### Opcion B: A traves del API de Next.js
El ESP32 hace `POST` a `https://tu-dashboard.vercel.app/api/readings`. Util si queres agregar validacion o logica custom.

## Estructura

```
src/
├── app/
│   ├── api/readings/route.ts    # API REST para recibir datos
│   ├── layout.tsx
│   ├── page.tsx                  # Pagina principal
│   └── globals.css
├── components/
│   ├── Dashboard.tsx             # Componente raiz (realtime)
│   ├── CurrentCard.tsx           # Tarjeta de metrica
│   ├── TemperatureChart.tsx      # Grafico temp + humedad
│   ├── WindRainChart.tsx         # Grafico viento + lluvia
│   └── WindCompass.tsx           # Rosa de vientos
└── lib/
    ├── supabase.ts               # Cliente Supabase
    └── wind.ts                    # Utilidades (grados -> cardinal)
scripts/
└── simulate.ts                    # Simulador de datos
```
