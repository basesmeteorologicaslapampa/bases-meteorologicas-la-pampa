# Deploy a Vercel (via Docker)

Guia completa para deployar el dashboard a Vercel **sin instalar nada** en tu maquina. Todo corre en un container Docker.

## URLs de produccion actuales

- **https://estaciones-meteorologicas-la-pampa.vercel.app** (alias custom)
- https://app-eosin-three-45.vercel.app (canonical auto-generada)

Proyecto en Vercel: `app` (cuenta `basesmeteorologicaslapampa-8940`).

---

## Estructura Docker

```
docker/
├── Dockerfile.vercel     # Imagen Alpine + Node 20 + Vercel CLI
├── docker-compose.yml    # Monta el proyecto + persiste login
├── vercel.sh             # Wrapper: ./docker/vercel.sh <cmd>
└── .env                  # VERCEL_TOKEN (NO subir a Git)
```

El container monta `weather-dashboard/` en `/app`. Los datos de config quedan en volumenes Docker (`docker_vercel-config`, `docker_vercel-cache`). Tu `$HOME` queda intacto.

---

## Deploy del dia a dia (proyecto ya linkeado)

Si ya hiciste el setup inicial una vez, hacer un nuevo deploy es:

```bash
cd weather-dashboard

# 1. Cargar el token desde docker/.env
set -a && source docker/.env && set +a

# 2. Deploy a produccion
./docker/vercel.sh --prod --yes
```

Eso es todo. Sale una URL tipo `https://app-eosin-three-45.vercel.app` actualizada.

> Para un **preview** (no produccion), omitir `--prod`:
> ```bash
> ./docker/vercel.sh --yes
> ```

---

## Setup inicial (ya hecho, solo referencia)

### 1. Crear token en Vercel

