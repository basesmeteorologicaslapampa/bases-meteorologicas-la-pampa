# Deploy a Vercel

Guia de deploy del dashboard a Vercel. Hay **dos caminos** para deployar:

1. **Via Git (automatico)** — push a `main` de GitHub dispara deploy en Vercel. Es el flujo recomendado.
2. **Via Docker + Vercel CLI (manual)** — util para debugging, configuracion y fallback si Git no esta disponible.

## URLs de produccion actuales

- **https://estaciones-meteorologicas-la-pampa.vercel.app** (dominio custom, auto-actualiza)
- https://app-eosin-three-45.vercel.app (canonical auto-generada por Vercel)

## Datos del proyecto

| Item | Valor |
|---|---|
| Proyecto Vercel | `app` |
| Cuenta / Team | `basesmeteorologicaslapampa-8940s-projects` |
| Team ID | `team_DrKuPaLaEKwhy2X6l6uIK394` |
| Project ID | `prj_uBw51M4vpwnIm4yotZct0JgfWrlC` |
| Repo Git | `github.com/basesmeteorologicaslapampa/bases-meteorologicas-la-pampa` |
| Root Directory | `weather-dashboard/` (monorepo) |
| Framework | Next.js |
| Branch produccion | `release` (solo se actualiza via GitHub Action al crear un tag) |
| Branch staging | `main` (genera previews, NO produccion) |

---

# PARTE 1: Deploy via tags SemVer (flujo recomendado)

## Como funciona

```
PR → merge a main → preview/staging (NO produccion)
                          │
       Actions → Release → "Run workflow"
                          │
              Calcula version, genera CHANGELOG
              Crea tag vX.Y.Z
                          │
       Actions → Deploy (trigger: tag push)
                          │
              Push a branch `release`
              Vercel deploya produccion
              GitHub Release con changelog
```

**Pushes a `main` NO deployean a produccion.** Solo tags SemVer lo hacen.

## Deploy del dia a dia

```bash
# 1. Desarrollar en feature branches
git checkout -b feat/mi-feature
# hacer cambios...
git commit -m "feat(dashboard): add weekly chart"
git push origin feat/mi-feature
# Crear PR → CI pasa → merge a main

# 2. main = staging (preview, verificar antes de release)
# URL preview: app-git-main-basesmeteorologicaslapampa-8940s-projects.vercel.app

# 3. Cuando listo para produccion:
# GitHub → Actions → Release → "Run workflow" → auto
# Automaticamente: bumpa version, genera changelog, crea tag, deploya
```

## Previews automaticos

| Evento | Tipo de deploy | URL |
|---|---|---|
| PR a `main` | Preview | `app-git-<branch>-...vercel.app` (unica por PR) |
| Push a `main` | Preview (staging) | `app-git-main-...vercel.app` |
| Tag `vX.Y.Z` → push a `release` | **Produccion** | `estaciones-meteorologicas-la-pampa.vercel.app` |

## Ver el estado de los deploys

