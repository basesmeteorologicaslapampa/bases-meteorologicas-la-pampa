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

---

## Workflow de correccion de bugs (bugfix)

### Caso normal: bug no urgente

Flujo completo paso a paso. Ejemplo: el grafico de temperatura muestra valores en Fahrenheit en vez de Celsius.

```
PASO 1: Actualizar main local
──────────────────────────────
$ git checkout main
$ git pull origin main


PASO 2: Crear branch para el fix
──────────────────────────────
$ git checkout -b fix/temperature-scale

  Convencion de nombres para branches de fix:
    fix/descripcion-corta-del-bug
    fix/chart-tooltip-wrong-unit
    fix/wind-direction-inverted
    fix/api-health-timeout


PASO 3: Corregir el bug
──────────────────────────────
  (editar los archivos necesarios)


PASO 4: Verificar localmente que el fix funciona
──────────────────────────────
$ cd weather-dashboard
$ npm run dev
  → abrir http://localhost:3000 y verificar el fix visualmente

$ npm run lint          # sin errores
$ npm run type-check    # sin errores de tipos
$ npm run build         # compila OK

  Opcional: correr E2E tests
$ ./docker/e2e.sh


PASO 5: Commit con Conventional Commits
──────────────────────────────
$ git add src/components/TemperatureChart.tsx
$ git commit -m "fix(dashboard): correct temperature scale from F to C"

  Reglas del mensaje:
    - Prefijo: fix (para bugs)
    - Scope: (dashboard) indica que parte del sistema
    - Descripcion: imperativo, corta, en ingles
    - NO incluir "Fixed" ni "Fixes" — usar imperativo: "correct", "handle", "prevent"


PASO 6: Push del branch
──────────────────────────────
$ git push origin fix/temperature-scale


PASO 7: Crear Pull Request en GitHub
──────────────────────────────
  Opcion A: GitHub te muestra un banner amarillo
    "fix/temperature-scale had recent pushes — Compare & pull request"
    → click en ese banner

  Opcion B: Ir manualmente a
    github.com/basesmeteorologicaslapampa/bases-meteorologicas-la-pampa/pull/new/fix/temperature-scale

  En el PR:
    - Titulo: "fix(dashboard): correct temperature scale from F to C"
    - Descripcion: explicar que estaba pasando y como lo corregiste
    - Click "Create pull request"


PASO 8: CI + E2E corren automaticamente (~2 min)
──────────────────────────────
  GitHub Actions ejecuta:
    ✅ Lint         (ESLint)
    ✅ TypeScript   (tsc --noEmit)
    ✅ Build        (next build)
    ✅ E2E Tests    (Playwright en Chromium)

  Vercel genera un preview URL unico para este PR:
    https://app-git-fix-temperature-scale-basesmeteo...vercel.app

  Abrir el preview URL para verificar visualmente que el fix funciona
  en un entorno real (no solo local).


PASO 9: Merge del PR
──────────────────────────────
  En GitHub: una vez que CI este verde
    → click "Merge pull request"
    → click "Confirm merge"
    → Opcional: "Delete branch" (limpiar el branch remoto)

  Localmente:
    $ git checkout main
    $ git pull origin main
    $ git branch -d fix/temperature-scale    # limpiar branch local


PASO 10: Deploy a produccion
──────────────────────────────
  El merge a main NO deploya a produccion. Para deployar:

    GitHub → Actions → Release → "Run workflow"
      → Branch: main
      → Version bump: auto (o "patch" para forzar patch)
      → Click "Run workflow"

  El workflow automaticamente:
    1. Lee los commits desde el ultimo tag
    2. Detecta "fix:" → calcula PATCH (ej: v0.1.1 → v0.1.2)
    3. Bumpa package.json a 0.1.2
    4. Genera entrada en CHANGELOG.md
    5. Crea commit "chore(release): v0.1.2"
    6. Crea tag anotado v0.1.2
    7. Push a main → Deploy workflow se dispara
    8. vercel --prod → produccion actualizada
    9. GitHub Release creado con changelog


PASO 11: Verificar produccion
──────────────────────────────
  Abrir https://estaciones-meteorologicas-la-pampa.vercel.app
  Confirmar que el fix esta live.

  Verificar health: https://estaciones-meteorologicas-la-pampa.vercel.app/api/health
```

