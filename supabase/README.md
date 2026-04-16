# Supabase - Backend + Migraciones

Backend de la estacion meteorologica: PostgreSQL + REST API + Realtime. Este directorio contiene las migraciones versionadas y herramientas para aplicarlas.

## Estructura

```
supabase/
├── migrations/                          # Migraciones SQL versionadas
│   └── 20260416_000001_initial_schema.sql
├── docker/
│   ├── Dockerfile.migrate               # Imagen con psql
│   ├── docker-compose.yml
│   └── apply.sh                          # Script que aplica migraciones pendientes
├── migrate.sh                            # Wrapper: ./supabase/migrate.sh
├── new-migration.sh                      # Crear migracion nueva con numeracion automatica
├── .env.example                          # Plantilla de connection strings
├── .env.dev         # (NO en git) DATABASE_URL del proyecto dev
└── .env.prod        # (NO en git) DATABASE_URL del proyecto prod
```

---

## Arquitectura: 2 proyectos Supabase

Para un workflow profesional usamos **2 proyectos separados** en el free tier (ambos gratis):

| Entorno | Uso | Donde apunta |
|---|---|---|
| **dev** | Desarrollo local, previews de PR | `.env.local` del dashboard |
| **prod** | Usuarios reales | Env vars de Vercel |

Ventaja clave: nunca rompes los datos reales probando cambios.

---

## Convencion de migraciones

**Formato**: `YYYYMMDD_NNNNNN_descripcion.sql`

| Parte | Ejemplo | Significado |
|---|---|---|
| `YYYYMMDD` | `20260416` | Fecha (orden cronologico) |
| `NNNNNN` | `000002` | Numero secuencial global (evita colisiones) |
| `descripcion` | `add_uv_sensor` | Corta, en snake_case |

**Reglas**:
- Siempre **idempotente**: `CREATE TABLE IF NOT EXISTS`, `DROP IF EXISTS`, `ON CONFLICT`, etc.
- Al final de cada migracion: `INSERT INTO _migrations (name) VALUES ('NOMBRE') ON CONFLICT DO NOTHING;`
- Nunca editar una migracion ya aplicada en prod — crear una nueva.

---

## Workflow diario

### Crear una migracion nueva

```bash
./supabase/new-migration.sh add_uv_sensor_column
```

Esto crea `supabase/migrations/YYYYMMDD_NNNNNN_add_uv_sensor_column.sql` con el template listo.

### Aplicar a dev

```bash
source supabase/.env.dev
./supabase/migrate.sh
```

El script detecta cuales ya estan aplicadas y solo corre las faltantes.

### Probar contra dev

El `.env.local` del dashboard apunta al proyecto dev → testeas el cambio.

### Merge a `main`

```bash
git add supabase/migrations/
git commit -m "feat: add uv sensor column"
git push origin main
```

CI corre → Vercel deploya el dashboard.

### Aplicar a prod

```bash
source supabase/.env.prod
./supabase/migrate.sh
```

Listo, prod actualizada.

> **Orden critico**: aplicar la migracion a prod **antes** de que Vercel deploye codigo que la requiera. Para cambios de schema compatibles (add column), el orden no importa. Para incompatibles (drop column), aplicar migracion primero y despues deploy.

---

## Setup inicial

### 1. Proyecto prod (ya existe)

Ya creado en la cuenta Supabase. Data actual se mantiene.

- URL: `https://lkpoevafziyuowzyhsws.supabase.co`
- Region: West US (Oregon)

### 2. Proyecto dev (crear ahora)

