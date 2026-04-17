# Guia de Contribucion

## Branching

Branch principal: `main` (protegido, requiere PR + CI verde).

```bash
# Crear branch para trabajar
git checkout -b tipo/descripcion-corta

# Ejemplos:
git checkout -b feat/add-uv-sensor
git checkout -b fix/chart-scale-overflow
git checkout -b docs/update-deploy-guide
```

## Conventional Commits

Todos los commits siguen el formato [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(scope): descripcion corta en imperativo
```

### Tipos

| Tipo | Cuando | Ejemplo | Bumps |
|---|---|---|---|
| `feat` | Funcionalidad nueva | `feat(dashboard): add weekly chart` | MINOR |
| `fix` | Corregir un bug | `fix(compass): wrong cardinal direction` | PATCH |
| `docs` | Solo documentacion | `docs: update DEPLOY.md` | - |
| `ci` | CI/CD, GitHub Actions | `ci: add E2E test workflow` | - |
| `chore` | Mantenimiento, deps | `chore: update recharts to 3.9` | - |
| `refactor` | Reestructurar sin cambiar comportamiento | `refactor(api): simplify readings route` | - |
| `style` | Formato, CSS, no logica | `style: fix dashboard spacing` | PATCH |
| `test` | Agregar o modificar tests | `test: add chart snapshot tests` | - |
| `perf` | Mejoras de performance | `perf: reduce bundle size` | PATCH |

### Scope (opcional)

Entre parentesis, indica que parte del sistema:

| Scope | Que abarca |
|---|---|
| `dashboard` | weather-dashboard/ (Next.js) |
| `supabase` | supabase/ (schema, migraciones) |
| `arduino` | arduino/ (firmware ESP32) |
| `api` | API routes (weather-dashboard/src/app/api/) |
| `ci` | GitHub Actions, deploy |
| sin scope | cambios transversales |

### Ejemplos completos

```bash
git commit -m "feat(dashboard): add 7-day temperature history chart"
git commit -m "fix(supabase): wrong timezone in daily_summary view"
git commit -m "feat(arduino): add UV sensor support (VEML6075)"
git commit -m "ci: require E2E tests before merge"
git commit -m "docs: add hardware wiring guide"
```

### Breaking changes

Si un cambio es incompatible (cambia schema, rompe API), agregar `!` despues del tipo:

```bash
git commit -m "feat(supabase)!: rename wind_speed to wind_speed_kmh"
```

Esto requiere bump de version MAJOR.

## Versionado (SemVer)

Formato: `vMAJOR.MINOR.PATCH` (ej: `v1.2.3`)

| Incremento | Cuando | Ejemplo |
|---|---|---|
| **MAJOR** (1.x.x) | Cambio incompatible (schema, API, breaking) | `v1.0.0` → `v2.0.0` |
| **MINOR** (x.1.x) | Funcionalidad nueva compatible | `v1.0.0` → `v1.1.0` |
| **PATCH** (x.x.1) | Bugfix, typo, ajuste menor | `v1.0.0` → `v1.0.1` |

### Como crear una release

La release se hace via GitHub Actions (automatizado):

1. Ir a **GitHub → Actions → Release → "Run workflow"**
2. Elegir bump type:
   - `auto` (default): calcula desde los commits convencionales
   - `patch` / `minor` / `major`: override manual
3. El workflow:
   - Calcula la siguiente version
   - Bumpa `package.json`
   - Genera/actualiza `CHANGELOG.md`
   - Crea commit `chore(release): vX.Y.Z`
   - Crea tag anotado `vX.Y.Z`
   - Push a main → trigger deploy a produccion

**No crear tags manualmente** — usar siempre el workflow Release.

### Que version esta en produccion?

```bash
git describe --tags --abbrev=0
```

O ver https://github.com/basesmeteorologicaslapampa/bases-meteorologicas-la-pampa/releases

## Flujo completo de un cambio

```
1.  git checkout -b feat/mi-feature        # Crear branch
2.  (hacer cambios)                         # Editar archivos
3.  git add . && git commit -m "feat: ..."  # Commit con convencion
4.  git push origin feat/mi-feature         # Push
5.  Crear PR en GitHub                      # (web o CLI)
6.  CI + E2E pasan                          # Automatico
7.  Vercel genera preview URL               # Automatico (staging)
8.  Merge PR a main                         # En GitHub
9.  main = staging (preview, NO produccion) # Verificar antes de release
10. Actions → Release → "Run workflow"      # Cuando listo para deployar
11. Tag creado → deploy a produccion        # Automatico via branch release
12. GitHub Release con changelog             # Automatico
13. git checkout main && git pull           # Actualizar local
```

**Importante**: pushes a `main` NO deployean a produccion. Solo tags lo hacen.

## Migraciones de DB

Si tu cambio requiere un cambio de schema:

```bash
# Antes de codear:
./supabase/new-migration.sh add_uv_sensor_column

# Editar la migracion, aplicar a dev, probar:
source supabase/.env.dev && ./supabase/migrate.sh

# Incluir la migracion en el mismo PR que el codigo
# Despues del merge, aplicar a prod:
source supabase/.env.prod && ./supabase/migrate.sh
```

## Branch protection

La rama `main` esta protegida. Las reglas se configuraron con `.github/branch-protection.sh` (requiere GitHub PAT con scope Administration).

Reglas activas:
- PR requerido (no push directo — admins pueden bypassear en emergencias)
- CI debe pasar: Lint, TypeScript, Build
- Branch debe estar up-to-date antes de merge
- Force push y deletions bloqueados

## Testing

Antes de crear un PR, verificar que los tests pasen:

```bash
cd weather-dashboard

# Lint
npm run lint

# Type check
npm run type-check

# Build
npm run build

# E2E (via Docker, sin instalar nada)
./docker/e2e.sh
```

Ver [weather-dashboard/E2E_TESTING.md](weather-dashboard/E2E_TESTING.md) para detalles sobre Playwright.

## Documentacion relacionada

- [MONITORING.md](MONITORING.md) — alertas y procedimientos operativos
- [.github/WORKFLOWS.md](.github/WORKFLOWS.md) — referencia de CI/CD
- [arduino/README.md](arduino/README.md) — para cambios de hardware/firmware
- [supabase/README.md](supabase/README.md) — para cambios de base de datos