### Caso con cambio de base de datos

Si el bug requiere corregir el schema de la DB (ej: columna con tipo incorrecto):

```
  Insertar entre PASO 3 y PASO 4:

  3a. Crear migracion
      $ ./supabase/new-migration.sh fix_temperature_column_precision

  3b. Editar el archivo SQL generado en supabase/migrations/

  3c. Aplicar a la DB de desarrollo
      $ source supabase/.env.dev
      $ ./supabase/migrate.sh

  3d. Probar el dashboard contra dev
      $ cd weather-dashboard && npm run dev

  Incluir el archivo de migracion en el mismo commit o PR que el fix de codigo.

  Insertar entre PASO 9 y PASO 10:

  9a. Aplicar la migracion a produccion ANTES del deploy
      $ source supabase/.env.prod
      $ ./supabase/migrate.sh

  IMPORTANTE: para cambios de schema compatibles (agregar columna nullable),
  el orden no importa. Para cambios incompatibles (cambiar tipo de columna),
  SIEMPRE aplicar la migracion a prod ANTES de deployar el codigo nuevo.
```

### Caso urgente (hotfix en produccion)

Cuando hay un bug critico en produccion que no puede esperar el flujo normal:

```
OPCION A: Fix rapido como admin (bypass branch protection)
──────────────────────────────
$ git checkout main
$ git pull origin main

  (corregir el bug)

$ git add .
$ git commit -m "fix(dashboard): critical rendering crash on empty data"
$ git push origin main    # admins pueden bypassear la proteccion

  Deploy inmediato:
    GitHub → Actions → Release → "Run workflow" → patch

  Tiempo total: ~5 minutos desde que detectas el bug hasta produccion.


OPCION B: Rollback a version anterior (mas rapido, sin codigo)
──────────────────────────────
  Si el bug fue introducido por el ultimo deploy y el fix no es obvio:

  1. Vercel Dashboard → Deployments
  2. Buscar el deployment anterior al que rompio
  3. Click en los tres puntos (⋯) → "Promote to Production"
  4. Instantaneo: produccion vuelve a la version anterior

  Despues: corregir el bug con calma usando el flujo normal.


OPCION C: Rollback via CLI (sin acceso al dashboard)
──────────────────────────────
  $ cd weather-dashboard
  $ set -a && source docker/.env && set +a
  $ ./docker/vercel.sh ls                    # ver deploys disponibles
  $ ./docker/vercel.sh promote <url-del-deploy-anterior>
```

### Diagrama de decision para bugs

```
Bug detectado
    │
    ├── ¿Produccion esta caida/rota?
    │   │
    │   ├── SI → ¿El fix es obvio (< 5 min)?
    │   │        ├── SI → Hotfix en main (admin bypass) → Release → patch
    │   │        └── NO → Rollback (Vercel promote) → Fix con calma (flujo normal)
    │   │
    │   └── NO → Flujo normal (branch → PR → CI → merge → Release)
    │
    ├── ¿Toca la base de datos?
    │   ├── SI → Crear migracion → aplicar a dev → test → PR → merge → migrar prod → Release
    │   └── NO → Solo codigo → PR → merge → Release
    │
    └── Release → tipo de bump:
        ├── fix: → PATCH (v0.1.1 → v0.1.2)
        ├── feat: → MINOR (v0.1.1 → v0.2.0)
        └── feat!: o fix!: → MAJOR (v0.1.1 → v1.0.0)
```

---

## Versionado automatico: como funciona en detalle

### Que es SemVer