1. Ir a [supabase.com](https://supabase.com) -> estar logueado con la cuenta de bases meteorologicas
2. Click en **New project**
3. Configuracion:
   - **Name**: `bases-meteorologicas-dev`
   - **Database password**: generar uno fuerte y guardarlo (se usa en DATABASE_URL)
   - **Region**: misma que prod (Oregon) para simular mejor
4. Crear

### 3. Obtener los DATABASE_URL

Para cada proyecto (dev y prod):

1. Dashboard del proyecto -> **Settings** -> **Database**
2. En **Connection string** -> pestaña **URI**
3. Copiar la connection string
4. Reemplazar `[YOUR-PASSWORD]` por el database password real

**Formato**:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Importante: usar el **pooler** (puerto 6543), no la conexion directa (5432).

### 4. Crear los archivos .env

```bash
cp supabase/.env.example supabase/.env.dev
cp supabase/.env.example supabase/.env.prod
```

Editar cada uno con su `DATABASE_URL` correspondiente.

### 5. Aplicar la migracion inicial a dev

El proyecto prod ya tiene el schema aplicado (lo corrimos en el SQL Editor al inicio). Pero el proyecto dev esta vacio:

```bash
source supabase/.env.dev
./supabase/migrate.sh
```

Vas a ver:
```
  [apply]  20260416_000001_initial_schema
```

### 6. Registrar la migracion como aplicada en prod

Prod ya tiene el schema pero no tiene la tabla `_migrations` todavia. Hay que crearla y registrar la migracion inicial:

```bash
source supabase/.env.prod
./supabase/migrate.sh
```

Como el schema ya existe y es idempotente, los `CREATE TABLE IF NOT EXISTS` etc. no van a romper nada. Lo unico que va a hacer es crear `_migrations` y registrar la primera migracion.

### 7. Apuntar el dashboard local a dev

Editar `weather-dashboard/.env.local` con las credenciales del proyecto **dev** (no prod):

```
NEXT_PUBLIC_SUPABASE_URL=https://XXX-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dev_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_dev_xxx
```

(Las env vars de Vercel siguen apuntando a prod — eso no cambia).

---

## Cosas a tener en cuenta

### Los tres tipos de cambio de schema

| Cambio | Safe? | Como |
|---|---|---|
| Agregar columna nueva (nullable o con default) | ✅ Siempre safe | `ALTER TABLE ADD COLUMN` |
| Renombrar columna | ⚠️ Requiere cambio de codigo + deploy sincronizado | Fase 1: agregar nueva + escribir en ambas. Fase 2: migrar datos. Fase 3: eliminar vieja |
| Eliminar columna | ⚠️ Requiere remover todo uso primero | Fase 1: quitar uso en codigo. Fase 2: deploy. Fase 3: migracion que hace `DROP COLUMN` |

Para este proyecto (1 dev, sin cambios de schema frecuentes) el caso 1 es el 90% de los cambios.

### Backups

Supabase free tier hace backups automaticos diarios con **7 dias de retencion**. Para backup manual antes de migraciones riesgosas:

1. Dashboard > Database > Backups > **Create backup**

### RLS y policies

La migracion inicial configuro:
- `Lectura publica`: cualquiera puede hacer SELECT (dashboard publico)
- `Insercion con apikey`: requiere API key (ESP32 / simulador)

Para agregar mas policies en una migracion nueva:
```sql
DROP POLICY IF EXISTS "Nombre policy" ON weather_readings;
CREATE POLICY "Nombre policy" ON weather_readings FOR UPDATE ...;
```

### Realtime

Para que una tabla emita eventos por WebSocket, debe estar en la publicacion `supabase_realtime`. La migracion inicial ya agrego `weather_readings`.

Para una tabla nueva en otra migracion:
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mi_tabla_nueva'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mi_tabla_nueva;
  END IF;
END $$;
```

### Notas de seguridad

- La `anon` / `publishable` key es segura para el frontend (solo permite SELECT por RLS)
- La `service_role` key NO debe exponerse en el frontend
- El ESP32 y el simulador usan la `service_role` key para INSERT
- Los archivos `.env.dev` y `.env.prod` tienen el database password → nunca se suben a Git

---

## Troubleshooting

### "connection refused" o timeout

- Verificar el host en DATABASE_URL (debe tener `pooler` en el hostname)
- Verificar puerto 6543 (no 5432)
- Verificar que el proyecto Supabase no este pausado (free tier pausa despues de 7 dias sin actividad)

### "password authentication failed"

- El password en DATABASE_URL no coincide con el database password
- Resetearlo en: Supabase > Settings > Database > **Reset database password**
- Actualizar `.env.dev` o `.env.prod`

### La migracion falla a mitad de camino

- Las migraciones NO corren dentro de una transaccion global (limitaciones de Postgres con DDL)
- Si una falla, verificar que el estado parcial sea consistente
- Editar la migracion para agregar mas idempotencia (`IF EXISTS`, etc.) y re-correr
