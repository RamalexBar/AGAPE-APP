-- ================================================
-- ÁGAPE v4 — Migración: Monetización Completa
-- Ejecutar después de migration_appstore.sql
-- ================================================

-- ── 1. Tabla de eventos de monetización (analytics/revenue) ─────
CREATE TABLE IF NOT EXISTS monetization_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evento     VARCHAR(50) NOT NULL,   -- subscription_activated, coins_purchased, etc.
  plan_id    VARCHAR(20),
  valor_cop  INT         DEFAULT 0,
  metadata   JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mon_events_user    ON monetization_events(user_id);
CREATE INDEX idx_mon_events_evento  ON monetization_events(evento);
CREATE INDEX idx_mon_events_created ON monetization_events(created_at DESC);

-- ── 2. Historial de monedas de fe (trazabilidad) ─────────────────
CREATE TABLE IF NOT EXISTS coins_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo       VARCHAR(20) NOT NULL CHECK (tipo IN ('ganado','gastado','bonus','referido')),
  cantidad   INT         NOT NULL,
  motivo     VARCHAR(100),
  saldo_post INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coins_history_user ON coins_history(user_id);
CREATE INDEX idx_coins_history_date ON coins_history(created_at DESC);

-- ── 3. Tabla de boosts activos ───────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_boosts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activo_desde TIMESTAMPTZ DEFAULT NOW(),
  activo_hasta TIMESTAMPTZ NOT NULL,
  origen       VARCHAR(20) DEFAULT 'coins' CHECK (origen IN ('coins','vip','admin'))
);

CREATE INDEX idx_boosts_user   ON profile_boosts(user_id);
CREATE INDEX idx_boosts_activo ON profile_boosts(activo_hasta) WHERE activo_hasta > NOW();

-- ── 4. Vista de revenue mensual (para admin dashboard) ───────────
CREATE OR REPLACE VIEW v_revenue_mensual AS
SELECT
  DATE_TRUNC('month', created_at)::DATE        AS mes,
  COUNT(*)                                      AS transacciones,
  SUM(valor_cop)                                AS total_cop,
  COUNT(*) FILTER (WHERE evento='subscription_activated') AS suscripciones,
  COUNT(*) FILTER (WHERE evento='coins_purchased')        AS compras_monedas
FROM monetization_events
WHERE valor_cop > 0
GROUP BY 1 ORDER BY 1 DESC;

-- ── 5. Vista de usuarios premium activos ─────────────────────────
CREATE OR REPLACE VIEW v_premium_activos AS
SELECT
  u.id, u.nombre, u.email,
  s.plan_type,
  s.expires_at,
  s.plataforma,
  EXTRACT(DAY FROM s.expires_at - NOW())::INT AS dias_restantes
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE s.is_active = TRUE
  AND s.plan_type != 'free'
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
ORDER BY s.created_at DESC;

-- ── 6. Función RPC: increment_monedas_fe (idempotente) ───────────
CREATE OR REPLACE FUNCTION increment_monedas_fe(p_user_id UUID, p_cantidad INT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE spiritual_profiles
  SET monedas_fe = monedas_fe + p_cantidad, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- ── 7. Función RPC: decrement_monedas_fe (con validación) ────────
CREATE OR REPLACE FUNCTION decrement_monedas_fe(p_user_id UUID, p_cantidad INT)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_saldo INT;
BEGIN
  SELECT monedas_fe INTO v_saldo FROM spiritual_profiles WHERE user_id = p_user_id;
  IF v_saldo < p_cantidad THEN
    RAISE EXCEPTION 'Monedas insuficientes (saldo: %, requerido: %)', v_saldo, p_cantidad;
  END IF;
  UPDATE spiritual_profiles
  SET monedas_fe = monedas_fe - p_cantidad, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- ── 8. Agregar campo plataforma_preferida a users ────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_platform VARCHAR(10);
