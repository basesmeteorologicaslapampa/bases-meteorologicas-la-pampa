#!/usr/bin/env bash
# ============================================
# Crear un archivo de migracion nuevo
# ============================================
# Uso:
#   ./supabase/new-migration.sh "descripcion_corta_con_guiones_bajos"
#
# Ejemplo:
#   ./supabase/new-migration.sh add_uv_sensor_column
#
# Crea: supabase/migrations/YYYYMMDD_NNNNNN_add_uv_sensor_column.sql

set -e

if [ -z "$1" ]; then
  echo "Uso: $0 <descripcion_con_guiones_bajos>"
  echo "Ejemplo: $0 add_uv_sensor_column"
  exit 1
fi

DESCRIPCION="$1"
DIR="$(dirname "$0")/migrations"
FECHA=$(date +%Y%m%d)

# Buscar el proximo numero secuencial del dia (o global)
ULTIMO=$(ls "$DIR"/*.sql 2>/dev/null | \
  awk -F/ '{print $NF}' | \
  grep -oE '^[0-9]{8}_[0-9]{6}' | \
  awk -F_ '{print $2}' | \
  sort -n | \
  tail -1)

if [ -z "$ULTIMO" ]; then
  SIGUIENTE=1
else
  SIGUIENTE=$((10#$ULTIMO + 1))
fi

NUMERO=$(printf "%06d" "$SIGUIENTE")
NOMBRE="${FECHA}_${NUMERO}_${DESCRIPCION}"
ARCHIVO="$DIR/${NOMBRE}.sql"

cat > "$ARCHIVO" <<EOF
-- ============================================
-- Migration: ${NOMBRE}
-- Descripcion: (TODO: completar)
-- ============================================
-- Debe ser idempotente: usar IF NOT EXISTS, DROP IF EXISTS, ON CONFLICT, etc.

-- TU SQL ACA

-- Al final, registrar la migracion
INSERT INTO _migrations (name)
  VALUES ('${NOMBRE}')
  ON CONFLICT (name) DO NOTHING;
EOF

echo "Migracion creada: $ARCHIVO"
echo ""
echo "Proximos pasos:"
echo "  1. Editar el archivo y completar el SQL"
echo "  2. Aplicar a dev:  source supabase/.env.dev && ./supabase/migrate.sh"
echo "  3. Probar dashboard contra dev"
echo "  4. Commit + push (CI pasa -> Vercel deploy)"
echo "  5. Aplicar a prod: source supabase/.env.prod && ./supabase/migrate.sh"
