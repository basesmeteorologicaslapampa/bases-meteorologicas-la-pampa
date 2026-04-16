# Configuracion de Supabase

## Pasos

1. Crear cuenta gratis en [supabase.com](https://supabase.com)
2. Crear un nuevo proyecto (elegir region cercana, ej: South America - Sao Paulo)
3. Ir a **SQL Editor** > **New Query**
4. Copiar y pegar el contenido de `schema.sql` y ejecutar
5. Ir a **Settings** > **API** y copiar:
   - `Project URL` → sera `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → sera `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → sera `SUPABASE_SERVICE_ROLE_KEY` (solo para el simulador/ESP32)

## Verificar Realtime

1. Ir a **Database** > **Replication**
2. Verificar que `weather_readings` esta en la publicacion `supabase_realtime`
3. Si no aparece, ejecutar:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE weather_readings;
   ```

## Notas de seguridad

- La `anon key` es segura para el frontend (solo permite SELECT por RLS)
- La `service_role key` NO debe exponerse en el frontend
- El ESP32 usa la `service_role key` para INSERT
