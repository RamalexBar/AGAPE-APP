-- ================================================
-- ÁGAPE — Migración Final (Supabase compatible)
-- CORREGIDO: push_tokens ya existe en schema.sql
-- ================================================

-- ── 1. Agregar columna activo a push_tokens si no existe ─────────
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_push_tokens_activo ON push_tokens(activo) WHERE activo = TRUE;

-- ── 2. Códigos de referido ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  codigo     VARCHAR(12) NOT NULL UNIQUE,
  usos       INT         DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_codigo ON referral_codes(codigo);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user   ON referral_codes(user_id);

-- ── 3. Usos de referidos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_uses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_uses_referrer ON referral_uses(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_uses_referred ON referral_uses(referred_user_id);

-- ── 4. Agregar referral_bonus a user_swipe_counters ──────────────
ALTER TABLE user_swipe_counters
  ADD COLUMN IF NOT EXISTS referral_bonus INT DEFAULT 0;

-- ── 5. Función RPC increment_daily_swipe ─────────────────────────
CREATE OR REPLACE FUNCTION increment_daily_swipe(p_user_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_swipe_counters (user_id, swipe_date, daily_swipe_count, ad_bonus_used, referral_bonus)
  VALUES (p_user_id, CURRENT_DATE, 1, 0, 0)
  ON CONFLICT (user_id, swipe_date)
  DO UPDATE SET
    daily_swipe_count = user_swipe_counters.daily_swipe_count + 1,
    updated_at        = NOW();
END;
$$;

-- ── 6. Vista: estado de swipes de hoy ────────────────────────────
CREATE OR REPLACE VIEW v_swipe_status_hoy AS
SELECT
  u.id                                                       AS user_id,
  u.nombre,
  COALESCE(sc.daily_swipe_count, 0)                         AS swipes_usados,
  COALESCE(sc.ad_bonus_used,    0)                          AS anuncios_usados,
  COALESCE(sc.referral_bonus,   0)                          AS bonus_referido,
  20 + COALESCE(sc.ad_bonus_used,0)*6
     + COALESCE(sc.referral_bonus,0)                        AS limite_total,
  GREATEST(0,
    20 + COALESCE(sc.ad_bonus_used,0)*6
       + COALESCE(sc.referral_bonus,0)
       - COALESCE(sc.daily_swipe_count,0)
  )                                                          AS swipes_restantes,
  GREATEST(0, 2 - COALESCE(sc.ad_bonus_used,0))             AS anuncios_restantes
FROM users u
LEFT JOIN user_swipe_counters sc
  ON sc.user_id = u.id AND sc.swipe_date = CURRENT_DATE
WHERE u.is_active = TRUE;

-- ── 7. Vista: usuarios online ─────────────────────────────────────
CREATE OR REPLACE VIEW v_usuarios_online AS
SELECT id, nombre, avatar_url, last_active_at,
  EXTRACT(EPOCH FROM (NOW() - last_active_at)) AS segundos_inactivo
FROM users
WHERE is_active = TRUE
  AND last_active_at > NOW() - INTERVAL '5 minutes'
ORDER BY last_active_at DESC;

-- ── 8. Índice actividad reciente ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_active_recent
  ON users(last_active_at DESC)
  WHERE is_active = TRUE AND is_banned = FALSE;

-- ── 9. Notificaciones in-app ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo       VARCHAR(30) NOT NULL CHECK (tipo IN ('match','like','message','super_connect','referral','system')),
  titulo     VARCHAR(120),
  cuerpo     TEXT,
  datos      JSONB       DEFAULT '{}',
  leida      BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida   ON notifications(user_id, leida) WHERE leida = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
