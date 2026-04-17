# Changelog

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
