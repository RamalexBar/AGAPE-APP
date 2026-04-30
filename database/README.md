# 🗄️ Base de Datos — ÁGAPE v10

## Opción A — UN SOLO ARCHIVO (recomendado)

Ejecuta solo este archivo en Supabase SQL Editor:

```
setup_completo.sql
```

Incluye TODO: tablas, índices, funciones, vistas, triggers.
No necesitas ejecutar los otros archivos.

## Opción B — Archivos individuales (orden obligatorio)

Si prefieres ejecutarlos por separado, usa este orden exacto:

1. `schema.sql`
2. `migration_swipe_limits.sql`
3. `migration_appstore.sql`
4. `migration_monetization.sql`
5. `migration_final.sql`
6. `migration_conversion.sql`

## Cómo ejecutar en Supabase

1. Ve a https://supabase.com → tu proyecto
2. Menú izquierdo → **SQL Editor**
3. Clic en **Nueva consulta**
4. Abre el archivo con Bloc de notas → copia todo → pega → Ejecutar
