-- ================================================
-- ÁGAPE — Migración: Sistema de Límites de Swipes
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- ── TABLA: Contadores diarios de swipes ──────────────────────────
-- Una fila por usuario por día. Se crea automáticamente en el primer
-- swipe del día. No necesita limpieza manual (datos históricos útiles).
CREATE TABLE IF NOT EXISTS user_swipe_counters (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  swipe_date         DATE    NOT NULL,                  -- fecha YYYY-MM-DD
  daily_swipe_count  INT     NOT NULL DEFAULT 0,        -- cuántos likes dio hoy
  ad_bonus_used      INT     NOT NULL DEFAULT 0         -- cuántos anuncios vio hoy
                             CHECK (ad_bonus_used >= 0 AND ad_bonus_used <= 2),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, swipe_date)
);

CREATE INDEX idx_swipe_counters_user ON user_swipe_counters(user_id);
CREATE INDEX idx_swipe_counters_date ON user_swipe_counters(swipe_date);

-- Trigger updated_at
CREATE TRIGGER trg_swipe_counters_updated_at
  BEFORE UPDATE ON user_swipe_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── FUNCIÓN RPC: Incrementar swipe de forma atómica ──────────────
-- Crea la fila si no existe (upsert) y suma 1 en una sola operación.
-- Evita race conditions cuando hay múltiples requests simultáneos.
CREATE OR REPLACE FUNCTION increment_daily_swipe(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO user_swipe_counters (user_id, swipe_date, daily_swipe_count, ad_bonus_used)
  VALUES (p_user_id, v_today, 1, 0)
  ON CONFLICT (user_id, swipe_date)
  DO UPDATE SET
    daily_swipe_count = user_swipe_counters.daily_swipe_count + 1,
    updated_at        = NOW();
END;
$$;

-- ── VISTA: Estado de swipes de hoy (útil para admin/debug) ───────
CREATE OR REPLACE VIEW v_swipe_status_hoy AS
SELECT
  u.id                                          AS user_id,
  u.nombre,
  COALESCE(sc.daily_swipe_count, 0)             AS swipes_usados,
  COALESCE(sc.ad_bonus_used, 0)                 AS anuncios_usados,
  20 + COALESCE(sc.ad_bonus_used, 0) * 6        AS limite_total,
  GREATEST(0,
    (20 + COALESCE(sc.ad_bonus_used, 0) * 6)
    - COALESCE(sc.daily_swipe_count, 0)
  )                                             AS swipes_restantes,
  GREATEST(0, 2 - COALESCE(sc.ad_bonus_used, 0)) AS anuncios_restantes
FROM users u
LEFT JOIN user_swipe_counters sc
  ON sc.user_id = u.id
  AND sc.swipe_date = CURRENT_DATE
WHERE u.is_active = TRUE;
