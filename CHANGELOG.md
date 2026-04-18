# Changelog

## v0.1.1 (2026-04-18)

### Features

- feat(ci): tag-based deploy to production via SemVer (6fa5f41)
- feat: automated daily backups with pg_dump + GitHub Artifacts (4808424)
- feat: add monitoring system with health check and push alerts (7ee5104)

### Bug Fixes

- fix(ci): use --cwd flag for Vercel CLI to avoid doubled path (45e17b3)
- fix(ci): use GH_PAT to bypass branch protection in release workflow (0404f1a)
- fix(ci): use Vercel CLI for tag-based deploy (Hobby plan compatible) (ead554d)
- fix: make E2E tests resilient to missing Supabase credentials (297d87b)

### Documentation

- docs: complete project documentation (78% → 100% coverage) (e71e51a)

### Maintenance

- chore(release): v0.2.0 (b9342db)

### Tests

- test: add Playwright E2E tests with Docker + GitHub Actions (f6c2c8d)

## v0.2.0 (2026-04-18)

### Features

- feat(ci): tag-based deploy to production via SemVer (6fa5f41)
- feat: automated daily backups with pg_dump + GitHub Artifacts (4808424)
- feat: add monitoring system with health check and push alerts (7ee5104)

### Bug Fixes

- fix(ci): use GH_PAT to bypass branch protection in release workflow (0404f1a)
- fix(ci): use Vercel CLI for tag-based deploy (Hobby plan compatible) (ead554d)
- fix: make E2E tests resilient to missing Supabase credentials (297d87b)

### Documentation

- docs: complete project documentation (78% → 100% coverage) (e71e51a)

### Tests

- test: add Playwright E2E tests with Docker + GitHub Actions (f6c2c8d)

## v0.1.0 (2026-04-16)

Release inicial del proyecto.

### Features

- Dashboard web con datos en tiempo real (Next.js + Recharts + Supabase Realtime)
- 5 metricas: temperatura, humedad, lluvia, viento (velocidad + direccion)
- Rosa de vientos interactiva (SVG)
- Health check API (/api/health)
- API de lecturas (/api/readings)
- Simulador de datos para testing sin hardware

### CI/CD

- GitHub Actions: Lint + TypeScript + Build
- E2E Tests con Playwright
- Deploy automatico via Vercel
- Monitoring cada 15 min con alertas push (ntfy.sh)
- Backups diarios automatizados (90 dias retencion)

### Infrastructure

- Monorepo: dashboard + supabase + arduino
- Supabase dev/prod separados
- Migraciones SQL versionadas con helper Docker
- Branch protection en main
- Conventional Commits + SemVer
