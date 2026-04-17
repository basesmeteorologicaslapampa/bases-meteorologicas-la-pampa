# GitHub Actions - CI/CD & Automatizaciones

Referencia de todos los workflows automatizados del proyecto.

## Workflows activos

| Workflow | Archivo | Trigger | Frecuencia |
|---|---|---|---|
| **CI** | `ci.yml` | Push/PR a main (cambios en `weather-dashboard/`) | Cada push |
| **E2E Tests** | `e2e.yml` | Push/PR a main (cambios en `weather-dashboard/`) | Cada push |
| **Release** | `release.yml` | Manual (workflow_dispatch) | Cuando quieras deployar |
| **Deploy** | `deploy.yml` | Push de tag `v*.*.*` | Automatico post-release |
| **Monitoring** | `monitoring.yml` | Cron + manual | Cada 15 min |
| **Backup** | `backup.yml` | Cron + manual | Diario 04:00 UTC |

## Diagrama de flujo

```
Push a feature branch
    │
    ├── CI (lint + type-check + build)     ~40s
    ├── E2E Tests (Playwright + Chromium)   ~2min
    │
    ▼
PR a main
    │
    ├── CI + E2E deben pasar para mergear
    ├── Vercel genera preview URL (staging)
    │
    ▼
Merge a main
    │
    ├── CI + E2E corren de nuevo
    ├── main = STAGING (preview, NO produccion)
    │
    ▼
Cuando listo para deployar:
    │
    ├── Actions → Release → "Run workflow"
    │     ├── Calcula version desde commits
    │     ├── Bumpa package.json
    │     ├── Genera CHANGELOG.md
    │     ├── Crea tag vX.Y.Z
    │     └── Push commit + tag a main
    │
    ▼
Tag push dispara Deploy workflow:
    │
    ├── CI check sobre el commit tagueado
    ├── Push a branch `release`
    ├── Vercel detecta push a `release` → build produccion
    ├── Crea GitHub Release con changelog
    │
    ▼
Produccion live
    │
    ├── Monitoring (cada 15min) → alerta si unhealthy
    └── Backup (diario 04:00 UTC) → artifact 90 dias
```

---

## CI (`ci.yml`)

**Que hace**: verifica que el codigo compila y pasa calidad.

| Job | Comando | Que verifica |
|---|---|---|
| Lint | `npm run lint` | ESLint rules, imports no usados |
| TypeScript | `npm run type-check` | Tipos correctos, sin errores tsc |
| Build | `npm run build` | Next.js compila, pages se generan |

**Trigger**: push o PR que toque `weather-dashboard/**` o el propio workflow.

**Concurrencia**: cancela runs anteriores del mismo branch.

**Secrets requeridos**: ninguno (usa placeholders para env vars en build).

---

## E2E Tests (`e2e.yml`)

**Que hace**: abre un browser real (Chromium) y verifica que la pagina funcione.

**Tests** (`weather-dashboard/e2e/`):

| Archivo | Tests | Que verifica |
|---|---|---|
| `dashboard.spec.ts` | 3 tests | Pagina carga, titulo visible, cards o estado vacio, rosa de vientos |
| `api.spec.ts` | 4 tests | `/api/health` JSON valido, `/api/readings` array o error controlado |

**Trigger**: mismo que CI (push/PR a main con cambios en dashboard).

**Secrets opcionales**:
- `DEV_SUPABASE_URL`: URL del proyecto Supabase dev (para tests con DB real)
- `DEV_SUPABASE_ANON_KEY`: Publishable key dev

Si no estan, los tests corren contra placeholders y verifican estructura (no datos).

**On failure**: sube screenshots y trace como artifact (`playwright-report`).

---

## Release (`release.yml`)

**Que hace**: prepara una release — calcula version, bumpa package.json, genera changelog, crea tag.

**Trigger**: `workflow_dispatch` (manual, boton "Run workflow" en Actions).

**Input**:

| Opcion | Que hace |
|---|---|
| `auto` (default) | Calcula desde commits: `feat` = minor, `fix` = patch, `!` = major |
| `patch` | Fuerza bump patch |
| `minor` | Fuerza bump minor |
| `major` | Fuerza bump major |

**Pasos**:
1. Lee commits desde el ultimo tag
2. Calcula la siguiente version SemVer
3. Bumpa `weather-dashboard/package.json`
4. Genera/actualiza `CHANGELOG.md` (agrupado por tipo)
5. Commit `chore(release): vX.Y.Z`
6. Crea tag anotado `vX.Y.Z`
7. Push commit + tag a `main`