1. Ir a [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. **Create Token** -> nombre: `weather-dashboard-deploy`, Scope: Full Account
3. Copiar el valor (solo se muestra una vez)
4. Pegarlo en `docker/.env`:
   ```
   VERCEL_TOKEN=vcp_xxxxxxxxx
   ```

### 2. Build de la imagen Docker

```bash
docker compose -f docker/docker-compose.yml build vercel
```

Tarda ~30s la primera vez. Despues esta cacheado.

### 3. Verificar login

```bash
set -a && source docker/.env && set +a
./docker/vercel.sh whoami
```

Deberia imprimir tu username de Vercel.

### 4. Primer deploy (linkea el proyecto)

```bash
./docker/vercel.sh --yes
```

Vercel auto-detecta que es Next.js, crea el proyecto y lo linkea. Despues de esto `.vercel/project.json` queda en tu repo con el ID del proyecto.

### 5. Configurar env vars

Las env vars de `.env.local` NO se usan en produccion. Hay que setearlas en Vercel:

```bash
# Cargar token
set -a && source docker/.env && set +a

# URL de Supabase
printf "https://TU_PROYECTO.supabase.co" | \
  ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_URL production

# Publishable key
printf "sb_publishable_xxx" | \
  ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Secret key (para el API route)
printf "sb_secret_xxx" | \
  ./docker/vercel.sh env add SUPABASE_SERVICE_ROLE_KEY production
```

### 6. Redeploy final a produccion

```bash
./docker/vercel.sh --prod --force --yes
```

### 7. Desactivar Vercel Deployment Protection (IMPORTANTE)

Las cuentas nuevas de Vercel vienen con **SSO Protection** activada por default. Esto hace que las URLs de deploy devuelvan 401 a visitantes externos (excepto la canonical auto-generada).

Para un dashboard publico hay que desactivarla via API (no hay comando CLI para esto en Hobby):

```bash
# Cargar token
set -a && source docker/.env && set +a

# Leer projectId y orgId desde .vercel/project.json
PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
TEAM_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)

# Desactivar SSO protection
curl -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

Verificar con:
```bash
curl -sI https://TU_URL.vercel.app | head -3
```

Debe devolver `HTTP/2 200`. Si devuelve `401`, la protection sigue activa.

**Para reactivarla** (solo previews protegidos, produccion publica):
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":{"deploymentType":"preview"}}'
```

---

## Actualizar env vars

```bash
set -a && source docker/.env && set +a

# Ver las que estan seteadas
./docker/vercel.sh env ls

# Eliminar una
./docker/vercel.sh env rm NEXT_PUBLIC_SUPABASE_URL production

# Volver a agregar con nuevo valor
printf "nuevo_valor" | ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_URL production

# Redeploy para que tome los cambios
./docker/vercel.sh --prod --force --yes
```

---

## Comandos utiles

```bash
# Siempre cargar el token primero
set -a && source docker/.env && set +a

# Listar los ultimos deploys
./docker/vercel.sh ls

# Ver logs del ultimo deploy
./docker/vercel.sh logs

# Info del proyecto linkeado
./docker/vercel.sh inspect

# Listar env vars
./docker/vercel.sh env ls

# Eliminar un deploy especifico
./docker/vercel.sh remove <deployment-url> --yes

# Ver dominios asignados
./docker/vercel.sh domains ls
```

---

## Cambiar / agregar el dominio

El dominio `app-eosin-three-45.vercel.app` es auto-generado. Para cambiarlo:

### Opcion A: Otro subdominio `.vercel.app` gratis (via CLI)

```bash
set -a && source docker/.env && set +a

# Obtener la URL del deploy de produccion actual
./docker/vercel.sh ls

# Asignar el alias (reemplazar la primera URL con la tuya)
./docker/vercel.sh alias set app-eosin-three-45.vercel.app mi-clima.vercel.app
```

> Si el alias devuelve 401: asegurate de haber desactivado SSO protection (ver paso 7 del Setup inicial).

### Opcion B: Via dashboard web

1. Ir a [vercel.com](https://vercel.com) -> tu proyecto `app` -> **Settings** -> **Domains**
2. Agregar `clima-mi-estacion.vercel.app` (si esta libre)
3. HTTPS automatico

### Opcion C: Dominio propio

1. Agregar tu dominio en **Settings -> Domains** (ej: `clima.tudominio.com`)
2. Vercel te dice que records DNS configurar (A / CNAME)
3. Configurarlos en tu proveedor de DNS
4. HTTPS automatico con Let's Encrypt (en minutos)

---

## Limites del Free tier

- **100 GB bandwidth / mes**
- **100 GB-horas** de serverless functions
- **10s timeout** en functions (suficiente para Supabase)
- **Proyectos ilimitados**
- **Deploys ilimitados**

Un dashboard de estacion meteorologica usa ~0.1% de esto.

---

## Troubleshooting

### "Network docker_default ..." cada vez que corro el wrapper

Es normal - compose recrea la red en cada `run --rm`. No afecta nada.

### Warning "Detected .env file"

Vercel detecto `.env.local` durante el build. Esto se soluciona con el archivo `.vercelignore` que ya esta en el repo. Si el warning persiste, verificar que `.vercelignore` tenga:
```
.env
.env.local
.env*.local
```

### "supabaseUrl is required" en produccion

Las env vars no estan configuradas. Correr `./docker/vercel.sh env ls`. Si faltan, agregarlas (ver seccion "Actualizar env vars") y redeploy con `--force`.

### La URL devuelve 401 "Authentication Required"

Tu proyecto tiene **Vercel Deployment Protection** activada (default en cuentas nuevas). Desactivarla:

```bash
set -a && source docker/.env && set +a
PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
TEAM_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
curl -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

### El dashboard muestra "Sin datos aun"

La DB de Supabase esta vacia. Correr el simulador:
```bash
SUPABASE_URL=https://lkpoevafziyuowzyhsws.supabase.co \
SUPABASE_SERVICE_KEY=sb_secret_xxx \
npx tsx scripts/simulate.ts
```

O conectar el ESP32 real.

### Los datos no se actualizan en tiempo real

Supabase Realtime desactivado para la tabla. Correr en el SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE weather_readings;
```

### Limpiar toda la config de Docker (borra login guardado)

```bash
docker compose -f docker/docker-compose.yml down -v
```

La proxima vez que corras el wrapper, va a builder de nuevo la imagen y pedir token/login.

### Cambiar el token

Editar `docker/.env`, cambiar el valor de `VERCEL_TOKEN`. Los comandos siguientes van a usar el nuevo automaticamente (no hace falta rebuild).

---

## Alternativa: GitHub integration (sin Docker, sin CLI)

Si algun dia no queres usar Docker:

1. `git init` + push a GitHub
2. Ir a [vercel.com/new](https://vercel.com/new)
3. Import el repo
4. Agregar las 3 env vars en el wizard
5. Deploy

Cada `git push` a `main` redeploya automaticamente.

---

## Checklist final

Para verificar que todo esta OK despues de un deploy:

- [ ] `./docker/vercel.sh ls` muestra el deploy reciente como "Ready"
- [ ] `./docker/vercel.sh env ls` muestra las 3 env vars
- [ ] Abrir la URL publica -> carga el dashboard
- [ ] Correr el simulador -> ver las lecturas llegar sin refrescar
- [ ] Verificar en Supabase **Table Editor** que las filas se insertaron