El proyecto usa [Semantic Versioning](https://semver.org/): `vMAJOR.MINOR.PATCH`

```
v 1 . 2 . 3
  │   │   │
  │   │   └── PATCH: bugfixes, ajustes menores (no rompe nada)
  │   └────── MINOR: funcionalidad nueva (compatible con lo anterior)
  └────────── MAJOR: cambio incompatible (rompe algo que existia)
```

| Incremento | Cuando | Ejemplo |
|---|---|---|
| **MAJOR** | Cambio incompatible (schema, API, breaking) | `v1.0.0` → `v2.0.0` |
| **MINOR** | Funcionalidad nueva compatible | `v1.0.0` → `v1.1.0` |
| **PATCH** | Bugfix, typo, ajuste menor | `v1.0.0` → `v1.0.1` |

### Como se calcula la version automaticamente

Al correr **Actions → Release → "Run workflow"** con la opcion `auto`:

1. El workflow lee el ultimo tag existente (ej: `v0.1.1`)
2. Lee TODOS los commits desde ese tag hasta HEAD
3. Busca los prefijos de Conventional Commits
4. Aplica estas reglas de prioridad:

```
¿Algún commit tiene "!" (breaking change)?
  → SI: bump MAJOR (v0.1.1 → v1.0.0)
  → NO: ¿Algún commit empieza con "feat"?
          → SI: bump MINOR (v0.1.1 → v0.2.0)
          → NO: bump PATCH (v0.1.1 → v0.1.2)
```

**La prioridad es**: MAJOR > MINOR > PATCH. Si hay un `feat` y diez `fix`, gana `feat` (MINOR). Si hay un `feat!`, gana MAJOR.

### Ejemplos concretos de calculo

**Ejemplo 1**: solo fixes → PATCH

```
Commits desde v0.1.1:
  fix(dashboard): correct temperature scale
  fix(api): handle null wind direction
  docs: update README
  chore: update dependencies

Resultado: v0.1.1 → v0.1.2 (PATCH)
Razon: solo fix/docs/chore, ningun feat ni breaking
```

**Ejemplo 2**: hay un feat → MINOR

```
Commits desde v0.1.2:
  fix(dashboard): chart tooltip shows wrong unit
  feat(dashboard): add 7-day history chart          ← este determina MINOR
  fix(api): handle timeout on slow connections
  docs: add hardware calibration guide

Resultado: v0.1.2 → v0.2.0 (MINOR)
Razon: hay al menos un "feat" → MINOR gana sobre PATCH
Nota: PATCH se resetea a 0 cuando sube MINOR
```

**Ejemplo 3**: breaking change → MAJOR

```
Commits desde v0.2.0:
  feat(dashboard): redesign main layout
  fix(compass): wind direction offset
  feat(supabase)!: rename wind_speed to wind_speed_kmh    ← "!" = MAJOR
  feat(api): add CSV export

Resultado: v0.2.0 → v1.0.0 (MAJOR)
Razon: hay un commit con "!" → MAJOR gana sobre todo
Nota: MINOR y PATCH se resetean a 0 cuando sube MAJOR
```

**Ejemplo 4**: solo docs/ci/chore → PATCH

```
Commits desde v1.0.0:
  docs: update DEPLOY.md
  ci: fix monitoring cron schedule
  chore: update Node to v22

Resultado: v1.0.0 → v1.0.1 (PATCH)
Razon: ningun feat ni breaking → default PATCH
```

### Override manual

Si el calculo automatico no te convence, podes forzar:

```
Actions → Release → "Run workflow"
  → Dropdown "Version bump":
      auto    ← calcula desde commits (recomendado)
      patch   ← fuerza v0.1.1 → v0.1.2
      minor   ← fuerza v0.1.1 → v0.2.0
      major   ← fuerza v0.1.1 → v1.0.0
```

Casos de uso para override:
- `auto` dice `patch` pero queres marcar como `minor` por importancia del cambio
- Queres hacer un `major` bump por decision de negocio (no solo por breaking change)
- Agrupaste muchos fixes y queres que sea `minor` para darle visibilidad

### Que se actualiza automaticamente en cada release

| Archivo | Que cambia | Ejemplo |
|---|---|---|
| `weather-dashboard/package.json` | Campo `"version"` | `"0.1.1"` → `"0.2.0"` |
| `CHANGELOG.md` | Nueva entrada al inicio | Seccion `## v0.2.0 (2026-04-18)` con lista de commits agrupados |
| Git tag | Tag anotado nuevo | `v0.2.0` con mensaje "Release v0.2.0" |
| GitHub Release | Pagina de release | Visible en github.com/.../releases con notas |

### Formato del CHANGELOG generado

El workflow agrupa los commits por tipo:

```markdown
## v0.2.0 (2026-04-18)

### Features
- feat(dashboard): add 7-day history chart (a1b2c3d)
- feat(api): add CSV export endpoint (e4f5g6h)

### Bug Fixes
- fix(dashboard): chart tooltip shows wrong unit (i7j8k9l)
- fix(api): handle timeout on slow connections (m0n1o2p)

### Documentation
- docs: add hardware calibration guide (q3r4s5t)
```

### Como saber que version esta en produccion

```bash
# Desde tu terminal (ultimo tag)
git describe --tags --abbrev=0

# Desde GitHub
# → Pestaña "Code" → al lado del branch selector dice "X tags"
# → O ir a: github.com/.../releases

# Desde package.json
cat weather-dashboard/package.json | grep version
```

### Flujo visual completo del versionado

```
Desarrollador escribe commits con prefijos:
    fix: ...    feat: ...    feat!: ...

          │           │            │
          ▼           ▼            ▼
     determina    determina    determina
      PATCH        MINOR        MAJOR

                    │
                    ▼
    Actions → Release → "Run workflow" → auto
                    │
          ┌─────────┼──────────┐
          │         │          │
    Lee commits   Calcula    Genera
    desde ultimo  siguiente  CHANGELOG
    tag           version    agrupado
                    │
          ┌─────────┼──────────┐
          │         │          │
    Bumpa        Crea tag    Commit
    package.json  vX.Y.Z    "chore(release):
    a X.Y.Z      anotado    vX.Y.Z"
                    │
                    ▼
          Push a main + tag
                    │
                    ▼
          Deploy workflow (automatico)
                    │
          ┌─────────┼──────────┐
          │         │          │
    vercel       GitHub      Notifica
    --prod       Release     via ntfy
    (produccion) con notas   (si config)
                    │
                    ▼
          Produccion actualizada
          CHANGELOG.md actualizado
          GitHub Release visible
```

---

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

## Migraciones de DB

Si tu cambio requiere un cambio de schema:

```bash
# Antes de codear:
./supabase/new-migration.sh add_uv_sensor_column

# Editar la migracion, aplicar a dev, probar:
source supabase/.env.dev && ./supabase/migrate.sh

# Incluir la migracion en el mismo PR que el codigo
# Despues del merge, ANTES del release, aplicar a prod:
source supabase/.env.prod && ./supabase/migrate.sh
```

Ver [supabase/README.md](supabase/README.md) para detalles sobre migraciones.

## Documentacion relacionada

- [MONITORING.md](MONITORING.md) — alertas, rollback, procedimientos operativos
- [CHANGELOG.md](CHANGELOG.md) — historial de releases
- [.github/WORKFLOWS.md](.github/WORKFLOWS.md) — referencia de CI/CD (6 workflows)
- [weather-dashboard/DEPLOY.md](weather-dashboard/DEPLOY.md) — deploy a Vercel
- [weather-dashboard/E2E_TESTING.md](weather-dashboard/E2E_TESTING.md) — tests Playwright
- [arduino/README.md](arduino/README.md) — para cambios de hardware/firmware
- [supabase/README.md](supabase/README.md) — para cambios de base de datos