**Permisos**: `contents: write` (push + tag).

**Nota**: el commit bypasea branch protection porque usa `GITHUB_TOKEN` con `enforce_admins: false`.

---

## Deploy (`deploy.yml`)

**Que hace**: deploya a produccion cuando se pushea un tag SemVer.

**Trigger**: `push.tags: v[0-9]+.[0-9]+.[0-9]+`

**Jobs**:

1. **ci-check**: corre lint + type-check + build sobre el commit tagueado (gate de seguridad)
2. **deploy**:
   - Valida que el tag matchee `package.json` version
   - `git push origin HEAD:refs/heads/release --force`
   - Vercel detecta push a `release` → build → deploy produccion
   - Crea GitHub Release con changelog auto-generado
   - Notifica via ntfy.sh (si configurado)

**Permisos**: `contents: write` (push a release + crear GitHub Release).

**Secrets opcionales**: `NTFY_TOPIC` (notificacion de deploy exitoso).

**Importante**: NO tocar el branch `release` manualmente. Solo este workflow lo actualiza.

---

## Monitoring (`monitoring.yml`)

**Que hace**: cada 15 minutos verifica que el dashboard y la DB esten funcionando. Si no, envia notificacion push.

**Chequeos**:
1. `GET /api/health` responde?
2. Status es `ok`?
3. Si no → enviar alerta via ntfy.sh

**Niveles de alerta**:

| Situacion | Prioridad | Tags |
|---|---|---|
| Dashboard caido (HTTP 000/5xx) | `urgent` | rotating_light |
| DB inaccesible | `high` | warning |
| Datos desactualizados (>15min) | `default` | hourglass |
| Sin datos | `low` | information_source |

**Secrets requeridos**:
- `NTFY_TOPIC`: nombre del topic de ntfy.sh (sin esto, logguea pero no envia push)

**Trigger manual**: GitHub > Actions > Monitoring > "Run workflow"

---

## Backup (`backup.yml`)

**Que hace**: corre `pg_dump` contra la DB de produccion y guarda el dump como GitHub Artifact.

**Horario**: diario a las 04:00 UTC (01:00 Argentina).

**Retencion**: 90 dias (configurable en el workflow, `retention-days`).

**Secrets requeridos**:
- `PROD_DATABASE_URL`: connection string de Postgres (formato pooler, puerto 6543)

**On failure**: notifica via ntfy.sh (si `NTFY_TOPIC` esta configurado).

**Trigger manual**: GitHub > Actions > Backup > "Run workflow"

**Descargar un backup**: Actions > click en el run > scroll a Artifacts > download.

---

## Scripts auxiliares

| Script | Descripcion | Workflow |
|---|---|---|
| `.github/branch-protection.sh` | Configura reglas de proteccion en main via API | Manual (una vez) |

---

## Secrets de GitHub requeridos

Configurar en: repo > Settings > Secrets and variables > Actions

| Secret | Para | Workflow | Obligatorio |
|---|---|---|---|
| `PROD_DATABASE_URL` | pg_dump de produccion | Backup | Si |
| `NTFY_TOPIC` | Push notifications | Monitoring, Backup | No (sin el, solo loggea) |
| `DEV_SUPABASE_URL` | Tests E2E con DB real | E2E Tests | No (usa placeholder) |
| `DEV_SUPABASE_ANON_KEY` | Tests E2E con DB real | E2E Tests | No (usa placeholder) |

---

## Troubleshooting

### El workflow no se ejecuta

- Repos con poca actividad: GitHub puede reducir la frecuencia de cron jobs
- Solucion: hacer un push o ejecutar manualmente para reactivar

### "Resource not accessible by personal access token"

El PAT no tiene los permisos necesarios. Verificar scopes en GitHub Settings > Personal access tokens.

### E2E tests fallan en CI pero pasan local

- Verificar que los tests no dependan de datos reales (deben tolerar DB vacia)
- Revisar el artifact `playwright-report` para ver screenshots del error
- Puede ser timing: agregar `waitFor` o aumentar timeouts

### Backup falla con "version mismatch"

Supabase actualizo PostgreSQL. Cambiar la imagen Docker en `backup.yml`:
```yaml
docker run --rm postgres:XX-alpine ...  # cambiar XX por la version correcta
```
Verificar version: Supabase Dashboard > Settings > Infrastructure.
