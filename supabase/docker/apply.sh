#!/usr/bin/env bash
# ============================================
# Aplica migraciones pendientes a Supabase
# ============================================
# Lee /migrations/*.sql en orden alfabetico.
# Verifica cuales estan aplicadas en la tabla _migrations.
# Aplica las que faltan.
#
# Variables requeridas:
#   DATABASE_URL - connection string completo de Supabase
#
# Uso (via wrapper ./supabase/migrate.sh):
#   DATABASE_URL=postgresql://... /usr/local/bin/apply-migrations

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no esta seteado"
  exit 1
fi

echo "=== Aplicando migraciones ==="
echo "Target: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:***@/')"
echo ""

# Asegurarse que la tabla _migrations existe (por si es un proyecto nuevo)
psql "$DATABASE_URL" -q -c "
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
" > /dev/null

# Leer migraciones aplicadas
applied=$(psql "$DATABASE_URL" -t -A -c "SELECT name FROM _migrations ORDER BY name;")

applied_count=0
skipped_count=0

# Recorrer archivos en orden alfabetico
for file in /migrations/*.sql; do
  [ -e "$file" ] || { echo "No hay archivos .sql en /migrations"; exit 0; }

  name=$(basename "$file" .sql)

  if echo "$applied" | grep -qx "$name"; then
    echo "  [skip]   $name (ya aplicada)"
    skipped_count=$((skipped_count + 1))
  else
    echo "  [apply]  $name"
    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$file"; then
      # La migracion deberia haber hecho INSERT en _migrations, pero por las dudas:
      psql "$DATABASE_URL" -q -c "INSERT INTO _migrations (name) VALUES ('$name') ON CONFLICT DO NOTHING;" > /dev/null
      applied_count=$((applied_count + 1))
    else
      echo "ERROR al aplicar $name"
      exit 1
    fi
  fi
done

echo ""
echo "=== Resumen ==="
echo "Aplicadas: $applied_count"
echo "Ya estaban: $skipped_count"
