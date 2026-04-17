# Monitoring y Alertas

Sistema de monitoreo gratuito para la estacion meteorologica. Verifica que el dashboard este up y que los datos esten llegando.

## Arquitectura

```
GitHub Actions (cada 15 min)
        │
        ▼
GET /api/health  ──► Supabase (DB check + data freshness)
        │
        ▼
  Status: ok / degraded / down
        │
   (si != ok)
        ▼
  ntfy.sh ──► Push al celular
```

## Componentes

### 1. Health Check API (`/api/health`)

Endpoint publico que verifica:

| Check | Que verifica | Status |
|---|---|---|
| `database` | Conectividad a Supabase + latencia | `ok` / `error` |
| `data_freshness` | Ultima lectura < 15 min | `ok` / `stale` / `no_data` |

Respuestas:

| Status general | HTTP | Significado |
|---|---|---|
| `ok` | 200 | Todo funciona, datos frescos |
| `degraded` | 200 | Dashboard funciona pero datos viejos o ausentes |
| `down` | 503 | Base de datos inaccesible |

**Probar manualmente**:
```bash
curl -s https://estaciones-meteorologicas-la-pampa.vercel.app/api/health | python3 -m json.tool
```

Respuesta ejemplo:
```json
{
  "status": "ok",
  "timestamp": "2026-04-17T12:00:00Z",
  "checks": {
    "database": { "status": "ok", "latency_ms": 45 },
    "data_freshness": {
      "status": "ok",
      "last_reading_at": "2026-04-17T11:55:00Z",
      "minutes_ago": 5,
      "threshold_minutes": 15
    }
  }
}
```

### 2. GitHub Actions Cron (`.github/workflows/monitoring.yml`)

Corre cada 15 minutos. Si el health check no es `ok`, envia una notificacion push.

**Ejecucion manual** (para testing):
- GitHub > repo > Actions > Monitoring > "Run workflow"

### 3. ntfy.sh (notificaciones push)

[ntfy.sh](https://ntfy.sh) es un servicio de push notifications **gratis y sin cuenta**.

Ventajas:
- No requiere registro
- Apps para Android e iOS
- Tambien funciona por email, webhooks, Telegram
- Self-hosteable si queres

---

## Setup de notificaciones (5 minutos)

### Paso 1: Instalar la app ntfy

- **Android**: [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- **iOS**: [App Store](https://apps.apple.com/app/ntfy/id1625396347)
- **Web**: abrir directamente https://ntfy.sh

### Paso 2: Elegir un topic unico

El topic es como un "canal" de notificaciones. Debe ser unico y no adivinable.

Ejemplo: `bases-meteo-lp-XXXXX` (reemplazar XXXXX con algo random).

**Importante**: cualquiera que sepa el nombre del topic puede suscribirse y ver los mensajes. Usa algo no obvio.

### Paso 3: Suscribirte al topic en la app

1. Abrir ntfy app
2. Tocar "+" o "Subscribe to topic"
3. Escribir tu topic (ej: `bases-meteo-lp-XXXXX`)
4. OK

### Paso 4: Configurar el topic como GitHub Secret

1. Ir al repo en GitHub > **Settings** > **Secrets and variables** > **Actions**
2. **New repository secret**
3. Name: `NTFY_TOPIC`
4. Value: tu topic (ej: `bases-meteo-lp-XXXXX`)
5. Add secret

### Paso 5: Probar

Enviar una notificacion manual:
```bash
curl -H "Title: Test" -d "Hola desde la estacion!" ntfy.sh/TU_TOPIC
```

Deberia llegar al celular en ~1 segundo.

Correr el workflow manualmente:
- GitHub > repo > Actions > Monitoring > "Run workflow"

---

## Niveles de alerta

| Situacion | Prioridad ntfy | Que hacer |
|---|---|---|
| Dashboard caido (HTTP 000/5xx) | `urgent` (alarma) | Verificar Vercel |
| Base de datos inaccesible | `high` | Verificar Supabase (puede estar pausado) |
| Datos desactualizados (>15 min) | `default` | Verificar ESP32 (WiFi, corriente, sensor) |
| Sin datos (tabla vacia) | `low` | Normal si aun no hay hardware conectado |

## Personalizar

### Cambiar el threshold de frescura

Editar `weather-dashboard/src/app/api/health/route.ts`:
```typescript
const STALE_THRESHOLD_MINUTES = 15;  // cambiar a lo que necesites
```

### Cambiar la frecuencia del cron

Editar `.github/workflows/monitoring.yml`:
```yaml
schedule:
  - cron: "*/15 * * * *"   # cada 15 min (minimo recomendado)
  # - cron: "*/30 * * * *" # cada 30 min
  # - cron: "0 * * * *"    # cada hora
```

Nota: GitHub Actions no garantiza exactitud — puede haber delays de 1-5 min.

### Agregar notificaciones por email

ntfy.sh soporta email nativo:
```bash
curl -H "Email: tu@email.com" -d "Alerta!" ntfy.sh/TU_TOPIC
```

Para habilitarlo en el workflow, agregar el header en el curl del paso "Alert if unhealthy".

### Agregar Telegram

ntfy.sh puede forwardear a Telegram. Ver: https://docs.ntfy.sh/publish/#telegram

---

## Complemento: UptimeRobot (opcional)

Para monitoreo externo adicional (no depende de GitHub Actions):

1. Crear cuenta gratis en [uptimerobot.com](https://uptimerobot.com)
2. **New Monitor** >
   - Type: HTTP(s)
   - URL: `https://estaciones-meteorologicas-la-pampa.vercel.app/api/health`
   - Interval: 5 min
   - Alert contacts: tu email
3. Te avisa por email si el endpoint devuelve != 200

Free tier: 50 monitors, 5-min intervals.

---

## Troubleshooting

### "No se reciben notificaciones"

1. Verificar que `NTFY_TOPIC` este como secret en GitHub (Settings > Secrets > Actions)
2. Verificar que estes suscrito al mismo topic en la app ntfy
3. Probar manualmente: `curl -d "test" ntfy.sh/TU_TOPIC`

### El workflow no se ejecuta cada 15 min

- GitHub Actions cron tiene delays de hasta 5 min (normal)
- En repos con poca actividad, GitHub puede reducir la frecuencia
- Hacer un push o ejecutar manualmente para reactivar

### "Datos desactualizados" pero el ESP32 esta funcionando

- Verificar WiFi del ESP32 (Serial Monitor)
- Verificar que las credenciales de Supabase en el ESP32 sean las de PROD (no dev)
- Verificar que la tabla `weather_readings` no este llena (500MB free tier)