- Dashboard de Vercel: [vercel.com/basesmeteorologicaslapampa-8940s-projects/app](https://vercel.com)
- O via CLI: `./docker/vercel.sh ls` (ver seccion "Parte 2")

---

# PARTE 2: Deploy via Docker + Vercel CLI (manual)

Util para:
- Configurar env vars y dominios
- Consultar logs, estado de deploys, rollback
- Deploy manual cuando Git no esta disponible

Todo corre en un container Docker **sin instalar el CLI en tu maquina**.

## Estructura

```
weather-dashboard/docker/
├── Dockerfile.vercel     # Imagen Alpine + Node 20 + Vercel CLI
├── docker-compose.yml    # Monta el proyecto + persiste login
├── vercel.sh             # Wrapper: ./docker/vercel.sh <cmd>
└── .env                  # VERCEL_TOKEN (NO subir a Git)
```

## Deploy manual

```bash
cd weather-dashboard
set -a && source docker/.env && set +a

# Deploy a produccion (preferir Git)
./docker/vercel.sh --prod --yes

# Deploy preview (sin tocar produccion)
./docker/vercel.sh --yes
```

## Actualizar env vars

```bash
set -a && source docker/.env && set +a

# Ver las que estan seteadas
./docker/vercel.sh env ls

# Eliminar una
./docker/vercel.sh env rm NEXT_PUBLIC_SUPABASE_URL production

# Agregar con nuevo valor
printf "nuevo_valor" | ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_URL production

# Redeploy (push a main o manual con --force)
git commit --allow-empty -m "chore: redeploy with new env vars"
git push origin main
```

## Comandos utiles

```bash
set -a && source docker/.env && set +a

# Listar deploys recientes
./docker/vercel.sh ls

# Ver logs del ultimo deploy
./docker/vercel.sh logs

# Info del proyecto linkeado
./docker/vercel.sh inspect

# Listar env vars
./docker/vercel.sh env ls

# Whoami
./docker/vercel.sh whoami
```

## Rollback a un deploy anterior

```bash
set -a && source docker/.env && set +a

# Listar deploys
./docker/vercel.sh ls

# Promover uno anterior a produccion
./docker/vercel.sh promote <deployment-url>
```

Vercel guarda todos los deploys historicos. Rollback instantaneo sin rebuild.

---

# PARTE 3: Setup inicial (solo referencia)

Esta seccion documenta los pasos que se hicieron una sola vez. No hace falta repetirlos salvo en una maquina nueva o al configurar un proyecto desde cero.

## 1. Crear token de Vercel

1. Ir a [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. **Create Token** -> nombre: `weather-dashboard-deploy`, Scope: Full Account
3. Copiar el valor (solo se muestra una vez)
4. Pegarlo en `weather-dashboard/docker/.env`:
   ```
   VERCEL_TOKEN=vcp_xxxxxxxxx
   ```

## 2. Build de la imagen Docker

```bash
cd weather-dashboard
docker compose -f docker/docker-compose.yml build vercel
```

## 3. Primer deploy (linkea el proyecto)

```bash
set -a && source docker/.env && set +a
./docker/vercel.sh --yes
```

Vercel auto-detecta Next.js, crea el proyecto y guarda `.vercel/project.json` con el ID del proyecto.

## 4. Configurar env vars

```bash
set -a && source docker/.env && set +a

printf "https://lkpoevafziyuowzyhsws.supabase.co" | \
  ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_URL production

printf "sb_publishable_xxx" | \
  ./docker/vercel.sh env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

printf "sb_secret_xxx" | \
  ./docker/vercel.sh env add SUPABASE_SERVICE_ROLE_KEY production
```

## 5. Desactivar Vercel Deployment Protection

Cuentas nuevas traen SSO protection activada (devuelve 401). Desactivarla via API:

```bash
set -a && source docker/.env && set +a
PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
TEAM_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
curl -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'
```

Para reactivarla (solo previews protegidos, produccion publica):
```bash
-d '{"ssoProtection":{"deploymentType":"preview"}}'
```

## 6. Conectar el repo de GitHub a Vercel

Requiere el Vercel GitHub App instalado en tu cuenta de GitHub:

1. En el dashboard de Vercel ir al proyecto -> **Settings -> Git**
2. Click en **Install** el GitHub App de Vercel
3. Elegir "Only select repositories" y seleccionar `bases-meteorologicas-la-pampa`
4. Autorizar

Despues linkear via CLI:
```bash
./docker/vercel.sh git connect github.com/basesmeteorologicaslapampa/bases-meteorologicas-la-pampa --yes
```

## 7. Setear el Root Directory (monorepo)

Como el proyecto es monorepo y Next.js esta en `weather-dashboard/`, hay que decirle a Vercel:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rootDirectory":"weather-dashboard"}'
```

## 8. Agregar dominio custom a nivel proyecto (auto-actualiza en deploys)

**Importante**: `vercel alias set` crea un alias a un **deploy especifico**, que NO se actualiza en los deploys futuros. Para un dominio que apunte siempre a la ultima produccion, agregarlo a nivel proyecto:

```bash
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"estaciones-meteorologicas-la-pampa.vercel.app"}'
```

Esto registra el dominio como propiedad del proyecto, y cada deploy a produccion lo actualiza automaticamente.

---

# PARTE 4: Limites, seguridad y troubleshooting

## Limites del Free tier (Hobby)

- **100 GB bandwidth / mes**
- **100 GB-horas** de serverless functions
- **10s timeout** en functions (suficiente para Supabase)
- **Proyectos ilimitados**
- **Deploys ilimitados**

Para este dashboard usamos ~0.1% del cupo.

## Cambiar o agregar dominios

### Opcion A: Otro subdominio `.vercel.app`

Via API (nivel proyecto, auto-actualiza):
```bash
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?teamId=${TEAM_ID}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"mi-nuevo-dominio.vercel.app"}'
```

### Opcion B: Dominio propio

1. En Vercel dashboard: Project -> **Settings -> Domains** -> agregar `clima.tudominio.com`
2. Vercel te muestra que records DNS configurar (A / CNAME)
3. Configurarlos en tu proveedor de DNS
4. HTTPS automatico con Let's Encrypt en minutos

## Troubleshooting

### "supabaseUrl is required" en produccion

Las env vars no estan configuradas. Correr `./docker/vercel.sh env ls`. Si faltan, agregarlas (ver Parte 2) y push a main para redeploy.

### La URL devuelve 401 "Authentication Required"

SSO Protection activada. Desactivarla con el comando de la Parte 3, paso 5.

### El dashboard muestra "Sin datos aun"

La DB de Supabase esta vacia. Correr el simulador:
```bash
cd weather-dashboard
SUPABASE_URL=https://lkpoevafziyuowzyhsws.supabase.co \
SUPABASE_SERVICE_KEY=sb_secret_xxx \
npx tsx scripts/simulate.ts
```

### Los datos no se actualizan en tiempo real

Realtime desactivado para la tabla. En Supabase SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE weather_readings;
```

### El dominio custom no se actualiza despues de un deploy

Si lo creaste con `vercel alias set` apunta a un deploy especifico. Convertirlo a dominio de proyecto (Parte 3, paso 8).

### Warning "Detected .env file" durante el build

`.env.local` esta siendo uploadeado. Verificar que `.vercelignore` contenga:
```
.env
.env.local
.env*.local
```

### Limpiar toda la config de Docker

```bash
docker compose -f docker/docker-compose.yml down -v
```

Esto borra los volumenes con el login de Vercel guardado. La proxima vez hay que poner el token de nuevo.

## Seguridad

- **`docker/.env`** (con `VERCEL_TOKEN`): NUNCA subir a Git. Esta cubierto por `.gitignore` y `.dockerignore`.
- **`service_role` key de Supabase**: solo para backend/simulador. Nunca en codigo client-side.
- **`anon` / `publishable` key de Supabase**: OK exponerla (RLS protege la DB).
- **Tokens rotados**: si un token se filtra, revocarlo en [vercel.com/account/tokens](https://vercel.com/account/tokens).

---

# Checklist despues de cada deploy

- [ ] `./docker/vercel.sh ls` muestra el deploy reciente como "Ready"
- [ ] Abrir https://estaciones-meteorologicas-la-pampa.vercel.app -> carga el dashboard
- [ ] Si agregaste env vars, confirmar con `./docker/vercel.sh env ls`
- [ ] Si hubo cambios de DB, correr la migracion SQL en Supabase antes del deploy
